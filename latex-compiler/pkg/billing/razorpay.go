package billing

import (
	"fmt"
	"os"
	"time"

	"github.com/razorpay/razorpay-go"
	"github.com/sirupsen/logrus"
)

var log = logrus.WithField("component", "billing/razorpay")

var razorpayService *RazorpayService

type RazorpayService struct {
	Client *razorpay.Client
	KeyID  string
}

func NewRazorpayService(keyID, keySecret string) *RazorpayService {
	client := razorpay.NewClient(keyID, keySecret)
	service := &RazorpayService{
		Client: client,
		KeyID:  keyID,
	}
	razorpayService = service
	log.WithField("key_id", keyID).Info("Razorpay service initialized")
	return service
}

func GetRazorpayService() *RazorpayService {
	return razorpayService
}

// getString safely extracts a string from a map
func getString(m map[string]interface{}, key string) (string, error) {
	val, ok := m[key]
	if !ok {
		return "", fmt.Errorf("missing key: %s", key)
	}
	str, ok := val.(string)
	if !ok {
		return "", fmt.Errorf("key %s is not a string", key)
	}
	return str, nil
}

// getFloat safely extracts a float64 from a map
func getFloat(m map[string]interface{}, key string) (float64, error) {
	val, ok := m[key]
	if !ok {
		return 0, fmt.Errorf("missing key: %s", key)
	}
	f, ok := val.(float64)
	if !ok {
		return 0, fmt.Errorf("key %s is not a number", key)
	}
	return f, nil
}

// CreateCustomer creates or retrieves a Razorpay customer
func (s *RazorpayService) CreateCustomer(email, name string) (string, error) {
	data := map[string]interface{}{
		"name":  name,
		"email": email,
	}

	customer, err := s.Client.Customer.Create(data, nil)
	if err != nil {
		log.WithError(err).WithFields(logrus.Fields{
			"email": email,
			"name":  name,
		}).Error("Failed to create customer")
		return "", fmt.Errorf("failed to create customer: %w", err)
	}

	id, err := getString(customer, "id")
	if err != nil {
		log.WithError(err).Error("Invalid customer response: missing id")
		return "", fmt.Errorf("invalid customer response: %w", err)
	}

	log.WithFields(logrus.Fields{
		"customer_id": id,
		"email":       email,
	}).Info("Customer created")

	return id, nil
}

// GetCustomer retrieves a customer by ID
func (s *RazorpayService) GetCustomer(customerID string) (*Customer, error) {
	customer, err := s.Client.Customer.Fetch(customerID, map[string]interface{}{}, map[string]string{})
	if err != nil {
		log.WithError(err).WithField("customer_id", customerID).Error("Failed to fetch customer")
		return nil, fmt.Errorf("failed to fetch customer: %w", err)
	}

	id, err := getString(customer, "id")
	if err != nil {
		return nil, fmt.Errorf("invalid customer response: %w", err)
	}
	email, err := getString(customer, "email")
	if err != nil {
		log.WithError(err).Warn("Customer response missing email")
		email = ""
	}
	name, err := getString(customer, "name")
	if err != nil {
		log.WithError(err).Warn("Customer response missing name")
		name = ""
	}

	return &Customer{
		ID:    id,
		Email: email,
		Name:  name,
	}, nil
}

// CreateSubscriptionLink creates a subscription and returns checkout URL
func (s *RazorpayService) CreateSubscriptionLink(planID, customerID string) (string, error) {
	data := map[string]interface{}{
		"plan_id":         planID,
		"customer_id":     customerID,
		"total_count":     12,
		"quantity":        1,
		"notify_by_sms":   1,
		"notify_by_email": 1,
		"notes": map[string]string{
			"source": "treefrog-latex-compiler",
		},
	}

	subscription, err := s.Client.Subscription.Create(data, nil)
	if err != nil {
		log.WithError(err).WithFields(logrus.Fields{
			"plan_id":     planID,
			"customer_id": customerID,
		}).Error("Failed to create subscription")
		return "", fmt.Errorf("failed to create subscription: %w", err)
	}

	shortURL, err := getString(subscription, "short_url")
	if err != nil {
		log.WithError(err).Error("Invalid subscription response: missing short_url")
		return "", fmt.Errorf("invalid subscription response: %w", err)
	}

	log.WithFields(logrus.Fields{
		"customer_id": customerID,
		"plan_id":     planID,
	}).Info("Subscription link created")

	return shortURL, nil
}

// CancelSubscription cancels a subscription
func (s *RazorpayService) CancelSubscription(subscriptionID string) error {
	data := map[string]interface{}{
		"cancel_at_cycle_end": true,
	}

	_, err := s.Client.Subscription.Cancel(subscriptionID, data, nil)
	if err != nil {
		log.WithError(err).WithField("subscription_id", subscriptionID).Error("Failed to cancel subscription")
		return fmt.Errorf("failed to cancel subscription: %w", err)
	}

	log.WithField("subscription_id", subscriptionID).Info("Subscription cancelled")
	return nil
}

// PauseSubscription pauses a subscription
func (s *RazorpayService) PauseSubscription(subscriptionID string) error {
	data := map[string]interface{}{
		"pause_at": "now",
	}

	_, err := s.Client.Subscription.Pause(subscriptionID, data, nil)
	if err != nil {
		log.WithError(err).WithField("subscription_id", subscriptionID).Error("Failed to pause subscription")
		return fmt.Errorf("failed to pause subscription: %w", err)
	}

	log.WithField("subscription_id", subscriptionID).Info("Subscription paused")
	return nil
}

// ResumeSubscription resumes a paused subscription
func (s *RazorpayService) ResumeSubscription(subscriptionID string) error {
	_, err := s.Client.Subscription.Resume(subscriptionID, map[string]interface{}{}, map[string]string{})
	if err != nil {
		log.WithError(err).WithField("subscription_id", subscriptionID).Error("Failed to resume subscription")
		return fmt.Errorf("failed to resume subscription: %w", err)
	}

	log.WithField("subscription_id", subscriptionID).Info("Subscription resumed")
	return nil
}

// GetSubscription retrieves subscription details
func (s *RazorpayService) GetSubscription(subscriptionID string) (*Subscription, error) {
	sub, err := s.Client.Subscription.Fetch(subscriptionID, map[string]interface{}{}, map[string]string{})
	if err != nil {
		log.WithError(err).WithField("subscription_id", subscriptionID).Error("Failed to fetch subscription")
		return nil, fmt.Errorf("failed to fetch subscription: %w", err)
	}

	status, err := getString(sub, "status")
	if err != nil {
		return nil, fmt.Errorf("invalid subscription response: %w", err)
	}

	planID, _ := getString(sub, "plan_id")
	customerID, err := getString(sub, "customer_id")
	if err != nil {
		log.WithError(err).Warn("Subscription response missing customer_id")
	}

	currentStart, err := getFloat(sub, "current_start")
	if err != nil {
		log.WithError(err).Warn("Subscription response missing current_start")
	}
	currentEnd, err := getFloat(sub, "current_end")
	if err != nil {
		log.WithError(err).Warn("Subscription response missing current_end")
	}
	paidCount, err := getFloat(sub, "paid_count")
	if err != nil {
		log.WithError(err).Warn("Subscription response missing paid_count")
	}
	totalCount, err := getFloat(sub, "total_count")
	if err != nil {
		log.WithError(err).Warn("Subscription response missing total_count")
	}

	return &Subscription{
		ID:           subscriptionID,
		PlanID:       planID,
		Status:       status,
		CustomerID:   customerID,
		CurrentStart: time.Unix(int64(currentStart), 0),
		CurrentEnd:   time.Unix(int64(currentEnd), 0),
		PaidCount:    int(paidCount),
		TotalCount:   int(totalCount),
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
		log.WithError(err).WithFields(logrus.Fields{
			"plan_id":     planID,
			"customer_id": customerID,
			"coupon_code": couponCode,
		}).Error("Failed to create subscription with coupon")
		return "", fmt.Errorf("failed to create subscription with coupon: %w", err)
	}

	shortURL, err := getString(subscription, "short_url")
	if err != nil {
		return "", fmt.Errorf("invalid subscription response: %w", err)
	}

	log.WithFields(logrus.Fields{
		"customer_id": customerID,
		"plan_id":     planID,
		"coupon_code": couponCode,
	}).Info("Subscription with coupon created")

	return shortURL, nil
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

// planTierMapping holds the plan ID to tier mapping (initialized at startup)
var planTierMapping map[string]string

// InitPlanTierMapping initializes the plan tier mapping from environment variables
func InitPlanTierMapping() {
	planTierMapping = map[string]string{
		os.Getenv("RAZORPAY_PLAN_FREE"):       "free",
		os.Getenv("RAZORPAY_PLAN_PRO"):        "pro",
		os.Getenv("RAZORPAY_PLAN_ENTERPRISE"): "enterprise",
	}
	log.WithField("plans", len(planTierMapping)).Info("Plan tier mapping initialized")
}

// GetTierFromPlan returns the tier name for a given Razorpay plan ID
func GetTierFromPlan(planID string) string {
	if planTierMapping == nil {
		InitPlanTierMapping()
	}
	if tier, ok := planTierMapping[planID]; ok {
		return tier
	}
	return "free"
}
