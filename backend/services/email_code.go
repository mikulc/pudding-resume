package services

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	ErrCodeInvalid               = errors.New("verification code is invalid or expired")
	ErrCodeAttemptsExceeded      = errors.New("verification code attempts exceeded")
	ErrRegistrationTicketInvalid = errors.New("registration ticket is invalid or expired")
)

type RateLimitError struct {
	RetryAfter time.Duration
}

func (e *RateLimitError) Error() string {
	return "verification code requests are rate limited"
}

type EmailCodeOptions struct {
	Secret          string
	TTL             time.Duration
	Cooldown        time.Duration
	MaxAttempts     int
	MaxEmailPerHour int
	MaxIPPerHour    int
	Prefix          string
	TicketTTL       time.Duration
}

type EmailCodeService struct {
	redis      *redis.Client
	dispatcher RegistrationEmailDispatcher
	opts       EmailCodeOptions
}

type RegistrationEmailJob struct {
	Email         string `json:"email"`
	Code          string `json:"code"`
	CodeHash      string `json:"code_hash"`
	CodeKey       string `json:"code_key"`
	AttemptsKey   string `json:"attempts_key"`
	CooldownKey   string `json:"cooldown_key"`
	EmailLimitKey string `json:"email_limit_key"`
	IPLimitKey    string `json:"ip_limit_key"`
}

type RegistrationEmailDispatcher interface {
	EnqueueRegistrationEmail(ctx context.Context, job RegistrationEmailJob) error
}

func NewEmailCodeService(client *redis.Client, dispatcher RegistrationEmailDispatcher, opts EmailCodeOptions) *EmailCodeService {
	return &EmailCodeService{redis: client, dispatcher: dispatcher, opts: opts}
}

var reserveSendScript = redis.NewScript(`
local cooldownTTL = redis.call("TTL", KEYS[1])
if cooldownTTL > 0 then
  return {0, cooldownTTL}
end

local emailCount = redis.call("INCR", KEYS[2])
if emailCount == 1 then redis.call("EXPIRE", KEYS[2], 3600) end
if emailCount > tonumber(ARGV[2]) then
  return {1, redis.call("TTL", KEYS[2])}
end

local ipCount = redis.call("INCR", KEYS[3])
if ipCount == 1 then redis.call("EXPIRE", KEYS[3], 3600) end
if ipCount > tonumber(ARGV[3]) then
  return {2, redis.call("TTL", KEYS[3])}
end

redis.call("SET", KEYS[1], "1", "EX", ARGV[1])
return {3, tonumber(ARGV[1])}
`)

var consumeCodeScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
redis.call("DEL", KEYS[1], KEYS[2])
return 1
`)

var consumeTicketScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
redis.call("DEL", KEYS[1])
return 1
`)

var recordFailureScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return -1 end
local attempts = redis.call("INCR", KEYS[2])
if attempts == 1 then redis.call("EXPIRE", KEYS[2], ARGV[3]) end
if attempts >= tonumber(ARGV[2]) then
  redis.call("DEL", KEYS[1], KEYS[2])
end
return attempts
`)

var exchangeCodeScript = redis.NewScript(`
if redis.call("GET", KEYS[1]) ~= ARGV[1] then return 0 end
redis.call("DEL", KEYS[1], KEYS[2])
redis.call("SET", KEYS[3], ARGV[2], "EX", ARGV[3])
return 1
`)

func (s *EmailCodeService) SendRegistrationCode(ctx context.Context, email, ip string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	emailID := s.identity(email)
	ipID := s.identity(ip)
	codeKey := s.key("auth:registration-code:" + emailID)
	attemptsKey := s.key("auth:registration-attempts:" + emailID)
	cooldownKey := s.key("auth:send-cooldown:" + emailID)
	emailLimitKey := s.key("auth:send-hour:email:" + emailID)
	ipLimitKey := s.key("auth:send-hour:ip:" + ipID)

	result, err := reserveSendScript.Run(
		ctx,
		s.redis,
		[]string{cooldownKey, emailLimitKey, ipLimitKey},
		maxInt64(1, int64(s.opts.Cooldown/time.Second)),
		s.opts.MaxEmailPerHour,
		s.opts.MaxIPPerHour,
	).Slice()
	if err != nil {
		return fmt.Errorf("reserve verification code send: %w", err)
	}
	status, retryAfter, err := parseScriptResult(result)
	if err != nil {
		return err
	}
	if status != 3 {
		return &RateLimitError{RetryAfter: time.Duration(maxInt64(1, retryAfter)) * time.Second}
	}

	code, err := generateNumericCode()
	if err != nil {
		return fmt.Errorf("generate verification code: %w", err)
	}
	codeHash := s.codeHash(email, code)
	pipe := s.redis.TxPipeline()
	pipe.Set(ctx, codeKey, codeHash, s.opts.TTL)
	pipe.Del(ctx, attemptsKey)
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("store verification code: %w", err)
	}

	if s.dispatcher == nil {
		return fmt.Errorf("registration email dispatcher is not configured")
	}
	if err := s.dispatcher.EnqueueRegistrationEmail(ctx, RegistrationEmailJob{
		Email:         email,
		Code:          code,
		CodeHash:      codeHash,
		CodeKey:       codeKey,
		AttemptsKey:   attemptsKey,
		CooldownKey:   cooldownKey,
		EmailLimitKey: emailLimitKey,
		IPLimitKey:    ipLimitKey,
	}); err != nil {
		_ = refundRegistrationSend(ctx, s.redis, RegistrationEmailJob{
			CodeHash: codeHash, CodeKey: codeKey, AttemptsKey: attemptsKey,
			CooldownKey: cooldownKey, EmailLimitKey: emailLimitKey, IPLimitKey: ipLimitKey,
		})
		return fmt.Errorf("enqueue verification email: %w", err)
	}
	return nil
}

func (s *EmailCodeService) ExchangeRegistrationCode(ctx context.Context, email, code string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	emailID := s.identity(email)
	codeKey := s.key("auth:registration-code:" + emailID)
	attemptsKey := s.key("auth:registration-attempts:" + emailID)
	stored, err := s.redis.Get(ctx, codeKey).Result()
	if errors.Is(err, redis.Nil) {
		return "", ErrCodeInvalid
	}
	if err != nil {
		return "", fmt.Errorf("read verification code: %w", err)
	}

	expected := s.codeHash(email, strings.TrimSpace(code))
	if hmac.Equal([]byte(stored), []byte(expected)) {
		ticket, err := generateOpaqueToken()
		if err != nil {
			return "", fmt.Errorf("generate registration ticket: %w", err)
		}
		ticketKey := s.key("auth:registration-ticket:" + s.opaqueID(ticket))
		consumed, err := exchangeCodeScript.Run(
			ctx,
			s.redis,
			[]string{codeKey, attemptsKey, ticketKey},
			stored,
			emailID,
			maxInt64(1, int64(s.opts.TicketTTL/time.Second)),
		).Int()
		if err != nil {
			return "", fmt.Errorf("exchange verification code: %w", err)
		}
		if consumed == 1 {
			return ticket, nil
		}
		return "", ErrCodeInvalid
	}

	attempts, err := recordFailureScript.Run(
		ctx,
		s.redis,
		[]string{codeKey, attemptsKey},
		stored,
		s.opts.MaxAttempts,
		maxInt64(1, int64(s.opts.TTL/time.Second)),
	).Int()
	if err != nil {
		return "", fmt.Errorf("record verification failure: %w", err)
	}
	if attempts >= s.opts.MaxAttempts {
		return "", ErrCodeAttemptsExceeded
	}
	return "", ErrCodeInvalid
}

func (s *EmailCodeService) ValidateRegistrationTicket(ctx context.Context, email, ticket string) error {
	emailID := s.identity(email)
	ticketKey := s.key("auth:registration-ticket:" + s.opaqueID(strings.TrimSpace(ticket)))
	stored, err := s.redis.Get(ctx, ticketKey).Result()
	if errors.Is(err, redis.Nil) {
		return ErrRegistrationTicketInvalid
	}
	if err != nil {
		return fmt.Errorf("read registration ticket: %w", err)
	}
	if !hmac.Equal([]byte(stored), []byte(emailID)) {
		return ErrRegistrationTicketInvalid
	}
	return nil
}

func (s *EmailCodeService) ConsumeRegistrationTicket(ctx context.Context, email, ticket string) error {
	emailID := s.identity(email)
	ticketKey := s.key("auth:registration-ticket:" + s.opaqueID(strings.TrimSpace(ticket)))
	consumed, err := consumeTicketScript.Run(ctx, s.redis, []string{ticketKey}, emailID).Int()
	if err != nil {
		return fmt.Errorf("consume registration ticket: %w", err)
	}
	if consumed != 1 {
		return ErrRegistrationTicketInvalid
	}
	return nil
}

func (s *EmailCodeService) identity(value string) string {
	mac := hmac.New(sha256.New, []byte(s.opts.Secret))
	_, _ = mac.Write([]byte(strings.ToLower(strings.TrimSpace(value))))
	return hex.EncodeToString(mac.Sum(nil))
}

func (s *EmailCodeService) codeHash(email, code string) string {
	mac := hmac.New(sha256.New, []byte(s.opts.Secret))
	_, _ = mac.Write([]byte(strings.ToLower(strings.TrimSpace(email)) + ":register:" + code))
	return hex.EncodeToString(mac.Sum(nil))
}

func (s *EmailCodeService) opaqueID(value string) string {
	mac := hmac.New(sha256.New, []byte(s.opts.Secret))
	_, _ = mac.Write([]byte(value))
	return hex.EncodeToString(mac.Sum(nil))
}

func (s *EmailCodeService) key(suffix string) string {
	return strings.TrimSuffix(s.opts.Prefix, ":") + ":" + suffix
}

func generateNumericCode() (string, error) {
	var buffer [8]byte
	if _, err := rand.Read(buffer[:]); err != nil {
		return "", err
	}
	value := binary.BigEndian.Uint64(buffer[:]) % 1_000_000
	return fmt.Sprintf("%06d", value), nil
}

func generateOpaqueToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func parseScriptResult(values []any) (int64, int64, error) {
	if len(values) != 2 {
		return 0, 0, fmt.Errorf("unexpected rate limit script result")
	}
	status, err := scriptInt64(values[0])
	if err != nil {
		return 0, 0, err
	}
	retryAfter, err := scriptInt64(values[1])
	if err != nil {
		return 0, 0, err
	}
	return status, retryAfter, nil
}

func scriptInt64(value any) (int64, error) {
	switch typed := value.(type) {
	case int64:
		return typed, nil
	case string:
		return strconv.ParseInt(typed, 10, 64)
	default:
		return 0, fmt.Errorf("unexpected integer value %T", value)
	}
}

func maxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
