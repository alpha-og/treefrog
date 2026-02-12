package user

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                     string     `json:"id"`
	ClerkID                string     `json:"clerk_id"`
	Email                  string     `json:"email"`
	Name                   string     `json:"name"`
	RazorpayCustomerID     string     `json:"razorpay_customer_id,omitempty"`
	RazorpaySubscriptionID string     `json:"razorpay_subscription_id,omitempty"`
	Tier                   string     `json:"tier"`
	StorageUsedBytes       int64      `json:"storage_used_bytes"`
	SubscriptionCanceledAt *time.Time `json:"subscription_canceled_at,omitempty"`
	SubscriptionPaused     bool       `json:"subscription_paused"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type Store struct {
	db *sql.DB
}

// NewStore returns a new user store (Issue #3 - FIXED error handling)
func NewStore(db *sql.DB) (*Store, error) {
	if db == nil {
		return nil, fmt.Errorf("database connection required")
	}
	return &Store{db: db}, nil
}

// GetByClerkID retrieves user by Clerk ID
func (s *Store) GetByClerkID(clerkID string) (*User, error) {
	if clerkID == "" {
		return nil, fmt.Errorf("clerk_id required")
	}

	var user User
	err := s.db.QueryRow(`
		SELECT id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE clerk_id = ?`, clerkID).Scan(
		&user.ID, &user.ClerkID, &user.Email, &user.Name, &user.RazorpayCustomerID,
		&user.RazorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &user, nil
}

// GetByID retrieves user by internal ID
func (s *Store) GetByID(id string) (*User, error) {
	if id == "" {
		return nil, fmt.Errorf("id required")
	}

	var user User
	err := s.db.QueryRow(`
		SELECT id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE id = ?`, id).Scan(
		&user.ID, &user.ClerkID, &user.Email, &user.Name, &user.RazorpayCustomerID,
		&user.RazorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &user, nil
}

// GetByRazorpayCustomerID retrieves user by Razorpay customer ID
func (s *Store) GetByRazorpayCustomerID(customerID string) (*User, error) {
	if customerID == "" {
		return nil, fmt.Errorf("razorpay_customer_id required")
	}

	var user User
	err := s.db.QueryRow(`
		SELECT id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
		       tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		       created_at, updated_at
		FROM users WHERE razorpay_customer_id = ?`, customerID).Scan(
		&user.ID, &user.ClerkID, &user.Email, &user.Name, &user.RazorpayCustomerID,
		&user.RazorpaySubscriptionID, &user.Tier, &user.StorageUsedBytes,
		&user.SubscriptionCanceledAt, &user.SubscriptionPaused,
		&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &user, nil
}

// Create creates a new user
func (s *Store) Create(user *User) error {
	if user.ClerkID == "" || user.Email == "" {
		return fmt.Errorf("clerk_id and email required")
	}

	user.ID = uuid.New().String()
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	if user.Tier == "" {
		user.Tier = "free"
	}

	_, err := s.db.Exec(`
		INSERT INTO users (id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
		                   tier, storage_used_bytes, subscription_canceled_at, subscription_paused,
		                   created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		user.ID, user.ClerkID, user.Email, user.Name, user.RazorpayCustomerID,
		user.RazorpaySubscriptionID, user.Tier, user.StorageUsedBytes,
		user.SubscriptionCanceledAt, user.SubscriptionPaused,
		user.CreatedAt, user.UpdatedAt)

	if err != nil {
		return fmt.Errorf("insert failed: %w", err)
	}
	return nil
}

// Update updates an existing user
func (s *Store) Update(user *User) error {
	if user.ID == "" {
		return fmt.Errorf("user id required")
	}

	user.UpdatedAt = time.Now()

	_, err := s.db.Exec(`
		UPDATE users SET
			email = ?, name = ?, razorpay_customer_id = ?, razorpay_subscription_id = ?,
			tier = ?, storage_used_bytes = ?, subscription_canceled_at = ?,
			subscription_paused = ?, updated_at = ?
		WHERE id = ?`,
		user.Email, user.Name, user.RazorpayCustomerID, user.RazorpaySubscriptionID,
		user.Tier, user.StorageUsedBytes, user.SubscriptionCanceledAt,
		user.SubscriptionPaused, user.UpdatedAt, user.ID)

	if err != nil {
		return fmt.Errorf("update failed: %w", err)
	}
	return nil
}

// GetOrCreate gets or creates a user
func (s *Store) GetOrCreate(clerkID, email, name string) (*User, error) {
	if clerkID == "" || email == "" {
		return nil, fmt.Errorf("clerk_id and email required")
	}

	user, err := s.GetByClerkID(clerkID)
	if err == nil {
		return user, nil
	}

	// Create new user
	user = &User{
		ClerkID: clerkID,
		Email:   email,
		Name:    name,
		Tier:    "free",
	}

	if err := s.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetAll retrieves all active users
func (s *Store) GetAll() ([]*User, error) {
	query := `
	SELECT id, clerk_id, email, name, razorpay_customer_id, razorpay_subscription_id,
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
		err := rows.Scan(&user.ID, &user.ClerkID, &user.Email, &user.Name,
			&user.RazorpayCustomerID, &user.RazorpaySubscriptionID, &user.Tier,
			&user.StorageUsedBytes, &user.SubscriptionCanceledAt, &user.SubscriptionPaused,
			&user.CreatedAt, &user.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan failed: %w", err)
		}
		users = append(users, user)
	}

	return users, rows.Err()
}
