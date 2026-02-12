package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/alpha-og/treefrog-latex-compiler/pkg/auth"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/build"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/user"
	"github.com/go-chi/chi/v5"
)

// CreateBuildHandler creates a new build from uploaded files
// Returns an http.HandlerFunc that handles POST /api/build
func CreateBuildHandler(db interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Issue #9 - input validation on file size
		if err := r.ParseMultipartForm(build.MaxFileSize); err != nil {
			http.Error(w, fmt.Sprintf("File too large (max %dMB)", build.MaxFileSize/(1024*1024)), http.StatusBadRequest)
			return
		}

		// Get build options
		engine := build.Engine(r.FormValue("engine"))
		mainFile := r.FormValue("main_file")
		shellEscape := r.FormValue("shell_escape") == "true"

		if engine == "" {
			engine = build.EnginePDFLaTeX
		}
		if mainFile == "" {
			mainFile = "main.tex"
		}

		// Validate input (Issue #9)
		if !build.ValidEngines[string(engine)] {
			http.Error(w, "Invalid engine", http.StatusBadRequest)
			return
		}

		if hasPathTraversal(mainFile) {
			http.Error(w, "Invalid main_file: path traversal not allowed", http.StatusBadRequest)
			return
		}

		// Check limits
		buildStore := build.NewStoreWithDB(dbInstance)
		userStore, _ := user.NewStore(dbInstance)
		limitService := build.NewLimitService(buildStore, userStore)

		limitCheck, err := limitService.CanCreateBuild(userID)
		if err != nil {
			log.Printf("Limit check failed: %v", err)
			http.Error(w, "Failed to check limits", http.StatusInternalServerError)
			return
		}

		if !limitCheck.Allowed {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(limitCheck)
			return
		}

		// Generate build ID
		buildID := fmt.Sprintf("bld_%d", time.Now().UnixNano())

		// Create build directory
		workDir := os.Getenv("COMPILER_WORKDIR")
		if workDir == "" {
			workDir = "/tmp/treefrog-builds"
		}
		buildDir := filepath.Join(workDir, userID, buildID)

		if err := os.MkdirAll(buildDir, 0755); err != nil {
			log.Printf("Failed to create build directory: %v", err)
			http.Error(w, "Failed to create build directory", http.StatusInternalServerError)
			return
		}

		// Save uploaded file
		file, fileHeader, err := r.FormFile("file")
		if err != nil {
			log.Printf("Failed to get file: %v", err)
			http.Error(w, "No file uploaded", http.StatusBadRequest)
			return
		}
		defer file.Close()

		// Validate file size (Issue #9)
		if fileHeader.Size > build.MaxFileSize {
			http.Error(w, fmt.Sprintf("File too large (max %dMB)", build.MaxFileSize/(1024*1024)), http.StatusBadRequest)
			return
		}

		zipPath := filepath.Join(buildDir, "source.zip")
		dst, err := os.Create(zipPath)
		if err != nil {
			log.Printf("Failed to create zip file: %v", err)
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			log.Printf("Failed to save zip: %v", err)
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}

		// Create build record
		buildRec := &build.Build{
			ID:             buildID,
			UserID:         userID,
			Status:         build.StatusPending,
			Engine:         engine,
			MainFile:       mainFile,
			DirPath:        buildDir,
			ShellEscape:    shellEscape && false, // Disable shell escape by default for security
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
			ExpiresAt:      time.Now().Add(24 * time.Hour),
			LastAccessedAt: time.Now(),
			StorageBytes:   0,
		}

		// Validate build (Issue #9)
		if err := buildRec.Validate(); err != nil {
			http.Error(w, fmt.Sprintf("Invalid build: %v", err), http.StatusBadRequest)
			return
		}

		if err := buildStore.Create(buildRec); err != nil {
			log.Printf("Failed to create build record: %v", err)
			http.Error(w, "Failed to create build", http.StatusInternalServerError)
			return
		}

		// Queue build for compilation (Issue #8 - job queue)
		buildQueue.Enqueue(buildRec)

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
		buildStore.Update(buildRec)

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
		buildStore.Update(buildRec)

		// Async hard delete
		go func() {
			os.RemoveAll(buildRec.DirPath)
			buildStore.Delete(buildRec.ID)
		}()

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

		userProfile, err := userStore.GetByClerkID(userID)
		if err != nil {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":           userProfile.ClerkID,
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
			filePath = buildRecord.BuildLog
		default:
			http.Error(w, "Unknown resource", http.StatusBadRequest)
			return
		}

		// Check if file exists
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
		// SyncTeX is served through ServePDFHandler by specifying resource=synctex
		http.Error(w, "Use /api/build/{id}/synctex?token=... to download", http.StatusNotImplemented)
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

// hasPathTraversal checks if a filename contains path traversal sequences
func hasPathTraversal(filename string) bool {
	return containsString(filename, "..") || containsString(filename, "/") || containsString(filename, "\\")
}

// containsString checks if a string contains a substring
func containsString(s, substr string) bool {
	for i := 0; i < len(s); i++ {
		if len(substr) > len(s)-i {
			return false
		}
		match := true
		for j := 0; j < len(substr); j++ {
			if s[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}
