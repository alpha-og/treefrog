package main

import (
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/alpha-og/treefrog-latex-compiler/pkg/auth"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/billing"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/user"
	"github.com/go-chi/chi/v5"
	"github.com/sirupsen/logrus"
)

var allowlistLog = logrus.WithField("component", "handlers/allowlist")

func ListAllowlistHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		allowlistStore, err := user.NewAllowlistStore(dbInstance)
		if err != nil {
			allowlistLog.WithError(err).Error("Failed to create allowlist store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		entries, err := allowlistStore.List()
		if err != nil {
			http.Error(w, "Failed to list allowlist", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(entries)
	}
}

func AddToAllowlistHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Email     string     `json:"email"`
			Tier      string     `json:"tier"`
			Reason    string     `json:"reason"`
			ExpiresAt *time.Time `json:"expires_at"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.Email == "" {
			http.Error(w, "email required", http.StatusBadRequest)
			return
		}

		if req.Tier == "" {
			req.Tier = "pro"
		}

		allowlistStore, err := user.NewAllowlistStore(dbInstance)
		if err != nil {
			allowlistLog.WithError(err).Error("Failed to create allowlist store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		entry := &user.AllowlistEntry{
			Email:     req.Email,
			Tier:      req.Tier,
			Reason:    req.Reason,
			ExpiresAt: req.ExpiresAt,
			CreatedBy: userID,
		}

		if err := allowlistStore.Create(entry); err != nil {
			http.Error(w, "Failed to add to allowlist", http.StatusInternalServerError)
			return
		}

		allowlistLog.WithFields(logrus.Fields{
			"email": req.Email,
			"tier":  req.Tier,
		}).Info("Added to allowlist")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(entry)
	}
}

func RemoveFromAllowlistHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		email := chi.URLParam(r, "email")
		if email == "" {
			http.Error(w, "email required", http.StatusBadRequest)
			return
		}

		allowlistStore, err := user.NewAllowlistStore(dbInstance)
		if err != nil {
			allowlistLog.WithError(err).Error("Failed to create allowlist store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		if err := allowlistStore.Remove(email); err != nil {
			http.Error(w, "Failed to remove from allowlist", http.StatusInternalServerError)
			return
		}

		allowlistLog.WithField("email", email).Info("Removed from allowlist")
		w.WriteHeader(http.StatusNoContent)
	}
}

func ApplyTrialCouponHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var req struct {
			Code string `json:"code"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		if req.Code == "" {
			http.Error(w, "coupon code required", http.StatusBadRequest)
			return
		}

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
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
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		coupon, err := couponStore.GetByCode(req.Code)
		if err != nil {
			http.Error(w, "Invalid coupon code", http.StatusBadRequest)
			return
		}

		if !coupon.IsActive {
			http.Error(w, "Coupon is inactive", http.StatusBadRequest)
			return
		}

		if time.Now().After(coupon.ExpiresAt) && !coupon.ExpiresAt.IsZero() {
			http.Error(w, "Coupon has expired", http.StatusBadRequest)
			return
		}

		if coupon.UsedCount >= coupon.MaxUses && coupon.MaxUses > 0 {
			http.Error(w, "Coupon usage limit exceeded", http.StatusBadRequest)
			return
		}

		if coupon.OneTimeUse {
			used, err := couponStore.HasUserUsedCoupon(userRec.ID, coupon.ID)
			if err != nil {
				http.Error(w, "Database error", http.StatusInternalServerError)
				return
			}
			if used {
				http.Error(w, "You have already used this coupon", http.StatusBadRequest)
				return
			}
		}

		trialStore, err := user.NewTrialStore(dbInstance)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		switch coupon.Type {
		case user.CouponTypeTrial:
			trialDays := coupon.TrialDays
			if trialDays == 0 {
				trialDays = 14
			}

			trial, err := trialStore.Create(userRec.ID, coupon.TierUpgrade, trialDays, coupon.Code)
			if err != nil {
				http.Error(w, "Failed to create trial", http.StatusInternalServerError)
				return
			}

			userRec.Tier = coupon.TierUpgrade
			if err := userStore.Update(userRec); err != nil {
				allowlistLog.WithError(err).Error("Failed to update user tier")
			}

			if err := couponStore.IncrementUsage(coupon.ID); err != nil {
				allowlistLog.WithError(err).Warn("Failed to increment coupon usage")
			}

			if coupon.OneTimeUse {
				couponStore.RecordRedemption(userRec.ID, coupon.ID)
			}

			allowlistLog.WithFields(logrus.Fields{
				"user_id":    userID,
				"trial_days": trialDays,
				"tier":       coupon.TierUpgrade,
			}).Info("Trial coupon applied")

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"type":       "trial",
				"tier":       coupon.TierUpgrade,
				"trial_days": trialDays,
				"ends_at":    trial.EndsAt,
				"message":    "Trial started successfully",
			})

		case user.CouponTypeUpgrade:
			userRec.Tier = coupon.TierUpgrade
			if err := userStore.Update(userRec); err != nil {
				http.Error(w, "Failed to upgrade tier", http.StatusInternalServerError)
				return
			}

			if err := couponStore.IncrementUsage(coupon.ID); err != nil {
				allowlistLog.WithError(err).Warn("Failed to increment coupon usage")
			}

			if coupon.OneTimeUse {
				couponStore.RecordRedemption(userRec.ID, coupon.ID)
			}

			allowlistLog.WithFields(logrus.Fields{
				"user_id": userID,
				"tier":    coupon.TierUpgrade,
			}).Info("Upgrade coupon applied")

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"type":    "upgrade",
				"tier":    coupon.TierUpgrade,
				"message": "Account upgraded successfully",
			})

		case user.CouponTypeDiscount:
			if coupon.PlanID == "" {
				http.Error(w, "Invalid coupon configuration", http.StatusBadRequest)
				return
			}

			razorpayService := billing.NewRazorpayService(
				getEnvOrDefault("RAZORPAY_KEY_ID", ""),
				getEnvOrDefault("RAZORPAY_KEY_SECRET", ""),
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
					allowlistLog.WithError(err).Error("Failed to update user with customer ID")
				}
			}

			plan, ok := billing.Plans[coupon.PlanID]
			if !ok {
				http.Error(w, "Invalid plan", http.StatusBadRequest)
				return
			}

			checkoutURL, err := razorpayService.CreateSubscriptionWithCoupon(plan.ID, customerID, coupon.Code)
			if err != nil {
				http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
				return
			}

			if err := couponStore.IncrementUsage(coupon.ID); err != nil {
				allowlistLog.WithError(err).Warn("Failed to increment coupon usage")
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"type":             "discount",
				"checkout_url":     checkoutURL,
				"discount_percent": coupon.DiscountPct,
				"plan":             coupon.PlanID,
			})

		default:
			http.Error(w, "Unknown coupon type", http.StatusBadRequest)
		}
	}
}

func CheckAllowlistHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		userRec, err := userStore.GetByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		allowlistStore, err := user.NewAllowlistStore(dbInstance)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		entry, err := allowlistStore.GetByEmail(userRec.Email)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"allowlisted": false,
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"allowlisted": true,
			"tier":        entry.Tier,
			"reason":      entry.Reason,
			"expires_at":  entry.ExpiresAt,
		})
	}
}

func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
