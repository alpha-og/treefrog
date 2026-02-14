package main

import (
	"encoding/json"
	"net/http"

	"github.com/alpha-og/treefrog/apps/compiler/internal/build"
	"github.com/alpha-og/treefrog/apps/compiler/internal/user"
	"github.com/go-chi/chi/v5"
	"github.com/sirupsen/logrus"
)

var adminLog = logrus.WithField("component", "handlers/admin")

func mustGetUserID(r *http.Request) string {
	id, _ := r.Context().Value("userID").(string)
	return id
}

func ListUsersHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			adminLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		users, err := userStore.GetAll()
		if err != nil {
			http.Error(w, "Failed to list users", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(users)
	}
}

func GetUserHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := chi.URLParam(r, "id")
		if userID == "" {
			http.Error(w, "User ID required", http.StatusBadRequest)
			return
		}

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			adminLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		userRec, err := userStore.GetByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(userRec)
	}
}

func UpdateUserTierHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := chi.URLParam(r, "id")
		if userID == "" {
			http.Error(w, "User ID required", http.StatusBadRequest)
			return
		}

		var req struct {
			Tier string `json:"tier"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		validTiers := map[string]bool{"free": true, "pro": true, "enterprise": true}
		if !validTiers[req.Tier] {
			http.Error(w, "Invalid tier", http.StatusBadRequest)
			return
		}

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			adminLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		userRec, err := userStore.GetByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		userRec.Tier = req.Tier
		if err := userStore.Update(userRec); err != nil {
			http.Error(w, "Failed to update user", http.StatusInternalServerError)
			return
		}

		adminLog.WithFields(logrus.Fields{
			"admin_id": mustGetUserID(r),
			"user_id":  userID,
			"new_tier": req.Tier,
		}).Info("User tier updated by admin")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(userRec)
	}
}

func SetUserAdminHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID := chi.URLParam(r, "id")
		if userID == "" {
			http.Error(w, "User ID required", http.StatusBadRequest)
			return
		}

		var req struct {
			IsAdmin bool `json:"is_admin"`
		}

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			adminLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		userRec, err := userStore.GetByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		userRec.IsAdmin = req.IsAdmin
		if err := userStore.Update(userRec); err != nil {
			http.Error(w, "Failed to update user", http.StatusInternalServerError)
			return
		}

		adminLog.WithFields(logrus.Fields{
			"admin_id": mustGetUserID(r),
			"user_id":  userID,
			"is_admin": req.IsAdmin,
		}).Info("User admin status updated by admin")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(userRec)
	}
}

type AdminStats struct {
	TotalUsers      int64   `json:"total_users"`
	ActiveUsers     int64   `json:"active_users"`
	ProUsers        int64   `json:"pro_users"`
	EnterpriseUsers int64   `json:"enterprise_users"`
	TotalBuilds     int64   `json:"total_builds"`
	MonthlyBuilds   int64   `json:"monthly_builds"`
	ActiveBuilds    int64   `json:"active_builds"`
	TotalStorageGB  float64 `json:"total_storage_gb"`
}

func GetAdminStatsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildStore := build.NewStoreWithDB(dbInstance)
		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		stats := AdminStats{}

		users, err := userStore.GetAll()
		if err == nil {
			stats.TotalUsers = int64(len(users))
			for _, u := range users {
				if u.Tier == "pro" {
					stats.ProUsers++
				} else if u.Tier == "enterprise" {
					stats.EnterpriseUsers++
				}
			}
		}

		totalBuilds, err := buildStore.CountAll()
		if err == nil {
			stats.TotalBuilds = totalBuilds
		}

		monthlyBuilds, err := buildStore.CountAllMonthly()
		if err == nil {
			stats.MonthlyBuilds = monthlyBuilds
		}

		activeBuilds, err := buildStore.CountAllActive()
		if err == nil {
			stats.ActiveBuilds = activeBuilds
		}

		totalStorage, err := buildStore.GetTotalStorageAll()
		if err == nil {
			stats.TotalStorageGB = float64(totalStorage) / (1024 * 1024 * 1024)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(stats)
	}
}
