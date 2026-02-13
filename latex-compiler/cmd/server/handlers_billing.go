package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/alpha-og/treefrog-latex-compiler/pkg/auth"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/billing"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/log"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/user"
	"github.com/sirupsen/logrus"
)

var billingLog = logrus.WithField("component", "handlers/billing")

// CreateSubscriptionHandler creates a subscription for a user
func CreateSubscriptionHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			PlanID string `json:"plan_id"`
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

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			billingLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		userRec, err := userStore.GetByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		razorpayService := billing.NewRazorpayService(
			os.Getenv("RAZORPAY_KEY_ID"),
			os.Getenv("RAZORPAY_KEY_SECRET"),
		)

		customerID := userRec.RazorpayCustomerID
		if customerID == "" {
			customerID, err = razorpayService.CreateCustomer(userRec.Email, userRec.Name)
			if err != nil {
				http.Error(w, "Failed to create customer", http.StatusInternalServerError)
				return
			}
			userRec.RazorpayCustomerID = customerID
			if err := userStore.Update(userRec); err != nil {
				billingLog.WithError(err).Error("Failed to update user with customer ID")
			}
		}

		checkoutURL, err := razorpayService.CreateSubscriptionLink(plan.ID, customerID)
		if err != nil {
			http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
			return
		}

		billingLog.WithFields(logrus.Fields{
			"user_id":   userID,
			"plan_id":   req.PlanID,
			"plan_name": plan.ID,
		}).Info("Subscription created")

		auditLogger.Log(log.AuditEntry{
			UserID:       userRec.ID,
			Action:       "subscription_created",
			ResourceType: "subscription",
			ResourceID:   plan.ID,
			IPAddress:    r.RemoteAddr,
			UserAgent:    r.UserAgent(),
			Status:       "success",
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"checkout_url": checkoutURL,
			"plan":         req.PlanID,
		})
	}
}

// CancelSubscriptionHandler cancels a user's subscription
func CancelSubscriptionHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			billingLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		userRec, err := userStore.GetByID(userID)
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

		billingLog.WithField("user_id", userID).Info("Subscription cancelled")

		auditLogger.Log(log.AuditEntry{
			UserID:       userRec.ID,
			Action:       "subscription_cancelled",
			ResourceType: "subscription",
			ResourceID:   userRec.RazorpaySubscriptionID,
			IPAddress:    r.RemoteAddr,
			UserAgent:    r.UserAgent(),
			Status:       "success",
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "canceled",
			"message": "Subscription will be canceled at end of billing period",
		})
	}
}

// GetSubscriptionStatusHandler retrieves subscription status
func GetSubscriptionStatusHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			billingLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		userRec, err := userStore.GetByID(userID)
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

		if req.CouponCode == "" || req.PlanID == "" {
			http.Error(w, "coupon_code and plan_id required", http.StatusBadRequest)
			return
		}

		plan, ok := billing.Plans[req.PlanID]
		if !ok {
			http.Error(w, "Invalid plan", http.StatusBadRequest)
			return
		}

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			billingLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		userRec, err := userStore.GetByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		couponStore, err := user.NewCouponStore(dbInstance)
		if err != nil {
			billingLog.WithError(err).Error("Failed to create coupon store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		coupon, err := user.ValidateCoupon(couponStore, req.CouponCode, req.PlanID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid coupon: %v", err), http.StatusBadRequest)
			return
		}

		razorpayService := billing.NewRazorpayService(
			os.Getenv("RAZORPAY_KEY_ID"),
			os.Getenv("RAZORPAY_KEY_SECRET"),
		)

		customerID := userRec.RazorpayCustomerID
		if customerID == "" {
			customerID, err = razorpayService.CreateCustomer(userRec.Email, userRec.Name)
			if err != nil {
				http.Error(w, "Failed to create customer", http.StatusInternalServerError)
				return
			}
			userRec.RazorpayCustomerID = customerID
			if err := userStore.Update(userRec); err != nil {
				billingLog.WithError(err).Error("Failed to update user with customer ID")
			}
		}

		checkoutURL, err := razorpayService.CreateSubscriptionWithCoupon(plan.ID, customerID, req.CouponCode)
		if err != nil {
			http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
			return
		}

		if err := couponStore.IncrementUsage(coupon.ID); err != nil {
			billingLog.WithError(err).WithField("coupon_id", coupon.ID).Warn("Failed to increment coupon usage")
		}

		billingLog.WithFields(logrus.Fields{
			"user_id":      userID,
			"coupon_code":  req.CouponCode,
			"discount_pct": coupon.DiscountPct,
		}).Info("Coupon redeemed")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"checkout_url":     checkoutURL,
			"plan":             req.PlanID,
			"discount_percent": coupon.DiscountPct,
		})
	}
}

// RazorpayWebhookHandler processes Razorpay webhook events
func RazorpayWebhookHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			billingLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		razorpayService := billing.NewRazorpayService(
			os.Getenv("RAZORPAY_KEY_ID"),
			os.Getenv("RAZORPAY_KEY_SECRET"),
		)

		webhookHandler := billing.NewWebhookHandler(razorpayService, userStore, logger)
		webhookHandler.ServeHTTP(w, r)
	}
}
