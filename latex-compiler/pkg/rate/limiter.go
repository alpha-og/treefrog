package rate

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/sirupsen/logrus"
)

var log = logrus.WithField("component", "rate/limiter")

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

// TierLimits returns rate limits for each subscription tier
func TierLimits(tier string) map[string]RateLimit {
	switch tier {
	case "pro":
		return map[string]RateLimit{
			"build":    {Requests: 30, Window: time.Minute},
			"download": {Requests: 120, Window: time.Minute},
			"status":   {Requests: 60, Window: time.Minute},
			"default":  {Requests: 300, Window: time.Minute},
		}
	case "enterprise":
		return map[string]RateLimit{
			"build":    {Requests: 100, Window: time.Minute},
			"download": {Requests: 300, Window: time.Minute},
			"status":   {Requests: 120, Window: time.Minute},
			"default":  {Requests: 600, Window: time.Minute},
		}
	default: // free tier
		return map[string]RateLimit{
			"build":    {Requests: 10, Window: time.Minute},
			"download": {Requests: 60, Window: time.Minute},
			"status":   {Requests: 30, Window: time.Minute},
			"default":  {Requests: 100, Window: time.Minute},
		}
	}
}

// DefaultLimits returns the default rate limiting configuration (free tier)
func DefaultLimits() map[string]RateLimit {
	return TierLimits("free")
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

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis connection failed: %w", err)
	}

	log.WithField("redis_url", redisURL).Info("Rate limiter connected to Redis")

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
			userID, ok := r.Context().Value("userID").(string)
			if !ok || userID == "" {
				next.ServeHTTP(w, r)
				return
			}

			tier, _ := r.Context().Value("userTier").(string)
			if tier == "" {
				tier = "free"
			}

			limits := TierLimits(tier)
			limit, exists := limits[action]
			if !exists {
				limit = limits["default"]
			}

			key := fmt.Sprintf("ratelimit:%s:%s", userID, action)

			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()

			count, err := l.client.Incr(ctx, key).Result()
			if err != nil {
				log.WithError(err).Warn("Redis error during rate limiting, allowing request")
				next.ServeHTTP(w, r)
				return
			}

			if count == 1 {
				l.client.Expire(ctx, key, limit.Window)
			}

			if count > int64(limit.Requests) {
				log.WithFields(logrus.Fields{
					"user_id": userID,
					"action":  action,
					"count":   count,
					"limit":   limit.Requests,
				}).Warn("Rate limit exceeded")

				w.Header().Set("Retry-After", fmt.Sprintf("%d", int(limit.Window.Seconds())))
				w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit.Requests))
				w.Header().Set("X-RateLimit-Remaining", "0")
				http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit.Requests))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", limit.Requests-int(count)))
			w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(limit.Window).Unix()))

			next.ServeHTTP(w, r)
		})
	}
}

// Allow checks if a request is allowed under the rate limit for a given action and tier
func (l *Limiter) Allow(userID, action, tier string) (bool, error) {
	if userID == "" {
		return false, fmt.Errorf("user ID required")
	}

	if tier == "" {
		tier = "free"
	}

	limits := TierLimits(tier)
	limit, ok := limits[action]
	if !ok {
		limit = limits["default"]
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
func (l *Limiter) GetRemaining(userID, action, tier string) (int, error) {
	if userID == "" {
		return 0, fmt.Errorf("user ID required")
	}

	if tier == "" {
		tier = "free"
	}

	limits := TierLimits(tier)
	limit, ok := limits[action]
	if !ok {
		limit = limits["default"]
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

// Increment increments a counter for the given key and returns the new value
func (l *Limiter) Increment(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	count, err := l.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}

	if count == 1 {
		l.client.Expire(ctx, key, ttl)
	}

	return count, nil
}
