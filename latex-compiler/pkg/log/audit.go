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
	Action       string // e.g., "build_created", "subscription_upgraded"
	ResourceType string // e.g., "build", "subscription"
	ResourceID   string
	Details      string // JSON encoded details
	IPAddress    string
	UserAgent    string
	Status       string // "success" or "failure"
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
		"audit_id":      entry.ID,
		"user_id":       entry.UserID,
		"action":        entry.Action,
		"resource_type": entry.ResourceType,
		"resource_id":   entry.ResourceID,
		"status":        entry.Status,
		"ip_address":    entry.IPAddress,
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
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		entry.ID, entry.UserID, entry.Action, entry.ResourceType, entry.ResourceID, entry.Details,
		entry.IPAddress, entry.UserAgent, entry.Status, entry.ErrorMessage, entry.CreatedAt)

	return err
}
