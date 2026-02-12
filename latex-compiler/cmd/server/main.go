package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/alpha-og/treefrog-latex-compiler/pkg/auth"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/billing"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/build"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/cleanup"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/db"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/log"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/rate"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/user"
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
)

func init() {
	// Initialize logger early for startup logging
	logger = log.InitializeLogger("treefrog-saas-compiler")
}

func main() {
	// Initialize database with migrations
	logger.Info("Initializing database")
	var err error
	dbInstance, err = db.InitDB(db.InitConfig{
		DBPath:            os.Getenv("DATABASE_URL"),
		MigrationsPath:    os.Getenv("MIGRATIONS_PATH"),
		Logger:            logger,
		EnableWAL:         true,
		EnableForeignKeys: true,
	})
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize database")
	}
	defer dbInstance.Close()

	logger.Info("Database initialized successfully")

	// Initialize audit logger
	auditLogger = log.NewAuditLogger(logger, dbInstance)

	// Initialize Clerk
	logger.Info("Initializing Clerk authentication")
	if err := auth.InitClerk(os.Getenv("CLERK_SECRET_KEY"), dbInstance); err != nil {
		logger.WithError(err).Fatal("Failed to initialize Clerk")
	}

	// Initialize plan tier mapping from environment
	billing.InitPlanTierMapping()

	// Initialize Razorpay
	logger.Info("Initializing Razorpay billing")
	_ = billing.NewRazorpayService(
		os.Getenv("RAZORPAY_KEY_ID"),
		os.Getenv("RAZORPAY_KEY_SECRET"),
	)

	// Initialize Docker compiler (placeholder for now)
	logger.Info("Initializing Docker compiler")
	// compiler, err := build.NewDockerCompiler(
	//   "latex-compiler:latest",
	//   os.Getenv("COMPILER_WORKDIR"),
	// )

	// Initialize build queue with worker pool
	logger.Info("Initializing build queue")
	buildStore := build.NewStoreWithDB(dbInstance)
	numWorkers := 4
	if workers := os.Getenv("BUILD_WORKERS"); workers != "" {
		fmt.Sscanf(workers, "%d", &numWorkers)
	}
	buildQueue = build.NewQueue(numWorkers, nil, buildStore)
	logger.WithField("workers", numWorkers).Info("Build queue initialized")

	// Initialize user store
	logger.Info("Initializing user store")
	var err2 error
	userStore, err2 = user.NewStore(dbInstance)
	if err2 != nil {
		logger.WithError(err2).Fatal("Failed to initialize user store")
	}

	// Initialize cleanup engine
	logger.Info("Initializing cleanup engine")
	cleanupConfig := cleanup.Config{
		Interval:      time.Hour,
		TTL:           24 * time.Hour,
		GracePeriod:   time.Hour,
		WorkDir:       os.Getenv("COMPILER_WORKDIR"),
		DiskWarning:   80,
		DiskCritical:  90,
		DiskEmergency: 95,
	}
	cleanupEngine = cleanup.NewEngine(cleanupConfig, buildStore, userStore, logger)
	cleanupEngine.Start()

	// Initialize rate limiter
	logger.Info("Initializing rate limiter")
	rateLimiter, err := rate.NewLimiter()
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize rate limiter")
	}
	defer rateLimiter.Close()

	// Create router with middleware stack
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(correlationIDMiddleware)
	r.Use(loggingMiddleware(logger))
	r.Use(middleware.Recoverer)

	// CORS configuration
	allowedOrigins := []string{"*"}
	if origins := os.Getenv("ALLOWED_ORIGINS"); origins != "" {
		allowedOrigins = splitAndTrim(origins, ",")
	}
	logger.WithField("origins", allowedOrigins).Info("CORS configuration")

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Compiler-Token", "X-Request-ID"},
		ExposedHeaders:   []string{"X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public routes
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	// Protected routes
	r.Route("/api", func(r chi.Router) {
		r.Use(auth.AuthMiddleware())

		// Build endpoints with default rate limit
		r.With(rateLimiter.Middleware("build")).Post("/build", CreateBuildHandler(dbInstance))
		r.With(rateLimiter.Middleware("default")).Get("/build", ListBuildsHandler())
		r.With(rateLimiter.Middleware("default")).Get("/build/{id}", GetBuildHandler())
		r.With(rateLimiter.Middleware("status")).Get("/build/{id}/status", GetStatusHandler())
		r.With(rateLimiter.Middleware("default")).Get("/build/{id}/log", GetLogHandler())
		r.With(rateLimiter.Middleware("default")).Delete("/build/{id}", DeleteBuildHandler())

		// Delta-sync endpoints
		r.With(rateLimiter.Middleware("build")).Post("/builds/init", InitDeltaSyncHandler(dbInstance))
		r.With(rateLimiter.Middleware("build")).Post("/builds/{buildId}/upload", UploadDeltaSyncFilesHandler(dbInstance))

		// PDF and artifact endpoints with download rate limit
		r.With(rateLimiter.Middleware("default")).Get("/build/{id}/pdf/url", GetSignedPDFURLHandler())
		r.With(rateLimiter.Middleware("download")).Get("/build/{id}/pdf", ServePDFHandler())
		r.With(rateLimiter.Middleware("download")).Get("/build/{id}/synctex", ServeSyncTeXHandler())

		// Billing endpoints
		r.Post("/subscription/create", CreateSubscriptionHandler(dbInstance))
		r.Post("/subscription/cancel", CancelSubscriptionHandler())
		r.Get("/subscription/status", GetSubscriptionStatusHandler())

		// Coupon endpoints
		r.Post("/coupon/redeem", RedeemCouponHandler())

		// User endpoints
		r.Get("/user/me", GetCurrentUserHandler())
		r.Get("/user/usage", GetUserUsageHandler())
	})

	// Webhook endpoint (not authenticated - verified by signature)
	r.Post("/webhooks/razorpay", RazorpayWebhookHandler())

	// Start server
	srv := &http.Server{
		Addr:         ":9000",
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		logger.WithField("addr", srv.Addr).Info("Server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Error("Server error")
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutdown signal received")

	// Graceful shutdown
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
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

// Build endpoints (implemented in handlers_build.go)

// PDF endpoints (implemented in handlers_build.go)

// Billing endpoints (implemented in handlers_billing.go)

// User endpoints (implemented in handlers_build.go)

// Webhook endpoints (implemented in handlers_billing.go)
