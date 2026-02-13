package db

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/sirupsen/logrus"
)

const (
	MaxOpenConnections = 25
	MaxIdleConnections = 5
)

type InitConfig struct {
	DatabaseURL    string
	MigrationsPath string
	Logger         *logrus.Logger
}

func InitDB(config InitConfig) (*sql.DB, error) {
	logger := config.Logger
	if logger == nil {
		logger = logrus.New()
	}

	dbURL := config.DatabaseURL
	if dbURL == "" {
		dbURL = os.Getenv("DATABASE_URL")
	}
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	migrationsPath := config.MigrationsPath
	if migrationsPath == "" {
		migrationsPath = "./migrations"
	}

	logger.Info("Opening PostgreSQL connection")

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		logger.WithError(err).Error("Failed to open database")
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(MaxOpenConnections)
	db.SetMaxIdleConns(MaxIdleConnections)

	if err := db.Ping(); err != nil {
		logger.WithError(err).Error("Failed to ping database")
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	logger.WithField("migrations_path", migrationsPath).Info("Running database migrations")

	if err := runMigrations(db, migrationsPath, logger); err != nil {
		logger.WithError(err).Error("Failed to run migrations")
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	logger.Info("Database initialized successfully")
	return db, nil
}

func runMigrations(db *sql.DB, migrationsPath string, logger *logrus.Logger) error {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://"+migrationsPath,
		"postgres", driver)
	if err != nil {
		return fmt.Errorf("failed to initialize migrations: %w", err)
	}

	version, _, _ := m.Version()
	logger.WithField("current_version", version).Debug("Current migration version")

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migration failed: %w", err)
	}

	version, _, _ = m.Version()
	logger.WithField("new_version", version).Info("Migrations completed")

	return nil
}
