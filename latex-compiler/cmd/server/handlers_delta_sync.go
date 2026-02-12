package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/alpha-og/treefrog-latex-compiler/pkg/auth"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/build"
	"github.com/go-chi/chi/v5"
)

// DeltaSyncInitRequest initializes delta-sync for a build
type DeltaSyncInitRequest struct {
	ProjectID     string            `json:"projectId"`
	ProjectName   string            `json:"projectName"`
	MainFile      string            `json:"mainFile"`
	Engine        string            `json:"engine"`
	ShellEscape   bool              `json:"shellEscape"`
	FileChecksums map[string]string `json:"fileChecksums"` // path -> checksum
}

// DeltaSyncInitResponse returns existing cached files
type DeltaSyncInitResponse struct {
	BuildID       string                            `json:"buildId"`
	ExistingFiles map[string]map[string]interface{} `json:"existingFiles"` // path -> {checksum, size}
}

// FileMetadata stores file info for caching
type FileMetadata struct {
	Checksum string `json:"checksum"`
	Size     int64  `json:"size"`
}

// InitDeltaSyncHandler initializes a delta-sync build
// POST /api/builds/init
func InitDeltaSyncHandler(db interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		var req DeltaSyncInitRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Invalid request", http.StatusBadRequest)
			return
		}

		// Validate input
		if req.ProjectID == "" || req.ProjectName == "" {
			http.Error(w, "Missing projectId or projectName", http.StatusBadRequest)
			return
		}

		// Generate buildID
		buildID := fmt.Sprintf("bld_%s_%d", req.ProjectID[:8], time.Now().UnixNano())

		// Create build directory
		workDir := os.Getenv("COMPILER_WORKDIR")
		if workDir == "" {
			workDir = "/tmp/treefrog-builds"
		}
		buildDir := filepath.Join(workDir, userID, buildID)

		if err := os.MkdirAll(buildDir, 0755); err != nil {
			logger.Errorf("Failed to create build directory: %v", err)
			http.Error(w, "Failed to initialize build", http.StatusInternalServerError)
			return
		}

		// Get existing cached files for this project
		cacheFile := filepath.Join(workDir, userID, fmt.Sprintf(".cache_%s.json", req.ProjectID))
		existingFiles := make(map[string]FileMetadata)

		if data, err := os.ReadFile(cacheFile); err == nil {
			json.Unmarshal(data, &existingFiles)
		}

		// Build response with existing cached files
		existingFilesResponse := make(map[string]map[string]interface{})
		for path, meta := range existingFiles {
			existingFilesResponse[path] = map[string]interface{}{
				"checksum": meta.Checksum,
				"size":     meta.Size,
			}
		}

		response := DeltaSyncInitResponse{
			BuildID:       buildID,
			ExistingFiles: existingFilesResponse,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

		logger.Infof("Delta-sync build initialized: %s for project %s", buildID, req.ProjectID)
	}
}

// DeltaSyncUploadRequest contains metadata for uploaded files
type DeltaSyncUploadRequest struct {
	CachedFiles map[string]string `json:"cachedFiles"` // path -> checksum of cached files to use
	MainFile    string            `json:"mainFile"`
	Engine      string            `json:"engine"`
	ShellEscape bool              `json:"shellEscape"`
}

// UploadDeltaSyncFilesHandler handles file uploads for delta-sync builds
// POST /api/builds/{buildId}/upload
func UploadDeltaSyncFilesHandler(db interface{}) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildID := chi.URLParam(r, "buildId")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		// Parse multipart form
		if err := r.ParseMultipartForm(build.MaxFileSize); err != nil {
			http.Error(w, "Form too large", http.StatusBadRequest)
			return
		}

		// Get metadata
		metadataStr := r.FormValue("metadata")
		var metadata DeltaSyncUploadRequest
		if err := json.Unmarshal([]byte(metadataStr), &metadata); err != nil {
			http.Error(w, "Invalid metadata", http.StatusBadRequest)
			return
		}

		// Create build directory
		workDir := os.Getenv("COMPILER_WORKDIR")
		if workDir == "" {
			workDir = "/tmp/treefrog-builds"
		}
		buildDir := filepath.Join(workDir, userID, buildID)

		// Save uploaded files
		fileCount := 0
		for _, fileHeader := range r.MultipartForm.File["files"] {
			if fileHeader.Size > build.MaxFileSize {
				http.Error(w, "File too large", http.StatusBadRequest)
				return
			}

			file, err := fileHeader.Open()
			if err != nil {
				logger.Errorf("Failed to open uploaded file: %v", err)
				http.Error(w, "Failed to read file", http.StatusInternalServerError)
				return
			}
			defer file.Close()

			// Sanitize filename (prevent path traversal)
			filename := filepath.Base(fileHeader.Filename)
			if filename == "" {
				continue
			}

			// Create file in build directory
			filePath := filepath.Join(buildDir, filename)
			dst, err := os.Create(filePath)
			if err != nil {
				logger.Errorf("Failed to create file: %v", err)
				http.Error(w, "Failed to save file", http.StatusInternalServerError)
				return
			}
			defer dst.Close()

			// Copy file content
			if _, err := io.Copy(dst, file); err != nil {
				logger.Errorf("Failed to copy file: %v", err)
				http.Error(w, "Failed to save file", http.StatusInternalServerError)
				return
			}

			fileCount++
		}

		// Create build record with delta-sync info
		buildRec := &build.Build{
			ID:          buildID,
			UserID:      userID,
			Status:      build.StatusPending,
			Engine:      build.Engine(metadata.Engine),
			MainFile:    metadata.MainFile,
			DirPath:     buildDir,
			ShellEscape: metadata.ShellEscape,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
			ExpiresAt:   time.Now().Add(24 * time.Hour),
		}

		// Store cached file references (for server-side delta-sync tracking)
		cacheMetadata, _ := json.Marshal(metadata.CachedFiles)
		_ = os.WriteFile(filepath.Join(buildDir, ".cache_metadata.json"), cacheMetadata, 0644)

		// dbInstance is a global variable from main.go, not the interface{} parameter
		buildStore := build.NewStoreWithDB(dbInstance)
		if err := buildStore.Create(buildRec); err != nil {
			logger.Errorf("Failed to create build record: %v", err)
			http.Error(w, "Failed to create build", http.StatusInternalServerError)
			return
		}

		// Queue build
		buildQueue.Enqueue(buildRec)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"buildId":       buildID,
			"filesReceived": fileCount,
		})

		logger.Infof("Delta-sync files uploaded: %d files for build %s", fileCount, buildID)
	}
}

// ComputeFileChecksum returns SHA256 checksum of file content
func computeFileChecksum(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}
