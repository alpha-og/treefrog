package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/alpha-og/treefrog/apps/compiler/internal/auth"
	"github.com/alpha-og/treefrog/apps/compiler/internal/build"
	"github.com/alpha-og/treefrog/apps/compiler/internal/log"
	"github.com/alpha-og/treefrog/apps/compiler/internal/user"
	"github.com/alpha-og/treefrog/packages/go/security"
	"github.com/alpha-og/treefrog/packages/go/validation"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

var buildLog = logrus.WithField("component", "handlers/build")

func CreateBuildHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if !validation.ValidateUUID(userID) {
			buildLog.WithField("user_id", userID).Warn("Invalid user ID format")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if err := r.ParseMultipartForm(build.MaxFileSize); err != nil {
			http.Error(w, fmt.Sprintf("File too large (max %dMB)", build.MaxFileSize/(1024*1024)), http.StatusBadRequest)
			return
		}

		engine := build.Engine(r.FormValue("engine"))
		mainFile := r.FormValue("main_file")
		shellEscape := r.FormValue("shell_escape") == "true"

		if engine == "" {
			engine = build.EnginePDFLaTeX
		}
		if mainFile == "" {
			mainFile = "main.tex"
		}

		if !build.ValidEngines[string(engine)] {
			http.Error(w, "Invalid engine", http.StatusBadRequest)
			return
		}

		// Shell-escape is a significant security risk even for enterprise tier.
		// It allows arbitrary command execution during LaTeX compilation.
		// Enterprise users should use this feature with caution and only with trusted documents.
		// WARNING: Documents using shell-escape can execute arbitrary commands on the server.
		if shellEscape {
			userTier := auth.GetUserTier(r)
			if userTier != "enterprise" {
				http.Error(w, "Shell-escape feature requires enterprise tier", http.StatusForbidden)
				return
			}
			buildLog.WithField("user_id", userID).Warn("Shell-escape enabled for enterprise user - security risk")
		}

		if security.HasPathTraversal(mainFile) {
			http.Error(w, "Invalid main_file: path traversal not allowed", http.StatusBadRequest)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		userStore, err := user.NewStore(dbInstance)
		if err != nil {
			buildLog.WithError(err).Error("Failed to create user store")
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
		limitService := build.NewLimitService(buildStore, userStore)

		limitCheck, err := limitService.CanCreateBuild(userID)
		if err != nil {
			buildLog.WithError(err).WithField("user_id", userID).Error("Limit check failed")
			http.Error(w, "Failed to check limits", http.StatusInternalServerError)
			return
		}

		if !limitCheck.Allowed {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(limitCheck)
			return
		}

		buildID := "bld_" + uuid.New().String()

		workDir := os.Getenv("COMPILER_WORKDIR")
		if workDir == "" {
			workDir = "/tmp/treefrog-builds"
		}
		buildDir := filepath.Join(workDir, userID, buildID)

		if err := os.MkdirAll(buildDir, 0755); err != nil {
			buildLog.WithError(err).WithField("path", buildDir).Error("Failed to create build directory")
			http.Error(w, "Failed to create build directory", http.StatusInternalServerError)
			return
		}

		file, fileHeader, err := r.FormFile("file")
		if err != nil {
			buildLog.WithError(err).Error("Failed to get uploaded file")
			http.Error(w, "No file uploaded", http.StatusBadRequest)
			return
		}
		defer file.Close()

		if fileHeader.Size > build.MaxFileSize {
			http.Error(w, fmt.Sprintf("File too large (max %dMB)", build.MaxFileSize/(1024*1024)), http.StatusBadRequest)
			return
		}

		zipPath := filepath.Join(buildDir, "source.zip")
		dst, err := os.Create(zipPath)
		if err != nil {
			buildLog.WithError(err).WithField("path", zipPath).Error("Failed to create zip file")
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			buildLog.WithError(err).Error("Failed to save zip file")
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		buildRec := &build.Build{
			ID:             buildID,
			UserID:         userID,
			Status:         build.StatusPending,
			Engine:         engine,
			MainFile:       mainFile,
			DirPath:        buildDir,
			ShellEscape:    shellEscape,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
			ExpiresAt:      time.Now().Add(24 * time.Hour),
			LastAccessedAt: time.Now(),
			StorageBytes:   0,
		}

		if err := buildRec.Validate(); err != nil {
			http.Error(w, fmt.Sprintf("Invalid build: %v", err), http.StatusBadRequest)
			return
		}

		if err := buildStore.Create(buildRec); err != nil {
			buildLog.WithError(err).Error("Failed to create build record")
			http.Error(w, "Failed to create build", http.StatusInternalServerError)
			return
		}

		buildQueue.Enqueue(buildRec)

		buildLog.WithFields(logrus.Fields{
			"build_id": buildID,
			"user_id":  userID,
			"engine":   engine,
		}).Info("Build created")

		auditLogger.Log(log.AuditEntry{
			UserID:       userID,
			Action:       "build_created",
			ResourceType: "build",
			ResourceID:   buildID,
			IPAddress:    r.RemoteAddr,
			UserAgent:    r.UserAgent(),
			Status:       "success",
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(build.BuildResponse{
			ID:        buildRec.ID,
			Status:    buildRec.Status,
			Engine:    buildRec.Engine,
			MainFile:  buildRec.MainFile,
			CreatedAt: buildRec.CreatedAt,
			ExpiresAt: buildRec.ExpiresAt,
		})
	}
}

// ListBuildsHandler lists builds for the user with pagination
// Returns an http.HandlerFunc that handles GET /api/build
func ListBuildsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Get pagination parameters with validation
		page := 1
		pageSize := 20
		if p := r.URL.Query().Get("page"); p != "" {
			if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
				page = parsed
			}
		}
		if ps := r.URL.Query().Get("page_size"); ps != "" {
			if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
				pageSize = parsed
			}
		}

		buildStore := build.NewStoreWithDB(dbInstance)

		// Get total count
		total, err := buildStore.CountByUser(userID)
		if err != nil {
			http.Error(w, "Failed to get builds", http.StatusInternalServerError)
			return
		}

		// Get paginated results
		builds, err := buildStore.ListByUser(userID, page, pageSize)
		if err != nil {
			http.Error(w, "Failed to get builds", http.StatusInternalServerError)
			return
		}

		totalPages := (total + pageSize - 1) / pageSize
		var responses []build.BuildResponse
		for _, b := range builds {
			responses = append(responses, build.BuildResponse{
				ID:        b.ID,
				Status:    b.Status,
				Engine:    b.Engine,
				MainFile:  b.MainFile,
				CreatedAt: b.CreatedAt,
				ExpiresAt: b.ExpiresAt,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(build.BuildListResponse{
			Builds:     responses,
			Total:      total,
			Page:       page,
			PageSize:   pageSize,
			TotalPages: totalPages,
		})
	}
}

// GetBuildHandler retrieves a specific build
// Returns an http.HandlerFunc that handles GET /api/build/{id}
func GetBuildHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		buildRec, err := buildStore.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		// STRICT USER ISOLATION
		if buildRec.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Update last accessed
		buildRec.LastAccessedAt = time.Now()
		if err := buildStore.Update(buildRec); err != nil {
			buildLog.WithError(err).WithField("build_id", buildID).Warn("Failed to update last accessed time")
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(buildRec)
	}
}

// GetStatusHandler gets the status of a build
// Returns an http.HandlerFunc that handles GET /api/build/{id}/status
func GetStatusHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		buildRec, err := buildStore.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		// STRICT USER ISOLATION
		if buildRec.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		response := build.StatusResponse{
			ID:        buildRec.ID,
			Status:    buildRec.Status,
			Engine:    buildRec.Engine,
			CreatedAt: buildRec.CreatedAt,
		}

		if buildRec.Status == build.StatusCompleted {
			response.Progress = 100
			response.CompletedAt = &buildRec.UpdatedAt
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// GetLogHandler gets the build log
// Returns an http.HandlerFunc that handles GET /api/build/{id}/log
func GetLogHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		buildRec, err := buildStore.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		// STRICT USER ISOLATION
		if buildRec.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(buildRec.BuildLog))
	}
}

// DeleteBuildHandler deletes a build
// Returns an http.HandlerFunc that handles DELETE /api/build/{id}
func DeleteBuildHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		buildRec, err := buildStore.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		// STRICT USER ISOLATION
		if buildRec.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Soft delete
		buildRec.Status = build.StatusDeleted
		buildRec.ExpiresAt = time.Now()
		if err := buildStore.Update(buildRec); err != nil {
			buildLog.WithError(err).WithField("build_id", buildID).Error("Failed to update build status")
		}

		// Async hard delete with context timeout
		go func() {
			defer func() {
				if recovered := recover(); recovered != nil {
					buildLog.WithField("panic", recovered).Error("Panic in async delete goroutine")
				}
			}()
			os.RemoveAll(buildRec.DirPath)
			buildStore.Delete(buildRec.ID)
		}()

		auditLogger.Log(log.AuditEntry{
			UserID:       userID,
			Action:       "build_deleted",
			ResourceType: "build",
			ResourceID:   buildID,
			IPAddress:    r.RemoteAddr,
			UserAgent:    r.UserAgent(),
			Status:       "success",
		})

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "deleted",
			"message": "Build will be permanently deleted shortly",
		})
	}
}

// GetCurrentUserHandler gets the current authenticated user's profile
func GetCurrentUserHandler() http.HandlerFunc {
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

		userProfile, err := userStore.GetByID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":           userProfile.ID,
			"email":        userProfile.Email,
			"name":         userProfile.Name,
			"tier":         userProfile.Tier,
			"storage_used": userProfile.StorageUsedBytes,
			"subscription": map[string]interface{}{
				"paused":   userProfile.SubscriptionPaused,
				"canceled": userProfile.SubscriptionCanceledAt != nil,
			},
		})
	}
}

// GetUserUsageHandler gets the user's build usage stats
// Returns an http.HandlerFunc that handles GET /api/user/usage
func GetUserUsageHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		userStore, _ := user.NewStore(dbInstance)
		limitService := build.NewLimitService(buildStore, userStore)

		usage, err := limitService.GetUserUsage(userID)
		if err != nil {
			http.Error(w, "Failed to get usage", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(usage)
	}
}

// GetSignedPDFURLHandler generates a signed URL for build artifacts
// Returns an http.HandlerFunc that handles POST /api/build/{id}/signed-url
func GetSignedPDFURLHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		// Get the build to verify user ownership and status
		buildRecord, err := buildQueue.GetStore().Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		// Strict user isolation - verify user owns this build
		if buildRecord.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Check if build is completed
		if buildRecord.Status != build.StatusCompleted {
			http.Error(w, "Build not completed", http.StatusBadRequest)
			return
		}

		// Create signed URL signer
		signer, err := auth.NewSignedURLSigner()
		if err != nil {
			logger.WithError(err).Error("Failed to create signed URL signer")
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		// Determine resource type from query parameter or default to PDF
		resource := r.URL.Query().Get("resource")
		if resource == "" {
			resource = "pdf"
		}

		// Validate resource type
		validResources := map[string]bool{"pdf": true, "synctex": true, "log": true}
		if !validResources[resource] {
			http.Error(w, "Invalid resource type", http.StatusBadRequest)
			return
		}

		// Generate signed URL
		signedURL, err := signer.GenerateURL(buildID, resource, userID)
		if err != nil {
			logger.WithError(err).Error("Failed to generate signed URL")
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		expiresIn := signer.GetExpirationTime()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"url":        signedURL,
			"expires_in": expiresIn.Seconds(),
			"build_id":   buildID,
			"resource":   resource,
		})
	}
}

// ServePDFHandler serves build artifacts (PDF, logs, SyncTeX) via signed URLs
// Returns an http.HandlerFunc that handles GET /api/build/{id}/{resource}
func ServePDFHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildID := chi.URLParam(r, "id")
		resource := chi.URLParam(r, "resource")

		if buildID == "" || resource == "" {
			http.Error(w, "Build ID and resource required", http.StatusBadRequest)
			return
		}

		// Get token from query params
		token := r.URL.Query().Get("token")
		if token == "" {
			http.Error(w, "Missing token", http.StatusBadRequest)
			return
		}

		// Get the build to verify it exists
		buildRecord, err := buildQueue.GetStore().Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		// Strict user isolation - verify user owns this build
		if buildRecord.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		// Verify signed URL
		signer, err := auth.NewSignedURLSigner()
		if err != nil {
			logger.WithError(err).Error("Failed to create signed URL signer")
			http.Error(w, "Internal server error", http.StatusInternalServerError)
			return
		}

		valid, err := signer.VerifyURL(token, buildID, resource, userID)
		if err != nil || !valid {
			logger.WithField("error", err).Warn("Invalid or expired token")
			http.Error(w, "Invalid or expired token", http.StatusForbidden)
			return
		}

		// Determine file path based on resource type
		var filePath string
		switch resource {
		case "pdf":
			filePath = buildRecord.PDFPath
		case "synctex":
			filePath = buildRecord.SyncTeXPath
		case "log":
			// BuildLog is text content, not a file path
			if buildRecord.BuildLog == "" {
				http.Error(w, "Log not available", http.StatusNotFound)
				return
			}
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.log", buildID))
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(buildRecord.BuildLog))
			return
		default:
			http.Error(w, "Unknown resource", http.StatusBadRequest)
			return
		}

		// Check if file exists
		if filePath == "" {
			http.Error(w, "File not available", http.StatusNotFound)
			return
		}
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}

		// Set appropriate content type and serve file
		w.Header().Set("Content-Type", getContentType(resource))
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.%s", buildID, getFileExtension(resource)))
		http.ServeFile(w, r, filePath)
	}
}

// ServeSyncTeXHandler serves the SyncTeX data
// Returns an http.HandlerFunc that handles GET /api/build/{id}/synctex
func ServeSyncTeXHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		buildRecord, err := buildStore.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		if buildRecord.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		if buildRecord.SyncTeXPath == "" {
			http.Error(w, "SyncTeX not available", http.StatusNotFound)
			return
		}

		if _, err := os.Stat(buildRecord.SyncTeXPath); os.IsNotExist(err) {
			http.Error(w, "SyncTeX file not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/octet-stream")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.synctex.gz", buildID))
		http.ServeFile(w, r, buildRecord.SyncTeXPath)
	}
}

// getContentType returns the appropriate MIME type for a resource
func getContentType(resource string) string {
	switch resource {
	case "pdf":
		return "application/pdf"
	case "synctex":
		return "application/octet-stream"
	case "log":
		return "text/plain; charset=utf-8"
	default:
		return "application/octet-stream"
	}
}

// getFileExtension returns the appropriate file extension for a resource
func getFileExtension(resource string) string {
	switch resource {
	case "pdf":
		return "pdf"
	case "synctex":
		return "synctex.gz"
	case "log":
		return "log"
	default:
		return "bin"
	}
}
