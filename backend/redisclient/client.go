package redisclient

import (
	"context"
	"crypto/tls"
	"time"

	"github.com/redis/go-redis/v9"

	"pudding-resume-backend/config"
)

func New(cfg *config.Config) *redis.Client {
	options := &redis.Options{
		Addr:         cfg.RedisAddr,
		Username:     cfg.RedisUsername,
		Password:     cfg.RedisPassword,
		DB:           cfg.RedisDB,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	}
	if cfg.RedisTLSEnabled {
		options.TLSConfig = &tls.Config{
			MinVersion: tls.VersionTLS12,
			ServerName: cfg.RedisTLSServerName,
		}
	}
	return redis.NewClient(options)
}

func Ping(ctx context.Context, client *redis.Client) error {
	return client.Ping(ctx).Err()
}
