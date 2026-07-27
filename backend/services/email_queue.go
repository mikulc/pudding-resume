package services

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"pudding-resume-backend/mailer"
)

type EmailQueueOptions struct {
	Prefix      string
	Secret      string
	Workers     int
	MaxAttempts int
	Lease       time.Duration
	Poll        time.Duration
}

type queuedRegistrationEmail struct {
	Job     RegistrationEmailJob `json:"job"`
	Attempt int                  `json:"attempt"`
}

type RedisEmailQueue struct {
	redis  *redis.Client
	mailer mailer.Mailer
	opts   EmailQueueOptions
	wg     sync.WaitGroup
}

var claimEmailTaskScript = redis.NewScript(`
local ids = redis.call("ZRANGEBYSCORE", KEYS[1], "-inf", ARGV[1], "LIMIT", 0, 1)
if #ids == 0 then return {} end
local id = ids[1]
if redis.call("ZREM", KEYS[1], id) == 0 then return {} end
local payload = redis.call("GET", ARGV[3] .. id)
if not payload then return {} end
redis.call("ZADD", KEYS[2], ARGV[2], id)
return {id, payload}
`)

var requeueExpiredEmailTasksScript = redis.NewScript(`
local ids = redis.call("ZRANGEBYSCORE", KEYS[1], "-inf", ARGV[1], "LIMIT", 0, ARGV[2])
for _, id in ipairs(ids) do
  redis.call("ZREM", KEYS[1], id)
  redis.call("ZADD", KEYS[2], ARGV[1], id)
end
return #ids
`)

var refundRegistrationSendScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
redis.call("DEL", KEYS[1], KEYS[2], KEYS[3])
for i = 4, 5 do
  local count = tonumber(redis.call("GET", KEYS[i]) or "0")
  if count > 0 then redis.call("DECR", KEYS[i]) end
end
return 1
`)

func NewRedisEmailQueue(client *redis.Client, sender mailer.Mailer, opts EmailQueueOptions) *RedisEmailQueue {
	return &RedisEmailQueue{redis: client, mailer: sender, opts: opts}
}

func (q *RedisEmailQueue) EnqueueRegistrationEmail(ctx context.Context, job RegistrationEmailJob) error {
	id := uuid.NewString()
	payload, err := q.seal(queuedRegistrationEmail{Job: job})
	if err != nil {
		return err
	}
	pipe := q.redis.TxPipeline()
	pipe.Set(ctx, q.taskKey(id), payload, 24*time.Hour)
	pipe.ZAdd(ctx, q.queueKey(), redis.Z{Score: float64(time.Now().UnixMilli()), Member: id})
	_, err = pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("persist email queue task: %w", err)
	}
	return nil
}

func (q *RedisEmailQueue) Start(ctx context.Context) {
	workers := q.opts.Workers
	if workers < 1 {
		workers = 1
	}
	for range workers {
		q.wg.Add(1)
		go q.worker(ctx)
	}
	q.wg.Add(1)
	go q.reaper(ctx)
}

func (q *RedisEmailQueue) Wait() {
	q.wg.Wait()
}

func (q *RedisEmailQueue) worker(ctx context.Context) {
	defer q.wg.Done()
	ticker := time.NewTicker(q.opts.Poll)
	defer ticker.Stop()
	for {
		processed, err := q.processOne(ctx)
		if err != nil && !errors.Is(err, context.Canceled) {
			log.Printf("email queue worker: %v", err)
		}
		if processed {
			continue
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (q *RedisEmailQueue) reaper(ctx context.Context) {
	defer q.wg.Done()
	interval := q.opts.Lease / 2
	if interval < time.Second {
		interval = time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			now := time.Now().UnixMilli()
			if _, err := requeueExpiredEmailTasksScript.Run(
				ctx, q.redis, []string{q.processingKey(), q.queueKey()}, now, 100,
			).Result(); err != nil && !errors.Is(err, context.Canceled) {
				log.Printf("email queue reaper: %v", err)
			}
		}
	}
}

func (q *RedisEmailQueue) processOne(ctx context.Context) (bool, error) {
	now := time.Now()
	result, err := claimEmailTaskScript.Run(
		ctx,
		q.redis,
		[]string{q.queueKey(), q.processingKey()},
		now.UnixMilli(),
		now.Add(q.opts.Lease).UnixMilli(),
		q.taskKeyPrefix(),
	).Slice()
	if errors.Is(err, redis.Nil) || len(result) == 0 {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("claim email queue task: %w", err)
	}
	if len(result) != 2 {
		return false, fmt.Errorf("unexpected email queue claim result")
	}
	id, ok := result[0].(string)
	if !ok {
		return false, fmt.Errorf("unexpected email queue task id %T", result[0])
	}
	sealed, ok := result[1].(string)
	if !ok {
		return false, fmt.Errorf("unexpected email queue payload %T", result[1])
	}
	var task queuedRegistrationEmail
	if err := q.open(sealed, &task); err != nil {
		_ = q.ack(ctx, id)
		return true, fmt.Errorf("decrypt email queue task: %w", err)
	}

	sendCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	err = q.mailer.SendRegistrationCode(sendCtx, task.Job.Email, task.Job.Code)
	cancel()
	if err == nil {
		return true, q.ack(ctx, id)
	}

	task.Attempt++
	if task.Attempt >= q.opts.MaxAttempts {
		if refundErr := refundRegistrationSend(ctx, q.redis, task.Job); refundErr != nil {
			log.Printf("refund failed registration email send: %v", refundErr)
		}
		if ackErr := q.ack(ctx, id); ackErr != nil {
			return true, ackErr
		}
		log.Printf("registration email permanently failed after %d attempts: %v", task.Attempt, err)
		return true, nil
	}
	delay := time.Duration(math.Pow(2, float64(task.Attempt-1))) * time.Second
	return true, q.retry(ctx, id, task, delay)
}

func (q *RedisEmailQueue) retry(ctx context.Context, id string, task queuedRegistrationEmail, delay time.Duration) error {
	payload, err := q.seal(task)
	if err != nil {
		return err
	}
	pipe := q.redis.TxPipeline()
	pipe.Set(ctx, q.taskKey(id), payload, 24*time.Hour)
	pipe.ZRem(ctx, q.processingKey(), id)
	pipe.ZAdd(ctx, q.queueKey(), redis.Z{
		Score:  float64(time.Now().Add(delay).UnixMilli()),
		Member: id,
	})
	_, err = pipe.Exec(ctx)
	return err
}

func (q *RedisEmailQueue) ack(ctx context.Context, id string) error {
	pipe := q.redis.TxPipeline()
	pipe.ZRem(ctx, q.processingKey(), id)
	pipe.Del(ctx, q.taskKey(id))
	_, err := pipe.Exec(ctx)
	return err
}

func refundRegistrationSend(ctx context.Context, client *redis.Client, job RegistrationEmailJob) error {
	_, err := refundRegistrationSendScript.Run(
		ctx,
		client,
		[]string{job.CodeKey, job.AttemptsKey, job.CooldownKey, job.EmailLimitKey, job.IPLimitKey},
		job.CodeHash,
	).Result()
	return err
}

func (q *RedisEmailQueue) seal(value queuedRegistrationEmail) (string, error) {
	plaintext, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(q.encryptionKey())
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nil, nonce, plaintext, nil)
	return base64.RawURLEncoding.EncodeToString(append(nonce, ciphertext...)), nil
}

func (q *RedisEmailQueue) open(value string, target *queuedRegistrationEmail) error {
	sealed, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return err
	}
	block, err := aes.NewCipher(q.encryptionKey())
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}
	if len(sealed) < gcm.NonceSize() {
		return errors.New("encrypted email task is truncated")
	}
	plaintext, err := gcm.Open(nil, sealed[:gcm.NonceSize()], sealed[gcm.NonceSize():], nil)
	if err != nil {
		return err
	}
	return json.Unmarshal(plaintext, target)
}

func (q *RedisEmailQueue) encryptionKey() []byte {
	sum := sha256.Sum256([]byte(q.opts.Secret + ":email-queue"))
	return sum[:]
}

func (q *RedisEmailQueue) queueKey() string {
	return strings.TrimSuffix(q.opts.Prefix, ":") + ":mail:registration:queue"
}

func (q *RedisEmailQueue) processingKey() string {
	return strings.TrimSuffix(q.opts.Prefix, ":") + ":mail:registration:processing"
}

func (q *RedisEmailQueue) taskKeyPrefix() string {
	return strings.TrimSuffix(q.opts.Prefix, ":") + ":mail:registration:task:"
}

func (q *RedisEmailQueue) taskKey(id string) string {
	return q.taskKeyPrefix() + id
}
