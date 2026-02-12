package rate

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
)

// Limiter provides rate limiting using Redis as a backend
type Limiter struct {
	client *redis.Client
	config map[string]RateLimit
}

// RateLimit defines the request limit and time window for a specific action
type RateLimit struct {
	Requests int
	Window   time.Duration
}

// DefaultLimits returns the default rate limiting configuration for different actions
func DefaultLimits() map[string]RateLimit {
	return map[string]RateLimit{
		"build":    {Requests: 10, Window: time.Minute},
		"download": {Requests: 60, Window: time.Minute},
		"status":   {Requests: 30, Window: time.Minute},
		"default":  {Requests: 100, Window: time.Minute},
	}
}

// NewLimiter creates a new rate limiter connected to Redis
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

	// Health check on connection
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

// Close closes the Redis connection
func (l *Limiter) Close() error {
	if l.client != nil {
		return l.client.Close()
	}
	return nil
}

// Middleware returns HTTP middleware that enforces rate limits on requests
func (l *Limiter) Middleware(action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract user ID from context (set by auth middleware)
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

			// Increment request counter
			count, err := l.client.Incr(ctx, key).Result()
			if err != nil {
				// On Redis error, allow the request but continue
				next.ServeHTTP(w, r)
				return
			}

			// Set expiration on first request in window
			if count == 1 {
				l.client.Expire(ctx, key, limit.Window)
			}

			// Check if limit exceeded
			if count > int64(limit.Requests) {
				w.Header().Set("Retry-After", fmt.Sprintf("%d", int(limit.Window.Seconds())))
				w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit.Requests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			// Set rate limit headers
			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit.Requests))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", limit.Requests-int(count)))
			w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(limit.Window).Unix()))

			next.ServeHTTP(w, r)
		})
	}
}

// Allow checks if a request is allowed under the rate limit for a given action
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

// GetRemaining returns the number of remaining requests for a user and action
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
