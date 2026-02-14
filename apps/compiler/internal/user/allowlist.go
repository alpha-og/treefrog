package user

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type AllowlistEntry struct {
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	Tier      string     `json:"tier"`
	Reason    string     `json:"reason"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	IsActive  bool       `json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
	CreatedBy string     `json:"created_by"`
}

type AllowlistStore struct {
	db *sql.DB
}

func NewAllowlistStore(db *sql.DB) (*AllowlistStore, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection required")
	}
	return &AllowlistStore{db: db}, nil
}

func (s *AllowlistStore) GetByEmail(email string) (*AllowlistEntry, error) {
	if email == "" {
		return nil, fmt.Errorf("email required")
	}

	var entry AllowlistEntry
	err := s.db.QueryRow(`
		SELECT id, email, tier, reason, expires_at, is_active, created_at, created_by
		FROM allowlist WHERE email = $1 AND is_active = true`, email).Scan(
		&entry.ID, &entry.Email, &entry.Tier, &entry.Reason, &entry.ExpiresAt,
		&entry.IsActive, &entry.CreatedAt, &entry.CreatedBy)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("email not in allowlist")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	if entry.ExpiresAt != nil && time.Now().After(*entry.ExpiresAt) {
		return nil, fmt.Errorf("allowlist entry expired")
	}

	return &entry, nil
}

func (s *AllowlistStore) Create(entry *AllowlistEntry) error {
	if entry.Email == "" {
		return fmt.Errorf("email required")
	}

	entry.ID = uuid.New().String()
	entry.CreatedAt = time.Now()
	entry.IsActive = true
	if entry.Tier == "" {
		entry.Tier = "pro"
	}

	_, err := s.db.Exec(`
		INSERT INTO allowlist (id, email, tier, reason, expires_at, is_active, created_at, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		entry.ID, entry.Email, entry.Tier, entry.Reason, entry.ExpiresAt,
		entry.IsActive, entry.CreatedAt, entry.CreatedBy)

	if err != nil {
		return fmt.Errorf("insert failed: %w", err)
	}
	return nil
}

func (s *AllowlistStore) Remove(email string) error {
	_, err := s.db.Exec("UPDATE allowlist SET is_active = false WHERE email = $1", email)
	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}
	return nil
}

func (s *AllowlistStore) List() ([]*AllowlistEntry, error) {
	query := `
		SELECT id, email, tier, reason, expires_at, is_active, created_at, created_by
		FROM allowlist WHERE is_active = true
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	var entries []*AllowlistEntry
	for rows.Next() {
		entry := &AllowlistEntry{}
		err := rows.Scan(
			&entry.ID, &entry.Email, &entry.Tier, &entry.Reason, &entry.ExpiresAt,
			&entry.IsActive, &entry.CreatedAt, &entry.CreatedBy)
		if err != nil {
			return nil, fmt.Errorf("scan failed: %w", err)
		}
		entries = append(entries, entry)
	}

	return entries, rows.Err()
}

type Trial struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	Tier        string     `json:"tier"`
	StartedAt   time.Time  `json:"started_at"`
	EndsAt      time.Time  `json:"ends_at"`
	CouponCode  string     `json:"coupon_code,omitempty"`
	ConvertedAt *time.Time `json:"converted_at,omitempty"`
}

type TrialStore struct {
	db *sql.DB
}

func NewTrialStore(db *sql.DB) (*TrialStore, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection required")
	}
	return &TrialStore{db: db}, nil
}

func (s *TrialStore) GetActiveByUser(userID string) (*Trial, error) {
	var trial Trial
	err := s.db.QueryRow(`
		SELECT id, user_id, tier, started_at, ends_at, coupon_code, converted_at
		FROM trials WHERE user_id = $1 AND ends_at > $2 AND converted_at IS NULL
		ORDER BY ends_at DESC LIMIT 1`, userID, time.Now()).Scan(
		&trial.ID, &trial.UserID, &trial.Tier, &trial.StartedAt,
		&trial.EndsAt, &trial.CouponCode, &trial.ConvertedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no active trial")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &trial, nil
}

func (s *TrialStore) Create(userID, tier string, durationDays int, couponCode string) (*Trial, error) {
	now := time.Now()
	trial := &Trial{
		ID:         uuid.New().String(),
		UserID:     userID,
		Tier:       tier,
		StartedAt:  now,
		EndsAt:     now.AddDate(0, 0, durationDays),
		CouponCode: couponCode,
	}

	_, err := s.db.Exec(`
		INSERT INTO trials (id, user_id, tier, started_at, ends_at, coupon_code)
		VALUES ($1, $2, $3, $4, $5, $6)`,
		trial.ID, trial.UserID, trial.Tier, trial.StartedAt,
		trial.EndsAt, trial.CouponCode)

	if err != nil {
		return nil, fmt.Errorf("insert failed: %w", err)
	}

	return trial, nil
}

func (s *TrialStore) Convert(trialID string) error {
	now := time.Now()
	_, err := s.db.Exec(
		"UPDATE trials SET converted_at = $1 WHERE id = $2",
		now, trialID)
	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}
	return nil
}

func (s *TrialStore) HasUsedTrial(userID string) (bool, error) {
	var count int
	err := s.db.QueryRow(
		"SELECT COUNT(*) FROM trials WHERE user_id = $1",
		userID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("query failed: %w", err)
	}
	return count > 0, nil
}
