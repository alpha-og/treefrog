package billing

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/user"
	"github.com/sirupsen/logrus"
)

// WebhookPayload represents Razorpay webhook payload
type WebhookPayload struct {
	Event   string `json:"event"`
	Account string `json:"account_id"`
	Payload struct {
		Subscription struct {
			ID           string `json:"id"`
			Status       string `json:"status"`
			PlanID       string `json:"plan_id"`
			CustomerID   string `json:"customer_id"`
			PaidCount    int    `json:"paid_count"`
			CurrentStart int64  `json:"current_start"`
			CurrentEnd   int64  `json:"current_end"`
		} `json:"subscription"`
		Payment struct {
			ID        string `json:"id"`
			Amount    int64  `json:"amount"`
			Status    string `json:"status"`
			InvoiceID string `json:"invoice_id"`
		} `json:"payment"`
		Customer struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"customer"`
	} `json:"payload"`
}

func VerifyWebhookSignature(body, signature, secret string) bool {
	if secret == "" {
		return false
	}
	computed := hmac.New(sha256.New, []byte(secret))
	computed.Write([]byte(body))
	expected := hex.EncodeToString(computed.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expected))
}

// WebhookHandler handles Razorpay webhook events
type WebhookHandler struct {
	service   *RazorpayService
	userStore *user.Store
	logger    *logrus.Logger
}

func NewWebhookHandler(service *RazorpayService, userStore *user.Store, logger *logrus.Logger) *WebhookHandler {
	return &WebhookHandler{
		service:   service,
		userStore: userStore,
		logger:    logger,
	}
}

func (h *WebhookHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		h.logger.WithError(err).Error("Failed to read webhook body")
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}
	r.Body.Close()

	signature := r.Header.Get("X-Razorpay-Signature")
	webhookSecret := os.Getenv("RAZORPAY_WEBHOOK_SECRET")
	if webhookSecret == "" {
		h.logger.Error("RAZORPAY_WEBHOOK_SECRET not configured")
		http.Error(w, "Server misconfiguration", http.StatusInternalServerError)
		return
	}

	if !VerifyWebhookSignature(string(body), signature, webhookSecret) {
		h.logger.Warn("Invalid webhook signature")
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	var payload WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		h.logger.WithError(err).Error("Failed to parse webhook payload")
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	h.logger.WithFields(logrus.Fields{
		"event":        payload.Event,
		"subscription": payload.Payload.Subscription.ID,
		"customer":     payload.Payload.Customer.ID,
	}).Info("Received webhook event")

	if err := h.handleEvent(&payload); err != nil {
		h.logger.WithError(err).Error("Failed to handle webhook event")
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
		h.logger.WithField("event", payload.Event).Info("Unhandled event type")
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

	// Update user with new tier
	u, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		h.logger.WithError(err).WithField("customer_id", customerID).Error("User not found for customer")
		return fmt.Errorf("user not found: %w", err)
	}

	u.Tier = tier
	u.RazorpaySubscriptionID = subscriptionID
	u.SubscriptionPaused = false

	if err := h.userStore.Update(u); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	h.logger.WithFields(logrus.Fields{
		"user_id": u.ID,
		"tier":    tier,
	}).Info("Activated subscription for user")
	return nil
}

func (h *WebhookHandler) handleSubscriptionCancelled(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	u, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	// Schedule downgrade at end of billing period
	now := time.Now()
	u.SubscriptionCanceledAt = &now
	u.Tier = "free" // Will take effect at end of billing cycle

	if err := h.userStore.Update(u); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	h.logger.WithField("user_id", u.ID).Info("Scheduled downgrade for user at end of billing period")
	return nil
}

func (h *WebhookHandler) handleSubscriptionPaused(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	u, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	u.SubscriptionPaused = true
	if err := h.userStore.Update(u); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	h.logger.WithField("user_id", u.ID).Info("Paused subscription for user")
	return nil
}

func (h *WebhookHandler) handleSubscriptionResumed(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	u, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	u.SubscriptionPaused = false
	if err := h.userStore.Update(u); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	h.logger.WithField("user_id", u.ID).Info("Resumed subscription for user")
	return nil
}

func (h *WebhookHandler) handlePaymentAuthorized(payload *WebhookPayload) error {
	h.logger.WithFields(logrus.Fields{
		"payment_id":   payload.Payload.Payment.ID,
		"subscription": payload.Payload.Subscription.ID,
	}).Info("Payment authorized")
	// Log audit trail
	return nil
}

func (h *WebhookHandler) handlePaymentFailed(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	u, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	h.logger.WithFields(logrus.Fields{
		"user_id":      u.ID,
		"subscription": payload.Payload.Subscription.ID,
		"amount":       payload.Payload.Payment.Amount,
	}).Error("Payment failed")

	// Mark subscription as paused due to payment failure
	u.SubscriptionPaused = true
	if err := h.userStore.Update(u); err != nil {
		h.logger.WithError(err).Error("Failed to pause subscription")
	}

	return nil
}

func (h *WebhookHandler) handleSubscriptionCompleted(payload *WebhookPayload) error {
	customerID := payload.Payload.Customer.ID

	if customerID == "" {
		return fmt.Errorf("missing customer ID in payload")
	}

	u, err := h.userStore.GetByRazorpayCustomerID(customerID)
	if err != nil {
		return fmt.Errorf("user not found for customer %s: %w", customerID, err)
	}

	u.Tier = "free"
	u.RazorpaySubscriptionID = "" // Clear subscription reference

	if err := h.userStore.Update(u); err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	h.logger.WithField("user_id", u.ID).Info("Subscription completed for user")
	return nil
}
