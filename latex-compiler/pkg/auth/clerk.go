package auth

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/sirupsen/logrus"
)

var log = logrus.WithField("component", "auth/clerk")

type contextKey string

const (
	UserIDKey   contextKey = "userID"
	UserTierKey contextKey = "userTier"
)

var dbInstance *sql.DB

func InitClerk(secretKey string, db *sql.DB) error {
	if secretKey == "" {
		return fmt.Errorf("CLERK_SECRET_KEY is required")
	}
	clerk.SetKey(secretKey)
	dbInstance = db
	log.Info("Clerk SDK initialized")
	return nil
}

// AuthMiddleware wraps handlers with Clerk authentication
func AuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			clerkhttp.WithHeaderAuthorization()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				claims, ok := clerk.SessionClaimsFromContext(r.Context())
				if !ok {
					http.Error(w, "Unauthorized", http.StatusUnauthorized)
					return
				}

				userID := claims.Subject
				if userID == "" {
					http.Error(w, "Unauthorized", http.StatusUnauthorized)
					return
				}

				ctx := context.WithValue(r.Context(), UserIDKey, userID)

				if dbInstance != nil {
					var tier string
					err := dbInstance.QueryRow("SELECT tier FROM users WHERE clerk_id = ?", userID).Scan(&tier)
					if err != nil {
						tier = "free"
					}
					ctx = context.WithValue(ctx, UserTierKey, tier)
				} else {
					ctx = context.WithValue(ctx, UserTierKey, "free")
				}

				next.ServeHTTP(w, r.WithContext(ctx))
			})).ServeHTTP(w, r)
		})
	}
}

// GetUserID extracts user ID from authenticated request
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

// GetUserTier extracts user tier from context
func GetUserTier(r *http.Request) string {
	tier, ok := r.Context().Value(UserTierKey).(string)
	if !ok {
		return "free"
	}
	return tier
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

// GetUserIDFromContext extracts user ID from context
func GetUserIDFromContext(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	if !ok || userID == "" {
		return "", false
	}
	return userID, true
}
