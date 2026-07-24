package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestIDPreservesIncomingValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequestID())
	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, GetRequestID(c))
	})

	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set(RequestIDHeader, "trace-123")
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	if recorder.Header().Get(RequestIDHeader) != "trace-123" {
		t.Fatalf("response request ID = %q", recorder.Header().Get(RequestIDHeader))
	}
	if recorder.Body.String() != "trace-123" {
		t.Fatalf("context request ID = %q", recorder.Body.String())
	}
}

func TestRequestIDCreatesValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequestID())
	router.GET("/", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if len(recorder.Header().Get(RequestIDHeader)) != 32 {
		t.Fatalf("expected a 32-character request ID, got %q", recorder.Header().Get(RequestIDHeader))
	}
}
