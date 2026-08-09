package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"pudding-resume-backend/models"
)

func TestInjectCurrentUserStoresStringID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	want := "0fd945e0-969f-4a87-8633-5758b1a3bd5b"

	injectCurrentUser(c, &models.User{ID: models.UUID(want)})

	value, exists := c.Get("userID")
	if !exists {
		t.Fatal("userID was not stored in context")
	}
	if _, ok := value.(string); !ok {
		t.Fatalf("userID context type = %T, want string", value)
	}
	if got := GetUserID(c); got != want {
		t.Fatalf("GetUserID() = %q, want %q", got, want)
	}
}

func TestGetUserIDAcceptsUUIDContextValue(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	want := "0fd945e0-969f-4a87-8633-5758b1a3bd5b"
	c.Set("userID", models.UUID(want))

	if got := GetUserID(c); got != want {
		t.Fatalf("GetUserID() = %q, want %q", got, want)
	}
}
