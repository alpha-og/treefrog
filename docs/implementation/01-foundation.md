# Phase 1: Foundation

## Overview

This phase covers:
- Logging setup (integrated with existing logrus)
- Clerk authentication setup
- Database schema and initialization with golang-migrate
- User management
- Audit logging

## Logging Strategy

### Integration with Existing Logrus

The SaaS backend integrates with Treefrog's existing **logrus** logging infrastructure for consistency across all services:

**Dependencies:**
```bash
go get github.com/sirupsen/logrus
```

**Logger Initialization (`pkg/log/logger.go`)**

Extends the existing Treefrog logging patterns:

```go
package log

import (
	"os"
	"strings"

	"github.com/sirupsen/logrus"
)

// InitializeLogger sets up structured logging based on environment
func InitializeLogger(serviceName string) *logrus.Logger {
	logger := logrus.New()

	// Get log level from environment
	logLevelStr := os.Getenv("LOG_LEVEL")
	if logLevelStr == "" {
		logLevelStr = "info"
	}

	logLevel, err := logrus.ParseLevel(strings.ToLower(logLevelStr))
	if err != nil {
		logLevel = logrus.InfoLevel
	}
	logger.SetLevel(logLevel)

	// Get log format from environment
	logFormat := os.Getenv("LOG_FORMAT")
	if logFormat == "" {
		logFormat = "json"
	}

	// Configure formatter
	if strings.ToLower(logFormat) == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02T15:04:05Z07:00",
			PrettyPrint:     false,
		})
	} else {
		logger.SetFormatter(&logrus.TextFormatter{
			FullTimestamp:    true,
			TimestampFormat:  "2006-01-02 15:04:05",
			ForceColors:      true,
			QuoteEmptyFields: true,
		})
	}

	logger.SetOutput(os.Stdout)

	// Add service name to all log entries
	logger = logger.WithField("service", serviceName).Logger

	return logger
}

// GetLogger returns a logger with context fields (module/component name)
func GetLogger(name string) *logrus.Entry {
	return logrus.WithField("component", name)
}
```

**Usage in Application:**
```go
package main

import (
	"github.com/sirupsen/logrus"
	"yourmodule/pkg/log"
)

var logger *logrus.Logger

func init() {
	logger = log.InitializeLogger("treefrog-saas-compiler")
}

func main() {
	logger.WithFields(logrus.Fields{
		"event": "startup",
		"version": "1.0.0",
	}).Info("Server starting")

	// Get component logger
	authLogger := log.GetLogger("auth")
	authLogger.Info("Auth initialized")
}
```

### Audit Logging

For compliance and security tracking, audit logs are stored in both the logrus stream and database:

**Audit Logger (`pkg/log/audit.go`)**

```go
package log

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

type AuditLogger struct {
	logger *logrus.Logger
	db     *sql.DB
}

type AuditEntry struct {
	ID           string
	UserID       string
	Action       string       // e.g., "build_created", "subscription_upgraded"
	ResourceType string       // e.g., "build", "subscription"
	ResourceID   string
	Details      string       // JSON encoded details
	IPAddress    string
	UserAgent    string
	Status       string       // "success" or "failure"
	ErrorMessage string
	CreatedAt    time.Time
}

func NewAuditLogger(logger *logrus.Logger, db *sql.DB) *AuditLogger {
	return &AuditLogger{
		logger: logger,
		db:     db,
	}
}

// Log records an audit event to both logrus and database
func (al *AuditLogger) Log(entry AuditEntry) error {
	entry.ID = uuid.New().String()
	entry.CreatedAt = time.Now()

	// Log to logrus
	fields := logrus.Fields{
		"audit_id":        entry.ID,
		"user_id":         entry.UserID,
		"action":          entry.Action,
		"resource_type":   entry.ResourceType,
		"resource_id":     entry.ResourceID,
		"status":          entry.Status,
		"ip_address":      entry.IPAddress,
	}
	if entry.ErrorMessage != "" {
		fields["error"] = entry.ErrorMessage
		al.logger.WithFields(fields).Warn("Audit event: " + entry.Action)
	} else {
		al.logger.WithFields(fields).Info("Audit event: " + entry.Action)
	}

	// Store in database
	_, err := al.db.Exec(`
		INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, status, error_message, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		entry.ID, entry.UserID, entry.Action, entry.ResourceType, entry.ResourceID, entry.Details,
		entry.IPAddress, entry.UserAgent, entry.Status, entry.ErrorMessage, entry.CreatedAt)

	return err
}
```

**Usage:**
```go
auditLogger.Log(AuditEntry{
	UserID:       userID,
	Action:       "build_created",
	ResourceType: "build",
	ResourceID:   buildID,
	Details:      `{"engine":"pdflatex","main_file":"main.tex"}`,
	IPAddress:    r.RemoteAddr,
	UserAgent:    r.UserAgent(),
	Status:       "success",
})
```

**Environment Variables for Logging:**
```bash
LOG_LEVEL=info        # debug, info, warn, error
LOG_FORMAT=json       # json or text
```

## User Management & Authentication

### Clerk Integration

#### Installation

```bash
cd latex-compiler
go get github.com/clerk/clerk-sdk-go/v2
```

#### Environment Variables

```bash
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
```

#### Middleware Setup (`pkg/auth/clerk.go`)

```go
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
	claims, ok := clerkhttp.SessionClaimsFromContext(r.Context())
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
	claims, ok := clerkhttp.SessionClaimsFromContext(r.Context())
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
```

## Database Schema & Migrations

### Migration Strategy

The SaaS backend uses **golang-migrate/migrate** for database schema versioning and management. This ensures:
- Safe, reproducible schema changes across environments
- Easy rollback capability
- Version control of database state
- Multi-environment consistency

**Installation:**
```bash
# Install golang-migrate CLI
go install -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Install migration library
go get -u github.com/golang-migrate/migrate/v4
go get -u github.com/golang-migrate/migrate/v4/database/sqlite3
go get -u github.com/golang-migrate/migrate/v4/source/file
```

**Directory Structure:**
```
latex-compiler/
├── migrations/
│   ├── 000001_initial_schema.up.sql
│   ├── 000001_initial_schema.down.sql
│   ├── 000002_add_audit_logs.up.sql
│   └── 000002_add_audit_logs.down.sql
├── pkg/
│   └── db/
│       ├── init.go
│       └── migrations.go
└── ...
```

### Migration Files

**Migration 1: Initial Schema (`migrations/000001_initial_schema.up.sql`)**

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    clerk_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT,
    tier TEXT DEFAULT 'free',
    storage_used_bytes INTEGER DEFAULT 0,
    subscription_canceled_at TIMESTAMP,
    subscription_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_razorpay_customer ON users(razorpay_customer_id);

-- Builds table (FIXED: uses users.id, not users.clerk_id)
CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    engine TEXT DEFAULT 'pdflatex',
    main_file TEXT,
    dir_path TEXT,
    pdf_path TEXT,
    synctex_path TEXT,
    build_log TEXT,
    error_message TEXT,
    shell_escape BOOLEAN DEFAULT FALSE,
    storage_bytes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    last_accessed_at TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_builds_user ON builds(user_id);
CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_expires ON builds(expires_at);
CREATE INDEX idx_builds_created ON builds(created_at);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    plan_id TEXT NOT NULL,
    plan_name TEXT,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    discount_percent INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coupons_code ON coupons(code);
```

**Rollback Script (`migrations/000001_initial_schema.down.sql`)**

```sql
DROP INDEX IF EXISTS idx_coupons_code;
DROP TABLE IF EXISTS coupons;
DROP INDEX IF EXISTS idx_builds_created;
DROP INDEX IF EXISTS idx_builds_expires;
DROP INDEX IF EXISTS idx_builds_status;
DROP INDEX IF EXISTS idx_builds_user;
DROP TABLE IF EXISTS builds;
DROP INDEX IF EXISTS idx_users_razorpay_customer;
DROP INDEX IF EXISTS idx_users_clerk_id;
DROP TABLE IF EXISTS users;
```

**Migration 2: Audit Logs (`migrations/000002_add_audit_logs.up.sql`)**

```sql
-- Audit logs table for compliance and security tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

**Rollback Script (`migrations/000002_add_audit_logs.down.sql`)**

```sql
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_user;
DROP TABLE IF EXISTS audit_logs;
```

### Database Initialization (`pkg/db/init.go`)

Integrates with golang-migrate/migrate and logrus logging:

```go
package db

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite3"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/mattn/go-sqlite3"
	"github.com/sirupsen/logrus"
)

const (
	// Database configuration
	MaxOpenConnections = 25
	MaxIdleConnections = 5
)

type InitConfig struct {
	DBPath          string
	MigrationsPath  string
	Logger          *logrus.Logger
	EnableWAL       bool
	EnableForeignKeys bool
}

func InitDB(config InitConfig) (*sql.DB, error) {
	logger := config.Logger
	if logger == nil {
		logger = logrus.New()
	}

	dbPath := config.DBPath
	if dbPath == "" {
		dbPath = os.Getenv("DATABASE_URL")
		if dbPath == "" {
			dbPath = "./data/treefrog.db"
		}
	}

	migrationsPath := config.MigrationsPath
	if migrationsPath == "" {
		migrationsPath = "./migrations"
	}

	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(dbPath), 0755); err != nil {
		logger.WithError(err).Error("Failed to create database directory")
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	logger.WithField("path", dbPath).Info("Opening database connection")

	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		logger.WithError(err).Error("Failed to open database")
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Set connection pool parameters
	db.SetMaxOpenConns(MaxOpenConnections)
	db.SetMaxIdleConns(MaxIdleConnections)

	// Test connection
	if err := db.Ping(); err != nil {
		logger.WithError(err).Error("Failed to ping database")
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Enable WAL mode for better concurrency (SQLite specific optimization)
	if config.EnableWAL {
		if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
			logger.WithError(err).Warn("Failed to set WAL mode")
		} else {
			logger.Debug("WAL mode enabled")
		}
	}

	// Enable foreign keys
	if config.EnableForeignKeys {
		if _, err := db.Exec("PRAGMA foreign_keys=ON"); err != nil {
			logger.WithError(err).Warn("Failed to enable foreign keys")
		} else {
			logger.Debug("Foreign keys enabled")
		}
	}

	// Run migrations using golang-migrate
	logger.WithFields(logrus.Fields{
		"migrations_path": migrationsPath,
	}).Info("Running database migrations")

	if err := runMigrations(db, dbPath, migrationsPath, logger); err != nil {
		logger.WithError(err).Error("Failed to run migrations")
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	logger.WithField("path", dbPath).Info("Database initialized successfully")
	return db, nil
}

// runMigrations runs pending migrations using golang-migrate
func runMigrations(db *sql.DB, dbPath, migrationsPath string, logger *logrus.Logger) error {
	driver, err := sqlite3.WithInstance(db, &sqlite3.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsPath,
		"sqlite3", driver)
	if err != nil {
		return fmt.Errorf("failed to initialize migrations: %w", err)
	}

	// Get current version
	version, _, _ := m.Version()
	logger.WithField("current_version", version).Debug("Current migration version")

	// Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration failed: %w", err)
	}

	version, _, _ = m.Version()
	logger.WithField("new_version", version).Info("Migrations completed")

	return driver.Close()
}
```

**Environment Variables for Migrations:**
```bash
DATABASE_URL=./data/treefrog.db
MIGRATIONS_PATH=./migrations
LOG_LEVEL=info
LOG_FORMAT=json  # Use JSON for structured logging
```

## User Store (`pkg/user/store.go`)

```go
package user

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                       string    `json:"id"`
	ClerkID                  string    `json:"clerk_id"`
	Email                    string    `json:"email"`
	Name                     string    `json:"name"`
	RazorpayCustomerID      string    `json:"razorpay_customer_id,omitempty"`
	RazorpaySubscriptionID  string    `json:"razorpay_subscription_id,omitempty"`
	Tier                     string    `json:"tier"`
	StorageUsedBytes         int64     `json:"storage_used_bytes"`
	SubscriptionCanceledAt   *time.Time `json:"subscription_canceled_at,omitempty"`
	SubscriptionPaused       bool      `json:"subscription_paused"`
	CreatedAt                time.Time `json:"created_at"`
	UpdatedAt                time.Time `json:"updated_at"`
}

type Store struct {
	db *sql.DB
}

// NewStore returns a new user store (Issue #3 - FIXED error handling)
func NewStore(db *sql.DB) (*Store, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection required")
	}
	return &Store{db: db}, nil
}

// GetByClerkID retrieves user by Clerk ID
func (s *Store) GetByClerkID(clerkID string) (*User, error) {
	if clerkID == "" {
		return nil, fmt.Errorf("clerk_id required")
	}

	var user User
	err := s.db.QueryRow(`
		SELECT id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE clerk_id = ?`, clerkID).Scan(
		&user.ID, &user.ClerkID, &user.Email, &user.Name, &user.RazorpayCustomerID,
		&user.RazorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &user, nil
}

// GetByID retrieves user by internal ID
func (s *Store) GetByID(id string) (*User, error) {
	if id == "" {
		return nil, fmt.Errorf("id required")
	}

	var user User
	err := s.db.QueryRow(`
		SELECT id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE id = ?`, id).Scan(
		&user.ID, &user.ClerkID, &user.Email, &user.Name, &user.RazorpayCustomerID,
		&user.RazorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &user, nil
}

// GetByRazorpayCustomerID retrieves user by Razorpay customer ID
func (s *Store) GetByRazorpayCustomerID(customerID string) (*User, error) {
	if customerID == "" {
		return nil, fmt.Errorf("razorpay_customer_id required")
	}

	var user User
	err := s.db.QueryRow(`
		SELECT id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE razorpay_customer_id = ?`, customerID).Scan(
		&user.ID, &user.ClerkID, &user.Email, &user.Name, &user.RazorpayCustomerID,
		&user.RazorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &user, nil
}

// Create creates a new user
func (s *Store) Create(user *User) error {
	if user.ClerkID == "" || user.Email == "" {
		return fmt.Errorf("clerk_id and email required")
	}

	user.ID = uuid.New().String()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	if user.Tier == "" {
		user.Tier = "free"
	}

	_, err := s.db.Exec(`
		INSERT INTO users (id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
		                   tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		                   created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.ClerkID, user.Email, user.Name, user.RazorpayCustomerID,
		user.RazorpaySubscriptionID, user.Tier, user.StorageUsedBytes,
		user.SubscriptionCanceledAt, user.SubscriptionPaused,
		user.CreatedAt, user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("insert failed: %w", err)
	}
	return nil
}

// Update updates an existing user
func (s *Store) Update(user *User) error {
	if user.ID == "" {
		return fmt.Errorf("user id required")
	}

	user.UpdatedAt = time.Now()

	_, err := s.db.Exec(`
		UPDATE users SET
			email = ?, name = ?, razorpay_customer_id = ?, razorpay_subscription_id = ?,
			tier = ?, storage_used_bytes = ?, subscription_canceled_at = ?,
			subscription_paused = ?, updated_at = ?
		WHERE id = ?`,
		user.Email, user.Name, user.RazorpayCustomerID, user.RazorpaySubscriptionID,
		user.Tier, user.StorageUsedBytes, user.SubscriptionCanceledAt,
		user.SubscriptionPaused, user.UpdatedAt, user.ID)

	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}
	return nil
}

// GetOrCreate gets or creates a user
func (s *Store) GetOrCreate(clerkID, email, name string) (*User, error) {
	if clerkID == "" || email == "" {
		return nil, fmt.Errorf("clerk_id and email required")
	}

	user, err := s.GetByClerkID(clerkID)
	if err == nil {
		return user, nil
	}

	// Create new user
	user = &User{
		ClerkID: clerkID,
		Email:   email,
		Name:    name,
		Tier:    "free",
	}

	if err := s.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}
```

## Server Setup (`cmd/server/main.go`)

Integrates logging, migrations, and database initialization:

```go
package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/athulanoop/treefrog/latex-compiler/pkg/auth"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/billing"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/build"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/cleanup"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/db"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/log"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/rate"
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
	cleanupEngine *cleanup.Engine
)

func init() {
	// Initialize logger early for startup logging
	logger = log.InitializeLogger("treefrog-saas-compiler")
}

func main() {
	ctx := context.Background()

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
	if err := auth.InitClerk(os.Getenv("CLERK_SECRET_KEY")); err != nil {
		logger.WithError(err).Fatal("Failed to initialize Clerk")
	}

	// Initialize Razorpay
	logger.Info("Initializing Razorpay billing")
	razorpayService := billing.NewRazorpayService(
		os.Getenv("RAZORPAY_KEY_ID"),
		os.Getenv("RAZORPAY_KEY_SECRET"),
	)

	// Initialize Docker compiler
	logger.Info("Initializing Docker compiler")
	compiler, err := build.NewDockerCompiler(
		"treefrog-local-latex-compiler:latest",
		os.Getenv("COMPILER_WORKDIR"),
	)
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize Docker compiler")
	}

	// Initialize build queue with worker pool
	logger.Info("Initializing build queue")
	buildStore := build.NewStore()
	numWorkers := 4
	if workers := os.Getenv("BUILD_WORKERS"); workers != "" {
		fmt.Sscanf(workers, "%d", &numWorkers)
	}
	buildQueue = build.NewQueue(numWorkers, compiler, buildStore)
	logger.WithField("workers", numWorkers).Info("Build queue initialized")

	// Initialize cleanup engine
	logger.Info("Initializing cleanup engine")
	cleanupConfig := cleanup.Config{
		Interval:       time.Hour,
		TTL:            24 * time.Hour,
		GracePeriod:    time.Hour,
		WorkDir:        os.Getenv("COMPILER_WORKDIR"),
		DiskWarning:    80,
		DiskCritical:   90,
		DiskEmergency:  95,
	}
	cleanupEngine = cleanup.NewEngine(cleanupConfig)
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
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Compiler-Token"},
		MaxAge:           300,
	}))

	// Public routes
	r.Get("/health", healthHandler)
	r.Get("/ready", readyHandler)

	// Protected routes
	protected := r.Route("/api", func(r chi.Router) {
		r.Use(auth.AuthMiddleware())
		r.Use(rateLimiter.Middleware("default"))

		// Build endpoints
		r.Post("/build", createBuildHandler)
		r.Get("/build", listBuildsHandler)
		r.Get("/build/{id}", getBuildHandler)
		r.Get("/build/{id}/status", getStatusHandler)
		r.Get("/build/{id}/log", getLogHandler)
		r.Delete("/build/{id}", deleteBuildHandler)

		// PDF and artifact endpoints
		r.Get("/build/{id}/pdf/url", getSignedPDFURLHandler)
		r.Get("/build/{id}/pdf", servePDFHandler)
		r.Get("/build/{id}/synctex", serveSyncTeXHandler)

		// Billing endpoints
		r.Post("/subscription/create", createSubscriptionHandler)
		r.Post("/subscription/cancel", cancelSubscriptionHandler)
		r.Get("/subscription/status", getSubscriptionStatusHandler)

		// Coupon endpoints
		r.Post("/coupon/redeem", redeemCouponHandler)

		// User endpoints
		r.Get("/user/usage", getUserUsageHandler)
	})

	// Webhook endpoint (not authenticated - verified by signature)
	r.Post("/webhooks/razorpay", razorpayWebhookHandler)

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

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Ready"))
}
```

## Frontend Integration

### Clerk React Setup

```tsx
// frontend/src/auth/ClerkProvider.tsx
import { ClerkProvider } from '@clerk/clerk-react';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      routerPushCurrentTab={true}
      appearance={{
        theme: 'dark',
        variables: {
          colorPrimary: '#3b82f6',
          colorText: '#1f2937',
          colorBackground: '#ffffff',
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
}
```

### Auth Hook

```tsx
// frontend/src/hooks/useAuth.ts
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';

export function useAuth() {
  const { isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const { user } = useUser();

  const authFetch = async (url: string, options?: RequestInit) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  };

  return {
    isSignedIn,
    userId,
    user,
    getToken,
    signOut,
    authFetch,
  };
}
```

## Environment Variables Summary

```bash
# Clerk Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Database & Migrations
DATABASE_URL=./data/treefrog.db
MIGRATIONS_PATH=./migrations

# Compiler Service
COMPILER_WORKDIR=/tmp/treefrog-builds
COMPILER_PORT=9000
BUILD_WORKERS=4

# Logging
LOG_LEVEL=info                # debug, info, warn, error
LOG_FORMAT=json               # json or text

# Security
COMPILER_SIGNING_KEY=<32-byte-random-string>
```

## Tasks Checklist

- [ ] Install dependencies (logrus, golang-migrate, go-sqlite3)
- [ ] Create database directory structure
- [ ] Create migrations directory and SQL migration files
- [ ] Implement database initialization with migrations
- [ ] Implement logrus logging integration
- [ ] Implement audit logging system
- [ ] Implement Clerk middleware
- [ ] Set up protected routes with chi router
- [ ] Create user context utilities
- [ ] Create user store with proper error handling
- [ ] Implement user creation on first Clerk login
- [ ] Set up graceful shutdown sequence
- [ ] Test authentication flow end-to-end
- [ ] Test database migrations (up and down)

## Next Steps

Proceed to [Phase 2: Payments](02-payments.md) to add Razorpay integration.
