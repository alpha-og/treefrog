# Phase 4: Security

## Overview

This phase covers:
- Signed URLs for secure downloads
- Rate limiting with Redis
- Security hardening

## Signed URLs

### Signed URL Signer (`pkg/auth/signer.go`)

```go
package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"
)

type SignedURLSigner struct {
	SecretKey []byte
	URLExpiry time.Duration
}

type SignedURLData struct {
	BuildID  string `json:"build_id"`
	Resource string `json:"resource"` // "pdf", "synctex", "log"
	Expires  int64  `json:"expires"`
	UserID   string `json:"user_id"`
}

func NewSignedURLSigner() (*SignedURLSigner, error) {
	secretKey := os.Getenv("COMPILER_SIGNING_KEY")
	if secretKey == "" {
		// Issue #10 - use crypto/rand for secure key generation
		secretKey = generateSecureRandomKey(32)
	}

	if len(secretKey) < 32 {
		return nil, fmt.Errorf("COMPILER_SIGNING_KEY must be at least 32 bytes")
	}

	// Issue #16 - reduced URL expiry from 15 to 5 minutes for security
	expiryStr := os.Getenv("COMPILER_URL_EXPIRY")
	if expiryStr == "" {
		expiryStr = "5m"
	}

	expiry, err := time.ParseDuration(expiryStr)
	if err != nil {
		return nil, fmt.Errorf("invalid COMPILER_URL_EXPIRY: %w", err)
	}

	return &SignedURLSigner{
		SecretKey: []byte(secretKey),
		URLExpiry: expiry,
	}, nil
}

// Issue #10 - fixed random key generation using crypto/rand
func generateSecureRandomKey(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		// Fallback to default key if random generation fails
		return "default-signing-key-change-in-production-environment"
	}

	result := make([]byte, length)
	for i := 0; i < length; i++ {
		result[i] = charset[b[i]%byte(len(charset))]
	}
	return string(result)
}

func (s *SignedURLSigner) GenerateURL(buildID, resource, userID string) (string, error) {
	if buildID == "" || resource == "" || userID == "" {
		return "", fmt.Errorf("buildID, resource, and userID required")
	}

	expires := time.Now().Add(s.URLExpiry).Unix()

	data := SignedURLData{
		BuildID:  buildID,
		Resource: resource,
		Expires:  expires,
		UserID:   userID,
	}

	// Encode data to JSON
	dataJSON, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to encode data: %w", err)
	}

	// Create signature
	dataB64 := base64.URLEncoding.EncodeToString(dataJSON)
	payload := fmt.Sprintf("%s.%d", dataB64, expires)
	h := hmac.New(sha256.New, s.SecretKey)
	h.Write([]byte(payload))
	sig := base64.URLEncoding.EncodeToString(h.Sum(nil))

	token := fmt.Sprintf("%s.%s", dataB64, sig)
	return fmt.Sprintf("/build/%s/%s?token=%s", url.QueryEscape(buildID), url.QueryEscape(resource), 
		url.QueryEscape(token)), nil
}

func (s *SignedURLSigner) VerifyURL(token, buildID, resource, userID string) (bool, error) {
	if token == "" || buildID == "" || resource == "" || userID == "" {
		return false, fmt.Errorf("all parameters required")
	}

	// Parse token
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return false, fmt.Errorf("invalid token format")
	}

	dataJSON, err := base64.URLEncoding.DecodeString(parts[0])
	if err != nil {
		return false, fmt.Errorf("invalid token data: %w", err)
	}

	var data SignedURLData
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		return false, fmt.Errorf("invalid token payload: %w", err)
	}

	// Verify build ID and resource match
	if data.BuildID != buildID || data.Resource != resource {
		return false, fmt.Errorf("token mismatch")
	}

	// Verify user owns this build
	if data.UserID != userID {
		return false, fmt.Errorf("unauthorized user")
	}

	// Check expiration
	if time.Now().Unix() > data.Expires {
		return false, fmt.Errorf("token expired")
	}

	// Verify signature
	expectedPayload := fmt.Sprintf("%s.%d", parts[0], data.Expires)
	h := hmac.New(sha256.New, s.SecretKey)
	h.Write([]byte(expectedPayload))
	expectedSig := base64.URLEncoding.EncodeToString(h.Sum(nil))

	if !hmac.Equal([]byte(parts[1]), []byte(expectedSig)) {
		return false, fmt.Errorf("invalid signature")
	}

	return true, nil
}

func (s *SignedURLSigner) GetExpirationTime() time.Duration {
	return s.URLExpiry
}
```

### Signed URL Handlers

```go
package main

import (
	"encoding/json"
	"net/http"
	"os"

	"github.com/athulanoop/treefrog/latex-compiler/pkg/auth"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/build"
	"github.com/gorilla/mux"
)

func getSignedPDFURLHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	buildID := vars["id"]

	buildStore := build.NewStore()
	buildRec, err := buildStore.Get(buildID)
	if err != nil {
		http.Error(w, "Build not found", http.StatusNotFound)
		return
	}

	// STRICT USER ISOLATION
	if buildRec.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Check if build is completed
	if buildRec.Status != build.StatusCompleted {
		http.Error(w, "Build not completed", http.StatusBadRequest)
		return
	}

	// Generate signed URL
	signer := auth.NewSignedURLSigner()
	signedURL := signer.GenerateURL(buildID, "pdf", userID)

	// Calculate expiration
	expiresIn := signer.GetExpirationTime()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"url":       signedURL,
		"expires_in": expiresIn.Seconds(),
		"build_id":  buildID,
		"resource":  "pdf",
	})
}

func servePDFHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	buildID := vars["id"]
	resource := vars["resource"]

	// Get token from query params
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Missing token", http.StatusBadRequest)
		return
	}

	buildStore := build.NewStore()
	buildRec, err := buildStore.Get(buildID)
	if err != nil {
		http.Error(w, "Build not found", http.StatusNotFound)
		return
	}

	// STRICT USER ISOLATION
	if buildRec.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Verify signed URL
	signer := auth.NewSignedURLSigner()
	valid, err := signer.VerifyURL(token, buildID, resource, userID)
	if err != nil || !valid {
		http.Error(w, "Invalid or expired token", http.StatusForbidden)
		return
	}

	// Determine file path
	var filePath string
	switch resource {
	case "pdf":
		filePath = buildRec.PDFPath
	case "synctex":
		filePath = buildRec.SyncTeXPath
	case "log":
		filePath = buildRec.BuildLog
	default:
		http.Error(w, "Unknown resource", http.StatusBadRequest)
		return
	}

	// Check file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Serve file
	w.Header().Set("Content-Type", getContentType(resource))
	http.ServeFile(w, r, filePath)
}

func getContentType(resource string) string {
	switch resource {
	case "pdf":
		return "application/pdf"
	case "synctex":
		return "application/octet-stream"
	case "log":
		return "text/plain; charset=utf-8"
	default:
		return "application/octet-stream"
	}
}
```

## Rate Limiting

### Rate Limiter (`pkg/rate/limiter.go`)

```go
package rate

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
)

type Limiter struct {
	client *redis.Client
	config map[string]RateLimit
}

type RateLimit struct {
	Requests int
	Window   time.Duration
}

func DefaultLimits() map[string]RateLimit {
	return map[string]RateLimit{
		"build":    {Requests: 10, Window: time.Minute},
		"download": {Requests: 60, Window: time.Minute},
		"status":   {Requests: 30, Window: time.Minute},
		"default":  {Requests: 100, Window: time.Minute},
	}
}

// NewLimiter creates a rate limiter with Redis (Issue #31 - health check)
func NewLimiter() (*Limiter, error) {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("invalid REDIS_URL: %w", err)
	}

	client := redis.NewClient(opts)

	// Health check (Issue #31)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis connection failed: %w", err)
	}

	return &Limiter{
		client: client,
		config: DefaultLimits(),
	}, nil
}

func (l *Limiter) Close() {
	l.client.Close()
}

// Middleware creates rate limiting middleware (Issue #11 - safe user ID extraction)
func (l *Limiter) Middleware(action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Issue #11 - safe user ID extraction with type assertion check
			userID, ok := r.Context().Value("userID").(string)
			if !ok || userID == "" {
				// If no user ID, allow request but don't rate limit
				next.ServeHTTP(w, r)
				return
			}

			limit, exists := l.config[action]
			if !exists {
				limit = l.config["default"]
			}

			key := fmt.Sprintf("ratelimit:%s:%s", userID, action)

			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()

			count, err := l.client.Incr(ctx, key).Result()
			if err != nil {
				// On Redis error, allow the request but log it
				fmt.Printf("Rate limiter error: %v\n", err)
				next.ServeHTTP(w, r)
				return
			}

			if count == 1 {
				l.client.Expire(ctx, key, limit.Window)
			}

			if count > int64(limit.Requests) {
				w.Header().Set("Retry-After", fmt.Sprintf("%d", int(limit.Window.Seconds())))
				w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit.Requests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			// Set rate limit headers (Issue #16 - reduced from 15 to 5 minutes for signed URLs)
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit.Requests))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", limit.Requests-int(count)))
			w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(limit.Window).Unix()))

			next.ServeHTTP(w, r)
		})
	}
}

func (l *Limiter) Allow(userID, action string) (bool, error) {
	if userID == "" {
		return false, fmt.Errorf("user ID required")
	}

	limit, ok := l.config[action]
	if !ok {
		limit = l.config["default"]
	}

	key := fmt.Sprintf("ratelimit:%s:%s", userID, action)
	ctx := context.Background()

	count, err := l.client.Incr(ctx, key).Result()
	if err != nil {
		return false, err
	}

	if count == 1 {
		l.client.Expire(ctx, key, limit.Window)
	}

	return count <= int64(limit.Requests), nil
}

func (l *Limiter) GetRemaining(userID, action string) (int, error) {
	if userID == "" {
		return 0, fmt.Errorf("user ID required")
	}

	limit, ok := l.config[action]
	if !ok {
		limit = l.config["default"]
	}

	key := fmt.Sprintf("ratelimit:%s:%s", userID, action)
	ctx := context.Background()

	count, err := l.client.Get(ctx, key).Int()
	if err != nil {
		if err == redis.Nil {
			return limit.Requests, nil
		}
		return 0, err
	}

	remaining := limit.Requests - count
	if remaining < 0 {
		remaining = 0
	}

	return remaining, nil
}
```

## Security Checklist

- [ ] Implement signed URL generation
- [ ] Create URL verification middleware
- [ ] Set up rate limiting with Redis
- [ ] Add rate limit headers
- [ ] Review authentication flow
- [ ] Audit user isolation
- [ ] Test edge cases
- [ ] Add security logging
- [ ] Implement abuse detection

## Environment Variables

```bash
# Security
COMPILER_SIGNING_KEY=<32-byte-random-string>
COMPILER_URL_EXPIRY=15m

# Rate Limiting (Redis)
REDIS_URL=redis://localhost:6379
```

## Next Steps

Proceed to [Phase 5: Cache & Cleanup](05-cache-cleanup.md) to implement TTL and disk management.
