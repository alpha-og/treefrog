package auth

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
)

// Context key for user ID
type contextKey string

const UserIDKey contextKey = "userID"

func InitClerk(secretKey string) error {
	if secretKey == "" {
		return fmt.Errorf("CLERK_SECRET_KEY is required")
	}
	clerk.SetKey(secretKey)
	log.Println("Clerk SDK initialized")
	return nil
}

// AuthMiddleware wraps handlers with Clerk authentication
func AuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Use Clerk's built-in middleware
			clerkhttp.WithHeaderAuthorization()(next).ServeHTTP(w, r)
		})
	}
}

// GetUserID extracts user ID from authenticated request (SAFE VERSION #11)
func GetUserID(r *http.Request) (string, bool) {
	claims, ok := clerk.SessionClaimsFromContext(r.Context())
	if !ok {
		return "", false
	}
	userID := claims.Subject
	if userID == "" {
		return "", false
	}
	return userID, true
}

// GetUserClaims extracts full claims from authenticated request
func GetUserClaims(r *http.Request) (*clerk.SessionClaims, bool) {
	claims, ok := clerk.SessionClaimsFromContext(r.Context())
	return claims, ok
}

// WithUserID adds user ID to context
func WithUserID(ctx context.Context, userID string) context.Context {
	return context.WithValue(ctx, UserIDKey, userID)
}

// GetUserIDFromContext extracts user ID from context (SAFE VERSION #11)
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	if !ok || userID == "" {
		return "", false
	}
	return userID, true
}
