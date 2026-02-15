package db

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/sirupsen/logrus"
)

const (
	MaxOpenConnections = 25
	MaxIdleConnections = 5
)

type InitConfig struct {
	DatabaseURL string
	Logger      *logrus.Logger
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

	logger.Info("Opening PostgreSQL connection to Supabase")

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

	logger.Info("Database connection established successfully")
	return db, nil
}
