package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestSetRefreshTokenCookieUsesConsistentSecurityAttributes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPost, "/api/auth/login", nil)

	setRefreshTokenCookie(context, "token", time.Hour, true)

	cookie := recorder.Header().Get("Set-Cookie")
	for _, expected := range []string{
		refreshTokenCookieName + "=token",
		"Path=/api/auth",
		"HttpOnly",
		"Secure",
		"SameSite=Lax",
	} {
		if !strings.Contains(cookie, expected) {
			t.Errorf("expected cookie to contain %q: %s", expected, cookie)
		}
	}
}

func TestClearRefreshTokenCookieUsesSecureAttribute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)

	clearRefreshTokenCookie(context, true)

	cookie := recorder.Header().Get("Set-Cookie")
	for _, expected := range []string{"Max-Age=0", "Path=/api/auth", "HttpOnly", "Secure", "SameSite=Lax"} {
		if !strings.Contains(cookie, expected) {
			t.Errorf("expected cleared cookie to contain %q: %s", expected, cookie)
		}
	}
}
