package main

import (
	"os"
	"strings"

	"github.com/sirupsen/logrus"
)

// InitializeLogger sets up logging based on environment variables
func InitializeLogger() *logrus.Logger {
	logger := logrus.New()

	// Get log level from environment, default to INFO
	logLevelStr := os.Getenv("LOG_LEVEL")
	if logLevelStr == "" {
		logLevelStr = "INFO"
	}

	// Parse log level
	logLevel, err := logrus.ParseLevel(strings.ToLower(logLevelStr))
	if err != nil {
		logLevel = logrus.InfoLevel
	}
	logger.SetLevel(logLevel)

	// Get log format from environment, default to text for dev
	logFormat := os.Getenv("LOG_FORMAT")
	if logFormat == "" {
		logFormat = "text"
	}

	// Configure formatter
	if strings.ToLower(logFormat) == "json" {
		logger.SetFormatter(&logrus.JSONFormatter{
			TimestampFormat: "2006-01-02 15:04:05",
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

	// Output to stdout
	logger.SetOutput(os.Stdout)

	return logger
}

// Create a global logger instance
var Logger *logrus.Logger

func init() {
	Logger = InitializeLogger()
}
