package mailer

import (
	"strings"
	"testing"

	"pudding-resume-backend/config"
)

func TestSMTPMessageContainsDeliverabilityHeadersAndAlternatives(t *testing.T) {
	sender := NewSMTP(&config.Config{
		SMTPFromAddress: "no-reply@mail.example.com",
		SMTPFromName:    "布丁简历",
	})
	message := string(sender.message(
		"user@example.com",
		"注册验证码",
		"验证码：123456",
		"<strong>123456</strong>",
	))
	for _, expected := range []string{
		"Date:",
		"Message-ID:",
		"Auto-Submitted: auto-generated",
		"Content-Type: multipart/alternative",
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Type: text/html; charset=UTF-8",
	} {
		if !strings.Contains(message, expected) {
			t.Errorf("message missing %q", expected)
		}
	}
}
