package user

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type CouponType string

const (
	CouponTypeDiscount CouponType = "discount"
	CouponTypeTrial    CouponType = "trial"
	CouponTypeUpgrade  CouponType = "upgrade"
)

type Coupon struct {
	ID          string     `json:"id"`
	Code        string     `json:"code"`
	Type        CouponType `json:"type"`
	PlanID      string     `json:"plan_id"`
	PlanName    string     `json:"plan_name"`
	MaxUses     int        `json:"max_uses"`
	UsedCount   int        `json:"used_count"`
	ExpiresAt   time.Time  `json:"expires_at"`
	DiscountPct int        `json:"discount_percent"`
	TrialDays   int        `json:"trial_days"`
	TierUpgrade string     `json:"tier_upgrade"`
	IsActive    bool       `json:"is_active"`
	OneTimeUse  bool       `json:"one_time_use"`
	CreatedAt   time.Time  `json:"created_at"`
}

type CouponStore struct {
	db *sql.DB
}

func NewCouponStore(db *sql.DB) (*CouponStore, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection required")
	}
	return &CouponStore{db: db}, nil
}

func (s *CouponStore) GetByCode(code string) (*Coupon, error) {
	if code == "" {
		return nil, fmt.Errorf("coupon code required")
	}

	var coupon Coupon
	err := s.db.QueryRow(`
		SELECT id, code, type, plan_id, plan_name, max_uses, used_count, expires_at, 
		       discount_percent, trial_days, tier_upgrade, is_active, one_time_use, created_at
		FROM coupons WHERE code = $1`, code).Scan(
		&coupon.ID, &coupon.Code, &coupon.Type, &coupon.PlanID, &coupon.PlanName,
		&coupon.MaxUses, &coupon.UsedCount, &coupon.ExpiresAt,
		&coupon.DiscountPct, &coupon.TrialDays, &coupon.TierUpgrade,
		&coupon.IsActive, &coupon.OneTimeUse, &coupon.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("coupon not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &coupon, nil
}

// IsValid validates a coupon
func (s *CouponStore) IsValid(coupon *Coupon) error {
	if !coupon.IsActive {
		return fmt.Errorf("coupon is inactive")
	}

	if time.Now().After(coupon.ExpiresAt) {
		return fmt.Errorf("coupon has expired")
	}

	if coupon.UsedCount >= coupon.MaxUses && coupon.MaxUses > 0 {
		return fmt.Errorf("coupon usage limit exceeded")
	}

	return nil
}

// ValidateForPlan checks if coupon is valid for a specific plan
func (s *CouponStore) ValidateForPlan(coupon *Coupon, planID string) error {
	if err := s.IsValid(coupon); err != nil {
		return err
	}

	// Ensure coupon is for the requested plan
	if coupon.PlanID != "" && coupon.PlanID != planID {
		return fmt.Errorf("coupon is not valid for this plan")
	}

	return nil
}

func (s *CouponStore) IncrementUsage(couponID string) error {
	if couponID == "" {
		return fmt.Errorf("coupon id required")
	}

	result, err := s.db.Exec(
		"UPDATE coupons SET used_count = used_count + 1 WHERE id = $1",
		couponID)
	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("coupon not found")
	}

	return nil
}

// Create creates a new coupon (admin function)
func (s *CouponStore) Create(coupon *Coupon) error {
	if coupon.Code == "" {
		return fmt.Errorf("coupon code required")
	}

	coupon.ID = uuid.New().String()
	coupon.CreatedAt = time.Now()
	if coupon.Type == "" {
		coupon.Type = CouponTypeDiscount
	}

	_, err := s.db.Exec(`
		INSERT INTO coupons (id, code, type, plan_id, plan_name, max_uses, used_count, expires_at,
		                     discount_percent, trial_days, tier_upgrade, is_active, one_time_use, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		coupon.ID, coupon.Code, coupon.Type, coupon.PlanID, coupon.PlanName, coupon.MaxUses,
		coupon.UsedCount, coupon.ExpiresAt, coupon.DiscountPct, coupon.TrialDays,
		coupon.TierUpgrade, coupon.IsActive, coupon.OneTimeUse, coupon.CreatedAt)

	if err != nil {
		return fmt.Errorf("insert failed: %w", err)
	}
	return nil
}

// GetByType retrieves all coupons of a specific type
func (s *CouponStore) GetByType(couponType CouponType) ([]*Coupon, error) {
	query := `
		SELECT id, code, type, plan_id, plan_name, max_uses, used_count, expires_at, 
		       discount_percent, trial_days, tier_upgrade, is_active, one_time_use, created_at
		FROM coupons WHERE type = $1 AND is_active = true
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, couponType)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	var coupons []*Coupon
	for rows.Next() {
		coupon := &Coupon{}
		err := rows.Scan(
			&coupon.ID, &coupon.Code, &coupon.Type, &coupon.PlanID, &coupon.PlanName,
			&coupon.MaxUses, &coupon.UsedCount, &coupon.ExpiresAt,
			&coupon.DiscountPct, &coupon.TrialDays, &coupon.TierUpgrade,
			&coupon.IsActive, &coupon.OneTimeUse, &coupon.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan failed: %w", err)
		}
		coupons = append(coupons, coupon)
	}

	return coupons, rows.Err()
}

// HasUserUsedCoupon checks if a user has already used a one-time coupon
func (s *CouponStore) HasUserUsedCoupon(userID, couponID string) (bool, error) {
	var count int
	err := s.db.QueryRow(
		"SELECT COUNT(*) FROM coupon_redemptions WHERE user_id = $1 AND coupon_id = $2",
		userID, couponID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("query failed: %w", err)
	}
	return count > 0, nil
}

// RecordRedemption records that a user used a coupon
func (s *CouponStore) RecordRedemption(userID, couponID string) error {
	_, err := s.db.Exec(
		"INSERT INTO coupon_redemptions (id, user_id, coupon_id, redeemed_at) VALUES ($1, $2, $3, $4)",
		uuid.New().String(), userID, couponID, time.Now())
	if err != nil {
		return fmt.Errorf("insert failed: %w", err)
	}
	return nil
}

// ValidateCoupon is a convenience function combining all validations
func ValidateCoupon(store *CouponStore, code string, planID string) (*Coupon, error) {
	coupon, err := store.GetByCode(code)
	if err != nil {
		return nil, fmt.Errorf("invalid coupon code")
	}

	if err := store.ValidateForPlan(coupon, planID); err != nil {
		return nil, err
	}

	return coupon, nil
}
