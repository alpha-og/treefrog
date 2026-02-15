package user

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                     string     `json:"id"`
	Email                  string     `json:"email"`
	Name                   string     `json:"name"`
	IsAdmin                bool       `json:"is_admin"`
	RazorpayCustomerID     string     `json:"razorpay_customer_id,omitempty"`
	RazorpaySubscriptionID string     `json:"razorpay_subscription_id,omitempty"`
	Tier                   string     `json:"tier"`
	StorageUsedBytes       int64      `json:"storage_used_bytes"`
	SubscriptionCanceledAt *time.Time `json:"subscription_canceled_at,omitempty"`
	SubscriptionPaused     bool       `json:"subscription_paused"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

// nullableString converts sql.NullString to string, returning empty string for NULL
func nullableString(ns sql.NullString) string {
	if !ns.Valid {
		return ""
	}
	return ns.String
}

// nullIfEmpty returns nil for empty strings, otherwise returns the string
func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) (*Store, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection required")
	}
	return &Store{db: db}, nil
}

func (s *Store) GetByID(id string) (*User, error) {
	if id == "" {
		return nil, fmt.Errorf("id required")
	}

	var user User
	var razorpayCustomerID, razorpaySubscriptionID sql.NullString
	err := s.db.QueryRow(`
		SELECT id, email, name, is_admin, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE id = $1`, id).Scan(
		&user.ID, &user.Email, &user.Name, &user.IsAdmin, &razorpayCustomerID,
		&razorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	user.RazorpayCustomerID = nullableString(razorpayCustomerID)
	user.RazorpaySubscriptionID = nullableString(razorpaySubscriptionID)

	return &user, nil
}

func (s *Store) GetByEmail(email string) (*User, error) {
	if email == "" {
		return nil, fmt.Errorf("email required")
	}

	var user User
	var razorpayCustomerID, razorpaySubscriptionID sql.NullString
	err := s.db.QueryRow(`
		SELECT id, email, name, is_admin, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE email = $1`, email).Scan(
		&user.ID, &user.Email, &user.Name, &user.IsAdmin, &razorpayCustomerID,
		&razorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	user.RazorpayCustomerID = nullableString(razorpayCustomerID)
	user.RazorpaySubscriptionID = nullableString(razorpaySubscriptionID)

	return &user, nil
}

func (s *Store) GetByRazorpayCustomerID(customerID string) (*User, error) {
	if customerID == "" {
		return nil, fmt.Errorf("razorpay_customer_id required")
	}

	var user User
	var razorpayCustomerID, razorpaySubscriptionID sql.NullString
	err := s.db.QueryRow(`
		SELECT id, email, name, is_admin, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE razorpay_customer_id = $1`, customerID).Scan(
		&user.ID, &user.Email, &user.Name, &user.IsAdmin, &razorpayCustomerID,
		&razorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	user.RazorpayCustomerID = nullableString(razorpayCustomerID)
	user.RazorpaySubscriptionID = nullableString(razorpaySubscriptionID)

	return &user, nil
}

func (s *Store) Create(user *User) error {
	if user.Email == "" {
		return fmt.Errorf("email required")
	}

	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	if user.Tier == "" {
		user.Tier = "free"
	}

	_, err := s.db.Exec(`
		INSERT INTO users (id, email, name, is_admin, razorpay_customer_id, razorpay_subscription_id,
		                   tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		                   created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		user.ID, user.Email, user.Name, user.IsAdmin, nullIfEmpty(user.RazorpayCustomerID),
		nullIfEmpty(user.RazorpaySubscriptionID), user.Tier, user.StorageUsedBytes,
		user.SubscriptionCanceledAt, user.SubscriptionPaused,
		user.CreatedAt, user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("insert failed: %w", err)
	}
	return nil
}

func (s *Store) Update(user *User) error {
	if user.ID == "" {
		return fmt.Errorf("user id required")
	}

	user.UpdatedAt = time.Now()

	_, err := s.db.Exec(`
		UPDATE users SET
			email = $1, name = $2, is_admin = $3, razorpay_customer_id = $4, razorpay_subscription_id = $5,
			tier = $6, storage_used_bytes = $7, subscription_canceled_at = $8,
			subscription_paused = $9, updated_at = $10
		WHERE id = $11`,
		user.Email, user.Name, user.IsAdmin, nullIfEmpty(user.RazorpayCustomerID), nullIfEmpty(user.RazorpaySubscriptionID),
		user.Tier, user.StorageUsedBytes, user.SubscriptionCanceledAt,
		user.SubscriptionPaused, user.UpdatedAt, user.ID)

	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}
	return nil
}

func (s *Store) GetOrCreate(id, email, name string) (*User, error) {
	if id == "" || email == "" {
		return nil, fmt.Errorf("id and email required")
	}

	user, err := s.GetByID(id)
	if err == nil {
		return user, nil
	}

	user = &User{
		ID:    id,
		Email: email,
		Name:  name,
		Tier:  "free",
	}

	if err := s.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (s *Store) GetAll() ([]*User, error) {
	query := `
		SELECT id, email, name, is_admin, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users
		WHERE subscription_canceled_at IS NULL
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	var users []*User
	for rows.Next() {
		user := &User{}
		var razorpayCustomerID, razorpaySubscriptionID sql.NullString
		err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.IsAdmin,
			&razorpayCustomerID, &razorpaySubscriptionID, &user.Tier,
			&user.StorageUsedBytes, &user.SubscriptionCanceledAt, &user.SubscriptionPaused,
			&user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan failed: %w", err)
		}
		user.RazorpayCustomerID = nullableString(razorpayCustomerID)
		user.RazorpaySubscriptionID = nullableString(razorpaySubscriptionID)
		users = append(users, user)
	}

	return users, rows.Err()
}
