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
	DBPath            string
	MigrationsPath    string
	Logger            *logrus.Logger
	EnableWAL         bool
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
