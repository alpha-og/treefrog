package logging

import (
	"os"
	"strings"

	"github.com/sirupsen/logrus"
)

func InitializeLogger(serviceName string) *logrus.Logger {
	logger := logrus.New()

	logLevelStr := os.Getenv("LOG_LEVEL")
	if logLevelStr == "" {
		logLevelStr = "info"
	}

	logLevel, err := logrus.ParseLevel(strings.ToLower(logLevelStr))
	if err != nil {
		logLevel = logrus.InfoLevel
	}
	logger.SetLevel(logLevel)

	logger.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime:  "timestamp",
			logrus.FieldKeyLevel: "level",
			logrus.FieldKeyMsg:   "message",
		},
	})

	logger.SetReportCaller(true)

	if serviceName != "" {
		logger = logger.WithField("service", serviceName).Logger
	}

	return logger
}

func NewAuditLogger(logger *logrus.Logger) *logrus.Logger {
	return logger.WithField("component", "audit").Logger
}
