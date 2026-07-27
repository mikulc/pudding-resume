package services

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

type queueTestMailer struct {
	mu    sync.Mutex
	calls int
	err   error
}

func (m *queueTestMailer) SendRegistrationCode(_ context.Context, _, _ string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.calls++
	return m.err
}

func newTestEmailQueue(t *testing.T, sender *queueTestMailer, attempts int) (*RedisEmailQueue, *redis.Client) {
	t.Helper()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	queue := NewRedisEmailQueue(client, sender, EmailQueueOptions{
		Prefix:      "pudding:test",
		Secret:      "test-secret-that-is-at-least-32-characters",
		Workers:     1,
		MaxAttempts: attempts,
		Lease:       30 * time.Second,
		Poll:        10 * time.Millisecond,
	})
	return queue, client
}

func TestRedisEmailQueueDeliversAndAcknowledges(t *testing.T) {
	sender := &queueTestMailer{}
	queue, client := newTestEmailQueue(t, sender, 3)
	if err := queue.EnqueueRegistrationEmail(context.Background(), RegistrationEmailJob{
		Email: "user@example.com", Code: "123456",
	}); err != nil {
		t.Fatalf("EnqueueRegistrationEmail() error = %v", err)
	}
	processed, err := queue.processOne(context.Background())
	if err != nil || !processed {
		t.Fatalf("processOne() = %v, %v; want true, nil", processed, err)
	}
	if sender.calls != 1 {
		t.Fatalf("mailer calls = %d, want 1", sender.calls)
	}
	if got := client.ZCard(context.Background(), queue.queueKey()).Val(); got != 0 {
		t.Fatalf("queued tasks = %d, want 0", got)
	}
	if got := client.ZCard(context.Background(), queue.processingKey()).Val(); got != 0 {
		t.Fatalf("processing tasks = %d, want 0", got)
	}
}

func TestRedisEmailQueueRefundsPermanentFailure(t *testing.T) {
	sender := &queueTestMailer{err: errors.New("smtp down")}
	queue, client := newTestEmailQueue(t, sender, 1)
	ctx := context.Background()
	job := RegistrationEmailJob{
		Email:         "user@example.com",
		Code:          "123456",
		CodeHash:      "hash",
		CodeKey:       "pudding:test:code",
		AttemptsKey:   "pudding:test:attempts",
		CooldownKey:   "pudding:test:cooldown",
		EmailLimitKey: "pudding:test:email-limit",
		IPLimitKey:    "pudding:test:ip-limit",
	}
	client.Set(ctx, job.CodeKey, job.CodeHash, time.Minute)
	client.Set(ctx, job.AttemptsKey, "1", time.Minute)
	client.Set(ctx, job.CooldownKey, "1", time.Minute)
	client.Set(ctx, job.EmailLimitKey, "2", time.Hour)
	client.Set(ctx, job.IPLimitKey, "3", time.Hour)
	if err := queue.EnqueueRegistrationEmail(ctx, job); err != nil {
		t.Fatalf("enqueue: %v", err)
	}
	if processed, err := queue.processOne(ctx); err != nil || !processed {
		t.Fatalf("processOne() = %v, %v", processed, err)
	}
	if client.Exists(ctx, job.CodeKey, job.CooldownKey).Val() != 0 {
		t.Fatal("code and cooldown keys should be removed after permanent failure")
	}
	if got := client.Get(ctx, job.EmailLimitKey).Val(); got != "1" {
		t.Fatalf("email limit = %q, want 1", got)
	}
	if got := client.Get(ctx, job.IPLimitKey).Val(); got != "2" {
		t.Fatalf("IP limit = %q, want 2", got)
	}
}
