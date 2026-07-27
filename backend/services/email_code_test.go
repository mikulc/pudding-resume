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

type recordingDispatcher struct {
	mu    sync.Mutex
	code  string
	calls int
	err   error
}

func (m *recordingDispatcher) EnqueueRegistrationEmail(_ context.Context, job RegistrationEmailJob) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.code = job.Code
	m.calls++
	return m.err
}

func (m *recordingDispatcher) lastCode() string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.code
}

func newTestEmailCodeService(t *testing.T) (*EmailCodeService, *recordingDispatcher) {
	t.Helper()
	server := miniredis.RunT(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	sender := &recordingDispatcher{}
	service := NewEmailCodeService(client, sender, EmailCodeOptions{
		Secret:          "test-secret-that-is-at-least-32-characters",
		TTL:             5 * time.Minute,
		Cooldown:        time.Minute,
		MaxAttempts:     3,
		MaxEmailPerHour: 5,
		MaxIPPerHour:    20,
		Prefix:          "pudding:test",
		TicketTTL:       10 * time.Minute,
	})
	return service, sender
}

func TestEmailCodeCanOnlyBeConsumedOnce(t *testing.T) {
	service, sender := newTestEmailCodeService(t)
	ctx := context.Background()
	email := "User@Example.com"

	if err := service.SendRegistrationCode(ctx, email, "127.0.0.1"); err != nil {
		t.Fatalf("SendRegistrationCode() error = %v", err)
	}
	code := sender.lastCode()
	if len(code) != 6 {
		t.Fatalf("generated code length = %d, want 6", len(code))
	}
	ticket, err := service.ExchangeRegistrationCode(ctx, email, code)
	if err != nil {
		t.Fatalf("first ExchangeRegistrationCode() error = %v", err)
	}
	if err := service.ValidateRegistrationTicket(ctx, email, ticket); err != nil {
		t.Fatalf("ValidateRegistrationTicket() error = %v", err)
	}
	if err := service.ValidateRegistrationTicket(ctx, "other@example.com", ticket); !errors.Is(err, ErrRegistrationTicketInvalid) {
		t.Fatalf("ticket bound to wrong email error = %v, want ErrRegistrationTicketInvalid", err)
	}
	if _, err := service.ExchangeRegistrationCode(ctx, email, code); !errors.Is(err, ErrCodeInvalid) {
		t.Fatalf("second ExchangeRegistrationCode() error = %v, want ErrCodeInvalid", err)
	}
	if err := service.ConsumeRegistrationTicket(ctx, email, ticket); err != nil {
		t.Fatalf("ConsumeRegistrationTicket() error = %v", err)
	}
	if err := service.ValidateRegistrationTicket(ctx, email, ticket); !errors.Is(err, ErrRegistrationTicketInvalid) {
		t.Fatalf("consumed ticket validation error = %v, want ErrRegistrationTicketInvalid", err)
	}
}

func TestEmailCodeSendCooldown(t *testing.T) {
	service, _ := newTestEmailCodeService(t)
	ctx := context.Background()
	if err := service.SendRegistrationCode(ctx, "user@example.com", "127.0.0.1"); err != nil {
		t.Fatalf("first SendRegistrationCode() error = %v", err)
	}
	err := service.SendRegistrationCode(ctx, "user@example.com", "127.0.0.1")
	var rateLimit *RateLimitError
	if !errors.As(err, &rateLimit) {
		t.Fatalf("second SendRegistrationCode() error = %v, want RateLimitError", err)
	}
	if rateLimit.RetryAfter <= 0 {
		t.Fatalf("RetryAfter = %v, want positive duration", rateLimit.RetryAfter)
	}
}

func TestEmailCodeExpiresAfterMaximumFailures(t *testing.T) {
	service, sender := newTestEmailCodeService(t)
	ctx := context.Background()
	email := "user@example.com"
	if err := service.SendRegistrationCode(ctx, email, "127.0.0.1"); err != nil {
		t.Fatalf("SendRegistrationCode() error = %v", err)
	}
	wrongCode := "000000"
	if sender.lastCode() == wrongCode {
		wrongCode = "999999"
	}
	for attempt := 1; attempt <= 2; attempt++ {
		if _, err := service.ExchangeRegistrationCode(ctx, email, wrongCode); !errors.Is(err, ErrCodeInvalid) {
			t.Fatalf("attempt %d error = %v, want ErrCodeInvalid", attempt, err)
		}
	}
	if _, err := service.ExchangeRegistrationCode(ctx, email, wrongCode); !errors.Is(err, ErrCodeAttemptsExceeded) {
		t.Fatalf("last wrong attempt error = %v, want ErrCodeAttemptsExceeded", err)
	}
	if _, err := service.ExchangeRegistrationCode(ctx, email, sender.lastCode()); !errors.Is(err, ErrCodeInvalid) {
		t.Fatalf("correct code after lockout error = %v, want ErrCodeInvalid", err)
	}
}

func TestConcurrentEmailCodeVerificationHasSingleWinner(t *testing.T) {
	service, sender := newTestEmailCodeService(t)
	ctx := context.Background()
	email := "user@example.com"
	if err := service.SendRegistrationCode(ctx, email, "127.0.0.1"); err != nil {
		t.Fatalf("SendRegistrationCode() error = %v", err)
	}

	const workers = 8
	results := make(chan error, workers)
	var group sync.WaitGroup
	for range workers {
		group.Add(1)
		go func() {
			defer group.Done()
			_, err := service.ExchangeRegistrationCode(ctx, email, sender.lastCode())
			results <- err
		}()
	}
	group.Wait()
	close(results)

	successes := 0
	for err := range results {
		if err == nil {
			successes++
		}
	}
	if successes != 1 {
		t.Fatalf("successful concurrent verifications = %d, want 1", successes)
	}
}
