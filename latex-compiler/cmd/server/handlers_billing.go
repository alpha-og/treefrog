package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/alpha-og/treefrog-latex-compiler/pkg/auth"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/billing"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/user"
)

// CreateSubscriptionHandler creates a subscription for a user
// Returns an http.HandlerFunc that handles POST /api/subscription/create
func CreateSubscriptionHandler(db interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
		userStore, _ := user.NewStore(dbInstance)
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
			customerID, err := razorpayService.CreateCustomer(
				userRec.Email,
				userRec.Name,
			)
			if err != nil {
				http.Error(w, "Failed to create customer", http.StatusInternalServerError)
				return
			}
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

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"checkout_url": checkoutURL,
			"plan":         req.PlanID,
		})
	}
}

// CancelSubscriptionHandler cancels a user's subscription
// Returns an http.HandlerFunc that handles POST /api/subscription/cancel
func CancelSubscriptionHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userStore, _ := user.NewStore(dbInstance)
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

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "canceled",
			"message": "Subscription will be canceled at end of billing period",
		})
	}
}

// GetSubscriptionStatusHandler retrieves subscription status
// Returns an http.HandlerFunc that handles GET /api/subscription/status
func GetSubscriptionStatusHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userStore, _ := user.NewStore(dbInstance)
		userRec, err := userStore.GetByClerkID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		if userRec.RazorpaySubscriptionID == "" {
			w.Header().Set("Content-Type", "application/json")
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

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"tier":          userRec.Tier,
			"status":        subscription.Status,
			"current_start": subscription.CurrentStart,
			"current_end":   subscription.CurrentEnd,
			"paid_count":    subscription.PaidCount,
			"total_count":   subscription.TotalCount,
			"canceled_at":   userRec.SubscriptionCanceledAt,
			"paused":        userRec.SubscriptionPaused,
		})
	}
}

// RedeemCouponHandler redeems a coupon for subscription
// Returns an http.HandlerFunc that handles POST /api/coupon/redeem
func RedeemCouponHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		// Validate inputs
		if req.CouponCode == "" || req.PlanID == "" {
			http.Error(w, "coupon_code and plan_id required", http.StatusBadRequest)
			return
		}

		plan, ok := billing.Plans[req.PlanID]
		if !ok {
			http.Error(w, "Invalid plan", http.StatusBadRequest)
			return
		}

		// Get user
		userStore, _ := user.NewStore(dbInstance)
		userRec, err := userStore.GetByClerkID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		// Validate coupon
		couponStore, _ := user.NewCouponStore(dbInstance)
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
			customerID, err := razorpayService.CreateCustomer(
				userRec.Email,
				userRec.Name,
			)
			if err != nil {
				http.Error(w, "Failed to create customer", http.StatusInternalServerError)
				return
			}
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
}

// RazorpayWebhookHandler processes Razorpay webhook events
// Returns an http.HandlerFunc that handles POST /webhooks/razorpay
func RazorpayWebhookHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userStore, _ := user.NewStore(dbInstance)
		razorpayService := billing.NewRazorpayService(
			os.Getenv("RAZORPAY_KEY_ID"),
			os.Getenv("RAZORPAY_KEY_SECRET"),
		)

		webhookHandler := billing.NewWebhookHandler(razorpayService, userStore, logger)
		webhookHandler.ServeHTTP(w, r)
	}
}
