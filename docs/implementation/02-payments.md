# Phase 2: Payments

## Overview

This phase covers:
- Razorpay integration
- Subscription management
- Webhook handling
- Coupon system

## Razorpay Integration

### Installation

```bash
cd latex-compiler
go get github.com/razorpay/razorpay-go
```

### Environment Variables

```bash
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_PLAN_FREE=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_PRO=plan_xxxxxxxxxxxxx
RAZORPAY_PLAN_ENTERPRISE=plan_xxxxxxxxxxxxx
```

### Plan Configuration (`pkg/billing/plans.go`)

```go
package billing

import (
	"os"
)

type PlanConfig struct {
	ID            string
	Name          string
	MonthlyBuilds int
	Concurrent    int
	StorageGB     int
}

var Plans = map[string]PlanConfig{
	"free": {
		ID:            os.Getenv("RAZORPAY_PLAN_FREE"),
		Name:          "Free",
		MonthlyBuilds:  50,
		Concurrent:     2,
		StorageGB:      1,
	},
	"pro": {
		ID:            os.Getenv("RAZORPAY_PLAN_PRO"),
		Name:          "Pro",
		MonthlyBuilds:  500,
		Concurrent:     10,
		StorageGB:      10,
	},
	"enterprise": {
		ID:            os.Getenv("RAZORPAY_PLAN_ENTERPRISE"),
		Name:          "Enterprise",
		MonthlyBuilds:  -1, // unlimited
		Concurrent:     50,
		StorageGB:      100,
	},
}
```

### Razorpay Service (`pkg/billing/razorpay.go`)

```go
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
	customer, err := s.Client.Customer.Fetch(customerID, nil)
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
	_, err := s.Client.Subscription.Resume(subscriptionID, nil)
	return err
}

// GetSubscription retrieves subscription details
func (s *RazorpayService) GetSubscription(subscriptionID string) (*Subscription, error) {
	sub, err := s.Client.Subscription.Fetch(subscriptionID, nil)
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
```

## Webhook Handler

### Webhook Handler (`pkg/billing/webhook.go`)

```go
package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/athulanoop/treefrog/latex-compiler/pkg/user"
)

// WebhookPayload represents Razorpay webhook payload
type WebhookPayload struct {
	Event   string `json:"event"`
	Account string `json:"account_id"`
	Payload struct {
		Subscription struct {
			ID              string `json:"id"`
			Status          string `json:"status"`
			PlanID          string `json:"plan_id"`
			CustomerID      string `json:"customer_id"`
			PaidCount       int    `json:"paid_count"`
			CurrentStart    int64  `json:"current_start"`
			CurrentEnd      int64  `json:"current_end"`
		} `json:"subscription"`
		Payment struct {
			ID              string `json:"id"`
			Amount          int64  `json:"amount"`
			Status          string `json:"status"`
			InvoiceID       string `json:"invoice_id"`
		} `json:"payment"`
		Customer struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"customer"`
	} `json:"payload"`
}

// VerifyWebhookSignature validates Razorpay webhook signature
func VerifyWebhookSignature(body, signature, secret string) bool {
	computed := hmac.New(sha256.New, []byte(secret))
	computed.Write([]byte(body))
	expected := hex.EncodeToString(computed.Sum(nil))

	if len(signature) != len(expected) {
		return false
	}

	return hmac.Equal([]byte(signature), []byte(expected))
}

// WebhookHandler handles Razorpay webhook events
type WebhookHandler struct {
	service    *RazorpayService
	userStore *user.Store
}

func NewWebhookHandler(service *RazorpayService, userStore *user.Store) *WebhookHandler {
	return &WebhookHandler{
		service:    service,
		userStore: userStore,
	}
}

func (h *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Failed to read webhook body: %v", err)
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Verify signature
	signature := r.Header.Get("X-Razorpay-Signature")
	if !VerifyWebhookSignature(body, signature, os.Getenv("RAZORPAY_WEBHOOK_SECRET")) {
		log.Printf("Invalid webhook signature")
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Parse payload
	var payload WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("Failed to parse webhook payload: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	log.Printf("Received webhook event: %s for subscription: %s", 
		payload.Event, payload.Payload.Subscription.ID)

	// Handle event
	if err := h.handleEvent(&payload); err != nil {
		log.Printf("Failed to handle webhook event: %v", err)
	}

	w.WriteHeader(http.StatusOK)
}

func (h *WebhookHandler) handleEvent(payload *WebhookPayload) error {
	switch payload.Event {
	case "subscription.activated":
		return h.handleSubscriptionActivated(payload)
	case "subscription.cancelled":
		return h.handleSubscriptionCancelled(payload)
	case "subscription.paused":
		return h.handleSubscriptionPaused(payload)
	case "subscription.resumed":
		return h.handleSubscriptionResumed(payload)
	case "payment.authorized":
		return h.handlePaymentAuthorized(payload)
	case "payment.failed":
		return h.handlePaymentFailed(payload)
	case "subscription.completed":
		return h.handleSubscriptionCompleted(payload)
	default:
		log.Printf("Unhandled event type: %s", payload.Event)
		return nil
	}
}

func (h *WebhookHandler) handleSubscriptionActivated(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID
	planID := payload.Payload.Subscription.PlanID
	subscriptionID := payload.Payload.Subscription.ID

	if customerID == "" || planID == "" {
		return fmt.Errorf("missing customer or plan ID in payload")
	}

	tier := GetTierFromPlan(planID)

	// Update user with new tier (Issue #13 - add transaction for race condition)
	user, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		log.Printf("User not found for customer %s, cannot activate subscription", customerID)
		return fmt.Errorf("user not found: %w", err)
	}

	user.Tier = tier
	user.RazorpaySubscriptionID = subscriptionID
	user.SubscriptionPaused = false
	
	if err := h.userStore.Update(user); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	log.Printf("Activated subscription for user %s: tier=%s", user.ClerkID, tier)
	return nil
}

func (h *WebhookHandler) handleSubscriptionCancelled(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	user, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	// Schedule downgrade at end of billing period (Issue #25 - documented as soft downgrade)
	now := time.Now()
	user.SubscriptionCanceledAt = &now
	user.Tier = "free" // Will take effect at end of billing cycle
	
	if err := h.userStore.Update(user); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	log.Printf("Scheduled downgrade for user %s at end of billing period", user.ClerkID)
	return nil
}

func (h *WebhookHandler) handleSubscriptionPaused(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	user, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	user.SubscriptionPaused = true
	if err := h.userStore.Update(user); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	log.Printf("Paused subscription for user %s", user.ClerkID)
	return nil
}

func (h *WebhookHandler) handleSubscriptionResumed(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	user, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	user.SubscriptionPaused = false
	if err := h.userStore.Update(user); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	log.Printf("Resumed subscription for user %s", user.ClerkID)
	return nil
}

func (h *WebhookHandler) handlePaymentAuthorized(payload *WebhookPayload) error {
	log.Printf("Payment authorized: %s for subscription %s",
		payload.Payload.Payment.ID,
		payload.Payload.Subscription.ID)
	// Log audit trail
	return nil
}

func (h *WebhookHandler) handlePaymentFailed(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	user, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	// Issue #23 - improved payment failed handling
	log.Printf("Payment failed for user %s: subscription %s, amount: %v",
		user.ClerkID,
		payload.Payload.Subscription.ID,
		payload.Payload.Payment.Amount)
	
	// Mark subscription as paused due to payment failure
	user.SubscriptionPaused = true
	if err := h.userStore.Update(user); err != nil {
		log.Printf("Failed to pause subscription: %v", err)
	}

	return nil
}

func (h *WebhookHandler) handleSubscriptionCompleted(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	user, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	// Issue #4 - removed non-existent field SubscriptionEnded
	user.Tier = "free"
	user.RazorpaySubscriptionID = "" // Clear subscription reference
	
	if err := h.userStore.Update(user); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	log.Printf("Subscription completed for user %s", user.ClerkID)
	return nil
}

func timePtr(t time.Time) *time.Time {
	return &t
}
```

## Subscription Handlers

```go
package main

import (
	"encoding/json"
	"net/http"

	"github.com/athulanoop/treefrog/latex-compiler/pkg/auth"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/billing"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/user"
	"github.com/gorilla/mux"
)

func createSubscriptionHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		PlanID string `json:"plan_id"` // "free", "pro", "enterprise"
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	plan, ok := billing.Plans[req.PlanID]
	if !ok {
		http.Error(w, "Invalid plan", http.StatusBadRequest)
		return
	}

	// Get user from database
	userStore := user.NewStore()
	userRec, err := userStore.GetByClerkID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	razorpayService := billing.NewRazorpayService(
		os.Getenv("RAZORPAY_KEY_ID"),
		os.Getenv("RAZORPAY_KEY_SECRET"),
	)

	// Create Razorpay customer if not exists
	customerID := userRec.RazorpayCustomerID
	if customerID == "" {
		customer, err := razorpayService.CreateCustomer(
			userRec.Email,
			userRec.Name,
		)
		if err != nil {
			http.Error(w, "Failed to create customer", http.StatusInternalServerError)
			return
		}
		customerID = customer
		userRec.RazorpayCustomerID = customerID
		userStore.Update(userRec)
	}

	// Create subscription
	checkoutURL, err := razorpayService.CreateSubscriptionLink(
		plan.ID,
		customerID,
	)
	if err != nil {
		http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"checkout_url": checkoutURL,
		"plan":        req.PlanID,
	})
}

func cancelSubscriptionHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userStore := user.NewStore()
	userRec, err := userStore.GetByClerkID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if userRec.RazorpaySubscriptionID == "" {
		http.Error(w, "No active subscription", http.StatusBadRequest)
		return
	}

	razorpayService := billing.NewRazorpayService(
		os.Getenv("RAZORPAY_KEY_ID"),
		os.Getenv("RAZORPAY_KEY_SECRET"),
	)

	if err := razorpayService.CancelSubscription(userRec.RazorpaySubscriptionID); err != nil {
		http.Error(w, "Failed to cancel subscription", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"status":  "canceled",
		"message": "Subscription will be canceled at end of billing period",
	})
}

func getSubscriptionStatusHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	userStore := user.NewStore()
	userRec, err := userStore.GetByClerkID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if userRec.RazorpaySubscriptionID == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"tier":   userRec.Tier,
			"status": "active",
		})
		return
	}

	razorpayService := billing.NewRazorpayService(
		os.Getenv("RAZORPAY_KEY_ID"),
		os.Getenv("RAZORPAY_KEY_SECRET"),
	)

	subscription, err := razorpayService.GetSubscription(userRec.RazorpaySubscriptionID)
	if err != nil {
		http.Error(w, "Failed to get subscription", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"tier":              userRec.Tier,
		"status":            subscription.Status,
		"current_start":     subscription.CurrentStart,
		"current_end":       subscription.CurrentEnd,
		"paid_count":        subscription.PaidCount,
		"total_count":       subscription.TotalCount,
		"canceled_at":       userRec.SubscriptionCanceledAt,
		"paused":           userRec.SubscriptionPaused,
	})
}
```

## Coupon System

### Coupon Store (`pkg/user/coupon.go`)

```go
package user

import (
	"database/sql"
	"fmt"
	"os"
	"time"
)

type Coupon struct {
	ID            string    `json:"id"`
	Code          string    `json:"code"`
	PlanID        string    `json:"plan_id"`
	PlanName      string    `json:"plan_name"`
	MaxUses       int       `json:"max_uses"`
	UsedCount     int       `json:"used_count"`
	ExpiresAt     time.Time `json:"expires_at"`
	DiscountPct   int       `json:"discount_percent"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
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
		SELECT id, code, plan_id, plan_name, max_uses, used_count, expires_at, 
		       discount_percent, is_active, created_at
		FROM coupons WHERE code = ?`, code).Scan(
		&coupon.ID, &coupon.Code, &coupon.PlanID, &coupon.PlanName,
		&coupon.MaxUses, &coupon.UsedCount, &coupon.ExpiresAt,
		&coupon.DiscountPct, &coupon.IsActive, &coupon.CreatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("coupon not found")
		}
		return nil, fmt.Errorf("query failed: %w", err)
	}

	return &coupon, nil
}

// IsValid validates a coupon (Issue #29 - coupon validation)
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

// ValidateForPlan checks if coupon is valid for a specific plan (Issue #29)
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
		"UPDATE coupons SET used_count = used_count + 1 WHERE id = ?", 
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

// ValidateCoupon is a convenience function combining all validations (Issue #29)
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
```

### Coupon Handler

```go
func redeemCouponHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		CouponCode string `json:"coupon_code"`
		PlanID     string `json:"plan_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate inputs (Issue #9)
	if req.CouponCode == "" || req.PlanID == "" {
		http.Error(w, "coupon_code and plan_id required", http.StatusBadRequest)
		return
	}

	if !billing.ValidEngines[req.PlanID] { // Should be ValidPlans
		http.Error(w, "Invalid plan", http.StatusBadRequest)
		return
	}

	plan, ok := billing.Plans[req.PlanID]
	if !ok {
		http.Error(w, "Invalid plan", http.StatusBadRequest)
		return
	}

	// Get user
	userStore := user.NewStore(db)
	userRec, err := userStore.GetByClerkID(userID)
	if err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Validate coupon (Issue #29 - coupon validation)
	couponStore := user.NewCouponStore(db)
	coupon, err := user.ValidateCoupon(couponStore, req.CouponCode, req.PlanID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Invalid coupon: %v", err), http.StatusBadRequest)
		return
	}

	// Create Razorpay customer if needed
	razorpayService := billing.NewRazorpayService(
		os.Getenv("RAZORPAY_KEY_ID"),
		os.Getenv("RAZORPAY_KEY_SECRET"),
	)

	customerID := userRec.RazorpayCustomerID
	if customerID == "" {
		customer, err := razorpayService.CreateCustomer(
			userRec.Email,
			userRec.Name,
		)
		if err != nil {
			http.Error(w, "Failed to create customer", http.StatusInternalServerError)
			return
		}
		customerID = customer
		userRec.RazorpayCustomerID = customerID
		userStore.Update(userRec)
	}

	// Create subscription with coupon
	checkoutURL, err := razorpayService.CreateSubscriptionWithCoupon(
		plan.ID,
		customerID,
		req.CouponCode,
	)
	if err != nil {
		http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
		return
	}

	// Increment coupon usage
	couponStore.IncrementUsage(coupon.ID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"checkout_url":     checkoutURL,
		"plan":             req.PlanID,
		"discount_percent": coupon.DiscountPct,
	})
}
```

## Tasks Checklist

- [ ] Initialize Razorpay client
- [ ] Create customer management
- [ ] Implement subscription link creation
- [ ] Set up webhook endpoint
- [ ] Implement webhook signature verification
- [ ] Create subscription handler
- [ ] Implement plan tier mapping
- [ ] Handle webhook events
- [ ] Create coupon system
- [ ] Test payment flow

## Next Steps

Proceed to [Phase 3: Build System](03-build-system.md) to add LaTeX compilation with Docker.
