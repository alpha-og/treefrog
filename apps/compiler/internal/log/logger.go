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
