package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Token types for differentiating Access vs Refresh tokens.
const (
	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
)

// TokenPair holds the generated access and refresh tokens.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// Claims represents the JWT claims.
type Claims struct {
	UserID       string `json:"user_id"`
	Username     string `json:"username"`
	Role         string `json:"role"`
	TokenType    string `json:"token_type"`    // "access" or "refresh"
	TokenVersion int    `json:"token_version"` // incremented on logout/password-change, invalidates all tokens
	jwt.RegisteredClaims
}

// GenerateToken creates a JWT token for the given user.
// Deprecated: use GenerateTokenWithType for new code that distinguishes access/refresh tokens.
func GenerateToken(userID string, username string, role string, secret string, expiration time.Duration) (string, error) {
	return GenerateTokenWithType(userID, username, role, TokenTypeAccess, 0, secret, expiration)
}

// GenerateTokenWithType creates a JWT token with explicit token_type and token_version.
// tokenType should be TokenTypeAccess or TokenTypeRefresh.
func GenerateTokenWithType(userID string, username string, role string, tokenType string, tokenVersion int, secret string, expiration time.Duration) (string, error) {
	claims := Claims{
		UserID:       userID,
		Username:     username,
		Role:         role,
		TokenType:    tokenType,
		TokenVersion: tokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GenerateTokenPair creates both an access token (short-lived) and refresh token (long-lived).
func GenerateTokenPair(userID string, username string, role string, tokenVersion int, secret string, accessExpiry time.Duration, refreshExpiry time.Duration) (*TokenPair, error) {
	accessToken, err := GenerateTokenWithType(userID, username, role, TokenTypeAccess, tokenVersion, secret, accessExpiry)
	if err != nil {
		return nil, err
	}

	refreshToken, err := GenerateTokenWithType(userID, username, role, TokenTypeRefresh, tokenVersion, secret, refreshExpiry)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// ParseToken validates and parses a JWT token string.
func ParseToken(tokenString string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// ParseTokenStrict validates a token and ensures it matches the expected token type.
// For access tokens: only "access" or "" (backward compat with old tokens) is accepted.
// For refresh tokens: only "refresh" is accepted.
func ParseTokenStrict(tokenString string, expectedType string, secret string) (*Claims, error) {
	claims, err := ParseToken(tokenString, secret)
	if err != nil {
		return nil, err
	}

	switch expectedType {
	case TokenTypeAccess:
		// Backward compat: old tokens have no token_type, treat as access
		if claims.TokenType != "" && claims.TokenType != TokenTypeAccess {
			return nil, errors.New("token type mismatch: expected access token")
		}
	case TokenTypeRefresh:
		if claims.TokenType != TokenTypeRefresh {
			return nil, errors.New("token type mismatch: expected refresh token")
		}
	}

	return claims, nil
}
