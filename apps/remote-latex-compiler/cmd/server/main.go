package main

import (
	"context"
	"database/sql"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/auth"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/billing"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/build"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/cleanup"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/config"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/db"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/log"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/rate"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/user"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/sirupsen/logrus"
)

var (
	dbInstance    *sql.DB
	logger        *logrus.Logger
	auditLogger   *log.AuditLogger
	buildQueue    *build.Queue
	userStore     *user.Store
	cleanupEngine *cleanup.Engine
	rateLimiter   *rate.Limiter
	cfg           *config.Config
)

func init() {
	logger = log.InitializeLogger("treefrog-saas-compiler")
	cfg = config.Load()
}

func main() {
	logger.Info("Initializing database")
	var err error
	dbInstance, err = db.InitDB(db.InitConfig{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Logger:      logger,
	})
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize database")
	}
	defer dbInstance.Close()

	logger.Info("Database initialized successfully")

	auditLogger = log.NewAuditLogger(logger, dbInstance)

	logger.Info("Initializing Supabase authentication")
	if err := auth.InitSupabase(os.Getenv("SUPABASE_URL"), dbInstance); err != nil {
		logger.WithError(err).Fatal("Failed to initialize Supabase auth")
	}

	billing.InitPlanTierMapping()

	logger.Info("Initializing Razorpay billing")
	razorpaySvc := billing.NewRazorpayService(
		cfg.Billing.RazorpayKeyID,
		cfg.Billing.RazorpayKeySecret,
	)
	_ = razorpaySvc

	logger.Info("Initializing Docker compiler")

	logger.Info("Initializing build queue")
	buildStore := build.NewStoreWithDB(dbInstance)
	buildQueue = build.NewQueue(cfg.Build.DefaultWorkers, nil, buildStore)
	logger.WithField("workers", cfg.Build.DefaultWorkers).Info("Build queue initialized")

	logger.Info("Initializing user store")
	var err2 error
	userStore, err2 = user.NewStore(dbInstance)
	if err2 != nil {
		logger.WithError(err2).Fatal("Failed to initialize user store")
	}

	logger.Info("Initializing cleanup engine")
	cleanupConfig := cleanup.Config{
		Interval:      cfg.Cleanup.Interval,
		TTL:           cfg.Cleanup.TTL,
		GracePeriod:   cfg.Storage.GracePeriod,
		WorkDir:       cfg.Build.WorkDir,
		DiskWarning:   cfg.Storage.DiskWarning,
		DiskCritical:  cfg.Storage.DiskCritical,
		DiskEmergency: cfg.Storage.DiskEmergency,
	}
	cleanupEngine = cleanup.NewEngine(cleanupConfig, buildStore, userStore, logger)
	cleanupEngine.Start()

	logger.Info("Initializing rate limiter")
	rateLimiter, err = rate.NewLimiter()
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize rate limiter")
	}
	defer rateLimiter.Close()

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(correlationIDMiddleware)
	r.Use(loggingMiddleware(logger))
	r.Use(middleware.Recoverer)

	allowedOrigins := []string{}
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		allowedOrigins = splitAndTrim(origins, ",")
	} else {
		allowedOrigins = []string{"http://localhost:3000", "http://localhost:5173", "http://localhost:34115"}
	}
	logger.WithField("origins", allowedOrigins).Info("CORS configuration")

	allowCredentials := len(allowedOrigins) > 0 && allowedOrigins[0] != "*"

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Compiler-Token", "X-Request-ID"},
		ExposedHeaders:   []string{"X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"},
		AllowCredentials: allowCredentials,
		MaxAge:           300,
	}))

	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	r.Route("/api", func(r chi.Router) {
		r.Use(auth.AuthMiddleware())

		r.With(rateLimiter.Middleware("build")).Post("/build", CreateBuildHandler())
		r.With(rateLimiter.Middleware("default")).Get("/build", ListBuildsHandler())
		r.With(rateLimiter.Middleware("default")).Get("/build/{id}", GetBuildHandler())
		r.With(rateLimiter.Middleware("status")).Get("/build/{id}/status", GetStatusHandler())
		r.With(rateLimiter.Middleware("default")).Get("/build/{id}/log", GetLogHandler())
		r.With(rateLimiter.Middleware("default")).Delete("/build/{id}", DeleteBuildHandler())

		r.With(rateLimiter.Middleware("build")).Post("/builds/init", InitDeltaSyncHandler())
		r.With(rateLimiter.Middleware("build")).Post("/builds/{buildId}/upload", UploadDeltaSyncFilesHandler())

		r.With(rateLimiter.Middleware("default")).Get("/build/{id}/pdf/url", GetSignedPDFURLHandler())
		r.With(rateLimiter.Middleware("download")).Get("/build/{id}/artifact/{resource}", ServePDFHandler())
		r.With(rateLimiter.Middleware("download")).Get("/build/{id}/synctex", ServeSyncTeXHandler())
		r.With(rateLimiter.Middleware("default")).Get("/build/{id}/synctex/view", SyncTeXViewHandler())
		r.With(rateLimiter.Middleware("default")).Get("/build/{id}/synctex/edit", SyncTeXEditHandler())

		r.Post("/subscription/create", CreateSubscriptionHandler())
		r.Post("/subscription/cancel", CancelSubscriptionHandler())
		r.Get("/subscription/status", GetSubscriptionStatusHandler())

		r.Post("/coupon/redeem", RedeemCouponHandler())
		r.Post("/coupon/apply", ApplyTrialCouponHandler())

		r.Get("/allowlist/check", CheckAllowlistHandler())

		r.Route("/admin", func(r chi.Router) {
			r.Use(auth.AdminMiddleware())
			r.Get("/allowlist", ListAllowlistHandler())
			r.Post("/allowlist", AddToAllowlistHandler())
			r.Delete("/allowlist/{email}", RemoveFromAllowlistHandler())
			r.Get("/users", ListUsersHandler())
			r.Get("/users/{id}", GetUserHandler())
			r.Put("/users/{id}/tier", UpdateUserTierHandler())
			r.Put("/users/{id}/admin", SetUserAdminHandler())
			r.Get("/stats", GetAdminStatsHandler())
		})

		r.Get("/user/me", GetCurrentUserHandler())
		r.Get("/user/usage", GetUserUsageHandler())
	})

	r.With(webhookRateLimitMiddleware()).Post("/webhooks/razorpay", RazorpayWebhookHandler())

	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	go func() {
		logger.WithField("addr", srv.Addr).Info("Server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Error("Server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	if buildQueue != nil {
		go buildQueue.Stop()
	}

	if cleanupEngine != nil {
		logger.Info("Running final cleanup before shutdown")
		cleanupEngine.ForceRun()
		cleanupEngine.Stop()
	}

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.WithError(err).Error("Server shutdown error")
	}

	logger.Info("Server stopped")
}

// Middleware for correlation IDs
type correlationIDKey struct{}

func correlationIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		corrID := middleware.GetReqID(r.Context())
		ctx := context.WithValue(r.Context(), correlationIDKey{}, corrID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Middleware for structured logging
func loggingMiddleware(logger *logrus.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(rw, r)

			duration := time.Since(start)
			corrID, _ := r.Context().Value(correlationIDKey{}).(string)

			fields := logrus.Fields{
				"method":        r.Method,
				"path":          r.URL.Path,
				"status":        rw.statusCode,
				"duration_ms":   duration.Milliseconds(),
				"correlationID": corrID,
				"remoteAddr":    r.RemoteAddr,
			}

			if rw.statusCode >= 500 {
				logger.WithFields(fields).Error("HTTP request failed")
			} else if rw.statusCode >= 400 {
				logger.WithFields(fields).Warn("HTTP request rejected")
			} else {
				logger.WithFields(fields).Debug("HTTP request completed")
			}
		})
	}
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

// Ready check endpoint
func readyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready"}`))
}

// splitAndTrim splits a string and trims whitespace from each element
func splitAndTrim(s, sep string) []string {
	parts := strings.Split(s, sep)
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

// webhookRateLimitMiddleware limits webhook requests to prevent abuse
func webhookRateLimitMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()

			key := "webhook:ratelimit:global"
			count, err := rateLimiter.Increment(ctx, key, time.Minute)
			if err != nil {
				logger.WithError(err).Warn("Redis error during webhook rate limiting, allowing request")
				next.ServeHTTP(w, r)
				return
			}

			if count > 100 {
				logger.WithField("count", count).Warn("Webhook rate limit exceeded")
				http.Error(w, "Too many webhook requests", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// Build endpoints (implemented in handlers_build.go)

// PDF endpoints (implemented in handlers_build.go)

// Billing endpoints (implemented in handlers_billing.go)

// User endpoints (implemented in handlers_build.go)

// Webhook endpoints (implemented in handlers_billing.go)
