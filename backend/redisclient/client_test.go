package redisclient

import (
	"testing"

	"pudding-resume-backend/config"
)

func TestNewConfiguresACLAndTLS(t *testing.T) {
	client := New(&config.Config{
		RedisAddr:          "redis.example.com:6380",
		RedisUsername:      "pudding",
		RedisPassword:      "secret",
		RedisDB:            2,
		RedisTLSEnabled:    true,
		RedisTLSServerName: "redis.internal",
	})
	t.Cleanup(func() { _ = client.Close() })
	options := client.Options()
	if options.Username != "pudding" || options.Password != "secret" || options.DB != 2 {
		t.Fatalf("unexpected Redis ACL/database options: %#v", options)
	}
	if options.TLSConfig == nil || options.TLSConfig.ServerName != "redis.internal" {
		t.Fatalf("unexpected Redis TLS options: %#v", options.TLSConfig)
	}
}
