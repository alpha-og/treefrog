package build

import (
	"fmt"
	"time"

	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/billing"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/user"
)

type LimitService struct {
	buildStore *Store
	userStore  *user.Store
}

func NewLimitService(buildStore *Store, userStore *user.Store) *LimitService {
	return &LimitService{
		buildStore: buildStore,
		userStore:  userStore,
	}
}

func (s *LimitService) CanCreateBuild(userID string) (*LimitCheck, error) {
	userRec, err := s.userStore.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Check if subscription is paused
	if userRec.SubscriptionPaused {
		return &LimitCheck{
			Allowed: false,
			Reason:  "subscription_paused",
			Message: "Your subscription is paused. Please update payment method.",
		}, nil
	}

	// Check if subscription is canceled
	if userRec.SubscriptionCanceledAt != nil && time.Now().After(*userRec.SubscriptionCanceledAt) {
		return &LimitCheck{
			Allowed: false,
			Reason:  "subscription_ended",
			Message: "Your subscription has ended. Please renew to continue.",
		}, nil
	}

	tier := userRec.Tier
	config := billing.Plans[tier]
	if config.MonthlyBuilds == -1 {
		// Unlimited tier
		return &LimitCheck{
			Allowed: true,
			Tier:    tier,
		}, nil
	}

	// Count monthly builds
	monthlyCount, err := s.buildStore.CountMonthly(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count builds: %w", err)
	}

	if monthlyCount >= config.MonthlyBuilds {
		return &LimitCheck{
			Allowed: false,
			Reason:  "monthly_limit_exceeded",
			Message: fmt.Sprintf("Monthly build limit reached: %d/%d", monthlyCount, config.MonthlyBuilds),
			Used:    monthlyCount,
			Limit:   config.MonthlyBuilds,
			ResetAt: s.getMonthlyResetTime(),
		}, nil
	}

	// Count concurrent builds
	concurrentCount, err := s.buildStore.CountActive(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count concurrent builds: %w", err)
	}

	if concurrentCount >= config.Concurrent {
		return &LimitCheck{
			Allowed: false,
			Reason:  "concurrent_limit_exceeded",
			Message: fmt.Sprintf("Concurrent build limit reached: %d/%d", concurrentCount, config.Concurrent),
			Used:    concurrentCount,
			Limit:   config.Concurrent,
		}, nil
	}

	return &LimitCheck{
		Allowed: true,
		Tier:    tier,
		Used:    monthlyCount,
		Limit:   config.MonthlyBuilds,
	}, nil
}

func (s *LimitService) getMonthlyResetTime() *time.Time {
	now := time.Now()
	currentMonth := now.Month()
	currentYear := now.Year()

	nextMonth := currentMonth + 1
	if nextMonth > 12 {
		nextMonth = 1
		currentYear++
	}

	resetTime := time.Date(currentYear, nextMonth, 1, 0, 0, 0, 0, time.UTC)
	return &resetTime
}

type LimitCheck struct {
	Allowed bool       `json:"allowed"`
	Reason  string     `json:"reason,omitempty"`
	Message string     `json:"message,omitempty"`
	Tier    string     `json:"tier,omitempty"`
	Used    int        `json:"used,omitempty"`
	Limit   int        `json:"limit,omitempty"`
	ResetAt *time.Time `json:"reset_at,omitempty"`
}

// GetUserUsage returns usage statistics for a user
func (s *LimitService) GetUserUsage(userID string) (*UsageStats, error) {
	userRec, err := s.userStore.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	tier := userRec.Tier
	config := billing.Plans[tier]

	monthlyCount, err := s.buildStore.CountMonthly(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count monthly builds: %w", err)
	}
	concurrentCount, err := s.buildStore.CountActive(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count active builds: %w", err)
	}
	totalStorage, err := s.buildStore.GetTotalStorage(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get total storage: %w", err)
	}

	var monthlyLimit int
	if config.MonthlyBuilds == -1 {
		monthlyLimit = -1
	} else {
		monthlyLimit = config.MonthlyBuilds
	}

	resetTime := s.getMonthlyResetTime()

	return &UsageStats{
		Tier:            tier,
		MonthlyUsed:     monthlyCount,
		MonthlyLimit:    monthlyLimit,
		MonthlyResetAt:  resetTime,
		ConcurrentUsed:  concurrentCount,
		ConcurrentLimit: config.Concurrent,
		StorageUsedGB:   float64(totalStorage) / (1024 * 1024 * 1024),
		StorageLimitGB:  float64(config.StorageGB),
	}, nil
}

type UsageStats struct {
	Tier            string     `json:"tier"`
	MonthlyUsed     int        `json:"monthly_used"`
	MonthlyLimit    int        `json:"monthly_limit"`
	MonthlyResetAt  *time.Time `json:"monthly_reset_at,omitempty"`
	ConcurrentUsed  int        `json:"concurrent_used"`
	ConcurrentLimit int        `json:"concurrent_limit"`
	StorageUsedGB   float64    `json:"storage_used_gb"`
	StorageLimitGB  float64    `json:"storage_limit_gb"`
}
