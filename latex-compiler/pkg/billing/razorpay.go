package billing

import (
	"fmt"
	"os"
	"time"

	razorpay "github.com/razorpay/razorpay-go"
)

type RazorpayService struct {
	Client *razorpay.Client
	KeyID  string
}

func NewRazorpayService(keyID, keySecret string) *RazorpayService {
	client := razorpay.NewClient(keyID, keySecret)
	return &RazorpayService{
		Client: client,
		KeyID:  keyID,
	}
}

// CreateCustomer creates or retrieves a Razorpay customer
func (s *RazorpayService) CreateCustomer(email, name string) (string, error) {
	data := map[string]interface{}{
		"name":  name,
		"email": email,
	}

	customer, err := s.Client.Customer.Create(data, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create customer: %w", err)
	}

	return customer["id"].(string), nil
}

// GetCustomer retrieves a customer by ID
func (s *RazorpayService) GetCustomer(customerID string) (*Customer, error) {
	customer, err := s.Client.Customer.Fetch(customerID, map[string]interface{}{}, map[string]string{})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch customer: %w", err)
	}

	return &Customer{
		ID:    customer["id"].(string),
		Email: customer["email"].(string),
		Name:  customer["name"].(string),
	}, nil
}

// CreateSubscriptionLink creates a subscription and returns checkout URL
func (s *RazorpayService) CreateSubscriptionLink(planID, customerID string) (string, error) {
	data := map[string]interface{}{
		"plan_id":         planID,
		"customer_id":     customerID,
		"total_count":     12, // 12 billing cycles
		"quantity":        1,
		"notify_by_sms":   1,
		"notify_by_email": 1,
		"notes": map[string]string{
			"source": "treefrog-latex-compiler",
		},
	}

	subscription, err := s.Client.Subscription.Create(data, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create subscription: %w", err)
	}

	return subscription["short_url"].(string), nil
}

// CancelSubscription cancels a subscription
func (s *RazorpayService) CancelSubscription(subscriptionID string) error {
	data := map[string]interface{}{
		"cancel_at_cycle_end": true, // Cancel at end of billing period
	}

	_, err := s.Client.Subscription.Cancel(subscriptionID, data, nil)
	return err
}

// PauseSubscription pauses a subscription
func (s *RazorpayService) PauseSubscription(subscriptionID string) error {
	data := map[string]interface{}{
		"pause_at": "now",
	}

	_, err := s.Client.Subscription.Pause(subscriptionID, data, nil)
	return err
}

// ResumeSubscription resumes a paused subscription
func (s *RazorpayService) ResumeSubscription(subscriptionID string) error {
	_, err := s.Client.Subscription.Resume(subscriptionID, map[string]interface{}{}, map[string]string{})
	return err
}

// GetSubscription retrieves subscription details
func (s *RazorpayService) GetSubscription(subscriptionID string) (*Subscription, error) {
	sub, err := s.Client.Subscription.Fetch(subscriptionID, map[string]interface{}{}, map[string]string{})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch subscription: %w", err)
	}

	status := sub["status"].(string)
	planID := ""

	if plan, ok := sub["plan_id"].(string); ok {
		planID = plan
	}

	return &Subscription{
		ID:           subscriptionID,
		PlanID:       planID,
		Status:       status,
		CustomerID:   sub["customer_id"].(string),
		CurrentStart: time.Unix(int64(sub["current_start"].(float64)), 0),
		CurrentEnd:   time.Unix(int64(sub["current_end"].(float64)), 0),
		PaidCount:    int(sub["paid_count"].(float64)),
		TotalCount:   int(sub["total_count"].(float64)),
	}, nil
}

// CreateSubscriptionWithCoupon creates subscription with a coupon
func (s *RazorpayService) CreateSubscriptionWithCoupon(planID, customerID, couponCode string) (string, error) {
	data := map[string]interface{}{
		"plan_id":     planID,
		"customer_id": customerID,
		"total_count": 12,
		"quantity":    1,
		"coupon_code": couponCode,
	}

	subscription, err := s.Client.Subscription.Create(data, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create subscription with coupon: %w", err)
	}

	return subscription["short_url"].(string), nil
}

type Customer struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type Subscription struct {
	ID           string    `json:"id"`
	PlanID       string    `json:"plan_id"`
	Status       string    `json:"status"`
	CustomerID   string    `json:"customer_id"`
	CurrentStart time.Time `json:"current_start"`
	CurrentEnd   time.Time `json:"current_end"`
	PaidCount    int       `json:"paid_count"`
	TotalCount   int       `json:"total_count"`
}

// PlanTierMapping maps Razorpay plan IDs to our tier names
var PlanTierMapping = map[string]string{
	os.Getenv("RAZORPAY_PLAN_FREE"):       "free",
	os.Getenv("RAZORPAY_PLAN_PRO"):        "pro",
	os.Getenv("RAZORPAY_PLAN_ENTERPRISE"): "enterprise",
}

// GetTierFromPlan returns the tier name for a given Razorpay plan ID
func GetTierFromPlan(planID string) string {
	if tier, ok := PlanTierMapping[planID]; ok {
		return tier
	}
	return "free" // Default to free tier
}
