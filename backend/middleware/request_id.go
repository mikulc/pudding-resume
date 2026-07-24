package middleware

import (
	"crypto/rand"
	"encoding/hex"

	"github.com/gin-gonic/gin"
)

const RequestIDHeader = "X-Request-ID"

// RequestID preserves a caller-provided request ID or creates one for tracing.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader(RequestIDHeader)
		if requestID == "" {
			requestID = newRequestID()
		}
		c.Set("requestID", requestID)
		c.Header(RequestIDHeader, requestID)
		c.Next()
	}
}

func newRequestID() string {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return "request-id-unavailable"
	}
	return hex.EncodeToString(value[:])
}

// GetRequestID returns the trace ID attached by RequestID.
func GetRequestID(c *gin.Context) string {
	value, _ := c.Get("requestID")
	requestID, _ := value.(string)
	return requestID
}
