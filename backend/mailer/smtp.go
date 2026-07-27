package mailer

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"html"
	"mime"
	"net"
	"net/smtp"
	"strings"
	"time"

	"github.com/google/uuid"

	"pudding-resume-backend/config"
)

type SMTPMailer struct {
	host        string
	port        int
	username    string
	password    string
	fromAddress string
	fromName    string
	tlsMode     string
	timeout     time.Duration
}

func NewSMTP(cfg *config.Config) *SMTPMailer {
	return &SMTPMailer{
		host:        cfg.SMTPHost,
		port:        cfg.SMTPPort,
		username:    cfg.SMTPUsername,
		password:    cfg.SMTPPassword,
		fromAddress: cfg.SMTPFromAddress,
		fromName:    cfg.SMTPFromName,
		tlsMode:     cfg.SMTPTLSMode,
		timeout:     10 * time.Second,
	}
}

func (m *SMTPMailer) SendRegistrationCode(ctx context.Context, to, code string) error {
	subject := "布丁简历 注册验证码"
	body := fmt.Sprintf("您的布丁简历注册验证码是：%s\n\n验证码 5 分钟内有效，请勿转发给他人。", code)
	htmlBody := fmt.Sprintf(`<!doctype html>
<html lang="zh-CN"><body style="margin:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
<h1 style="font-size:22px;margin:0 0 20px">布丁简历注册验证</h1>
<p style="margin:0 0 16px">您的注册验证码是：</p>
<div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f3f4f6;border-radius:12px;padding:16px;text-align:center">%s</div>
<p style="color:#6b7280;margin:20px 0 0">验证码 5 分钟内有效，请勿转发给他人。</p>
<p style="color:#9ca3af;font-size:12px;margin:24px 0 0">如果这不是您的操作，请忽略本邮件。</p>
</div></body></html>`, html.EscapeString(code))
	message := m.message(to, subject, body, htmlBody)

	address := net.JoinHostPort(m.host, fmt.Sprintf("%d", m.port))
	dialer := net.Dialer{Timeout: m.timeout}
	var conn net.Conn
	var err error
	if m.tlsMode == "tls" {
		conn, err = tls.DialWithDialer(&dialer, "tcp", address, m.tlsConfig())
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", address)
	}
	if err != nil {
		return fmt.Errorf("connect to SMTP server: %w", err)
	}
	defer conn.Close()

	if deadline, ok := ctx.Deadline(); ok {
		_ = conn.SetDeadline(deadline)
	} else {
		_ = conn.SetDeadline(time.Now().Add(m.timeout))
	}

	client, err := smtp.NewClient(conn, m.host)
	if err != nil {
		return fmt.Errorf("create SMTP client: %w", err)
	}
	defer client.Close()

	if m.tlsMode == "starttls" {
		if ok, _ := client.Extension("STARTTLS"); !ok {
			return fmt.Errorf("SMTP server does not support STARTTLS")
		}
		if err := client.StartTLS(m.tlsConfig()); err != nil {
			return fmt.Errorf("start SMTP TLS: %w", err)
		}
	}

	if m.username != "" {
		if ok, _ := client.Extension("AUTH"); !ok {
			return fmt.Errorf("SMTP server does not support authentication")
		}
		if err := client.Auth(smtp.PlainAuth("", m.username, m.password, m.host)); err != nil {
			return fmt.Errorf("authenticate to SMTP server: %w", err)
		}
	}
	if err := client.Mail(m.fromAddress); err != nil {
		return fmt.Errorf("set SMTP sender: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("set SMTP recipient: %w", err)
	}
	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("start SMTP message: %w", err)
	}
	buffered := bufio.NewWriter(writer)
	if _, err := buffered.Write(message); err != nil {
		_ = writer.Close()
		return fmt.Errorf("write SMTP message: %w", err)
	}
	if err := buffered.Flush(); err != nil {
		_ = writer.Close()
		return fmt.Errorf("flush SMTP message: %w", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("finish SMTP message: %w", err)
	}
	return client.Quit()
}

func (m *SMTPMailer) tlsConfig() *tls.Config {
	return &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: m.host,
	}
}

func (m *SMTPMailer) message(to, subject, plainBody, htmlBody string) []byte {
	fromName := mime.QEncoding.Encode("UTF-8", m.fromName)
	encodedSubject := mime.QEncoding.Encode("UTF-8", subject)
	boundary := "pudding-" + uuid.NewString()
	messageIDDomain := "localhost"
	if parts := strings.Split(m.fromAddress, "@"); len(parts) == 2 && parts[1] != "" {
		messageIDDomain = parts[1]
	}
	headers := []string{
		fmt.Sprintf("From: %s <%s>", fromName, m.fromAddress),
		fmt.Sprintf("To: <%s>", to),
		fmt.Sprintf("Subject: %s", encodedSubject),
		fmt.Sprintf("Date: %s", time.Now().Format(time.RFC1123Z)),
		fmt.Sprintf("Message-ID: <%s@%s>", uuid.NewString(), messageIDDomain),
		"MIME-Version: 1.0",
		"Auto-Submitted: auto-generated",
		"X-Auto-Response-Suppress: All",
		fmt.Sprintf(`Content-Type: multipart/alternative; boundary="%s"`, boundary),
		"",
		"--" + boundary,
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: base64",
		"",
		wrapBase64(base64.StdEncoding.EncodeToString([]byte(plainBody))),
		"--" + boundary,
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: base64",
		"",
		wrapBase64(base64.StdEncoding.EncodeToString([]byte(htmlBody))),
		"--" + boundary + "--",
	}
	return []byte(strings.Join(headers, "\r\n") + "\r\n")
}

func wrapBase64(value string) string {
	const lineLength = 76
	var lines []string
	for len(value) > lineLength {
		lines = append(lines, value[:lineLength])
		value = value[lineLength:]
	}
	if value != "" {
		lines = append(lines, value)
	}
	return strings.Join(lines, "\r\n")
}
