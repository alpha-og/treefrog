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
	"strings"
	"time"

	"github.com/alpha-og/treefrog-latex-compiler/pkg/auth"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/build"
	"github.com/go-chi/chi/v5"
	"github.com/sirupsen/logrus"
)

var deltaLog = logrus.WithField("component", "handlers/delta-sync")

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
	FilesToUpload []string                          `json:"filesToUpload"` // files that need to be uploaded
}

// FileMetadata stores file info for caching
type FileMetadata struct {
	Checksum string `json:"checksum"`
	Size     int64  `json:"size"`
	ModTime  string `json:"modTime"`
}

// ProjectCache stores the cache for a project
type ProjectCache struct {
	ProjectID   string                  `json:"projectId"`
	LastBuildID string                  `json:"lastBuildId"`
	UpdatedAt   string                  `json:"updatedAt"`
	Files       map[string]FileMetadata `json:"files"`
}

// InitDeltaSyncHandler initializes a delta-sync build
// POST /api/builds/init
func InitDeltaSyncHandler() http.HandlerFunc {
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

		if req.ProjectID == "" || req.ProjectName == "" {
			http.Error(w, "Missing projectId or projectName", http.StatusBadRequest)
			return
		}

		if hasPathTraversal(req.MainFile) {
			http.Error(w, "Invalid main file path", http.StatusBadRequest)
			return
		}

		buildID := fmt.Sprintf("bld_%s_%d", req.ProjectID[:min(8, len(req.ProjectID))], time.Now().UnixNano())

		workDir := os.Getenv("COMPILER_WORKDIR")
		if workDir == "" {
			workDir = "/tmp/treefrog-builds"
		}
		buildDir := filepath.Join(workDir, userID, buildID)

		if err := os.MkdirAll(buildDir, 0755); err != nil {
			deltaLog.WithError(err).Error("Failed to create build directory")
			http.Error(w, "Failed to initialize build", http.StatusInternalServerError)
			return
		}

		cacheFile := filepath.Join(workDir, userID, fmt.Sprintf(".cache_%s.json", sanitizeProjectID(req.ProjectID)))
		projectCache := ProjectCache{
			ProjectID: req.ProjectID,
			Files:     make(map[string]FileMetadata),
		}

		if data, err := os.ReadFile(cacheFile); err == nil {
			if err := json.Unmarshal(data, &projectCache); err != nil {
				deltaLog.WithError(err).Warn("Failed to parse cache file, starting fresh")
			}
		}

		existingFilesResponse := make(map[string]map[string]interface{})
		var filesToUpload []string

		for clientPath, clientChecksum := range req.FileChecksums {
			if hasPathTraversal(clientPath) {
				continue
			}

			if cachedMeta, exists := projectCache.Files[clientPath]; exists {
				if cachedMeta.Checksum == clientChecksum {
					existingFilesResponse[clientPath] = map[string]interface{}{
						"checksum": cachedMeta.Checksum,
						"size":     cachedMeta.Size,
					}
				} else {
					filesToUpload = append(filesToUpload, clientPath)
				}
			} else {
				filesToUpload = append(filesToUpload, clientPath)
			}
		}

		// Store build ID in context for upload handler
		buildContextFile := filepath.Join(buildDir, ".build_context.json")
		contextData, _ := json.Marshal(map[string]interface{}{
			"projectId":   req.ProjectID,
			"projectName": req.ProjectName,
			"buildId":     buildID,
			"existingDir": filepath.Join(workDir, userID, projectCache.LastBuildID),
		})
		os.WriteFile(buildContextFile, contextData, 0644)

		response := DeltaSyncInitResponse{
			BuildID:       buildID,
			ExistingFiles: existingFilesResponse,
			FilesToUpload: filesToUpload,
		}

		deltaLog.WithFields(logrus.Fields{
			"build_id":        buildID,
			"project_id":      req.ProjectID,
			"existing_files":  len(existingFilesResponse),
			"files_to_upload": len(filesToUpload),
		}).Info("Delta-sync initialized")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	}
}

// DeltaSyncUploadRequest contains metadata for uploaded files
type DeltaSyncUploadRequest struct {
	ProjectID    string            `json:"projectId"`
	CachedFiles  map[string]string `json:"cachedFiles"` // path -> checksum of cached files to reuse
	MainFile     string            `json:"mainFile"`
	Engine       string            `json:"engine"`
	ShellEscape  bool              `json:"shellEscape"`
	NewChecksums map[string]string `json:"newChecksums"` // checksums for newly uploaded files
}

// UploadDeltaSyncFilesHandler handles file uploads for delta-sync builds
// POST /api/builds/{buildId}/upload
func UploadDeltaSyncFilesHandler() http.HandlerFunc {
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

		if err := r.ParseMultipartForm(build.MaxFileSize); err != nil {
			http.Error(w, "Form too large", http.StatusBadRequest)
			return
		}

		metadataStr := r.FormValue("metadata")
		var metadata DeltaSyncUploadRequest
		if err := json.Unmarshal([]byte(metadataStr), &metadata); err != nil {
			http.Error(w, "Invalid metadata", http.StatusBadRequest)
			return
		}

		workDir := os.Getenv("COMPILER_WORKDIR")
		if workDir == "" {
			workDir = "/tmp/treefrog-builds"
		}
		buildDir := filepath.Join(workDir, userID, buildID)

		buildContextFile := filepath.Join(buildDir, ".build_context.json")
		var buildContext struct {
			ProjectID   string `json:"projectId"`
			ExistingDir string `json:"existingDir"`
		}
		if data, err := os.ReadFile(buildContextFile); err == nil {
			json.Unmarshal(data, &buildContext)
		}

		if metadata.ProjectID == "" {
			metadata.ProjectID = buildContext.ProjectID
		}

		newFiles := make(map[string]FileMetadata)
		fileCount := 0

		for _, fileHeader := range r.MultipartForm.File["files"] {
			if fileHeader.Size > build.MaxFileSize {
				http.Error(w, fmt.Sprintf("File %s too large", fileHeader.Filename), http.StatusBadRequest)
				return
			}

			// Preserve directory structure from filename
			relPath := fileHeader.Filename
			if hasPathTraversal(relPath) {
				deltaLog.WithField("path", relPath).Warn("Skipping file with path traversal")
				continue
			}

			file, err := fileHeader.Open()
			if err != nil {
				deltaLog.WithError(err).WithField("file", relPath).Error("Failed to open uploaded file")
				continue
			}

			filePath := filepath.Join(buildDir, relPath)
			if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
				file.Close()
				continue
			}

			dst, err := os.Create(filePath)
			if err != nil {
				file.Close()
				deltaLog.WithError(err).WithField("path", filePath).Error("Failed to create file")
				continue
			}

			// Compute checksum while copying
			hasher := sha256.New()
			writer := io.MultiWriter(dst, hasher)

			_, err = io.Copy(writer, file)
			file.Close()
			dst.Close()

			if err != nil {
				deltaLog.WithError(err).WithField("path", relPath).Error("Failed to copy file")
				continue
			}

			checksum := hex.EncodeToString(hasher.Sum(nil))
			newFiles[relPath] = FileMetadata{
				Checksum: checksum,
				Size:     fileHeader.Size,
				ModTime:  time.Now().Format(time.RFC3339),
			}
			fileCount++
		}

		// Verify checksums if provided
		if metadata.NewChecksums != nil {
			for path, expectedChecksum := range metadata.NewChecksums {
				if meta, exists := newFiles[path]; exists {
					if meta.Checksum != expectedChecksum {
						deltaLog.WithFields(logrus.Fields{
							"path":     path,
							"expected": expectedChecksum,
							"actual":   meta.Checksum,
						}).Warn("Checksum mismatch for uploaded file")
					}
				}
			}
		}

		// Copy cached files from previous build
		if buildContext.ExistingDir != "" && len(metadata.CachedFiles) > 0 {
			for relPath, expectedChecksum := range metadata.CachedFiles {
				if hasPathTraversal(relPath) {
					continue
				}

				srcPath := filepath.Join(buildContext.ExistingDir, relPath)
				dstPath := filepath.Join(buildDir, relPath)

				if data, err := os.ReadFile(srcPath); err == nil {
					actualChecksum := computeFileChecksum(data)
					if actualChecksum == expectedChecksum {
						os.MkdirAll(filepath.Dir(dstPath), 0755)
						os.WriteFile(dstPath, data, 0644)
						fileCount++
					} else {
						deltaLog.WithFields(logrus.Fields{
							"path":     relPath,
							"expected": expectedChecksum,
							"actual":   actualChecksum,
						}).Warn("Cached file checksum mismatch, skipping")
					}
				}
			}
		}

		// Update project cache with new files
		cacheFile := filepath.Join(workDir, userID, fmt.Sprintf(".cache_%s.json", sanitizeProjectID(metadata.ProjectID)))
		projectCache := ProjectCache{
			ProjectID:   metadata.ProjectID,
			LastBuildID: buildID,
			UpdatedAt:   time.Now().Format(time.RFC3339),
			Files:       make(map[string]FileMetadata),
		}

		if data, err := os.ReadFile(cacheFile); err == nil {
			json.Unmarshal(data, &projectCache.Files)
		}

		for path, meta := range newFiles {
			projectCache.Files[path] = meta
		}

		for path, checksum := range metadata.CachedFiles {
			if _, exists := projectCache.Files[path]; !exists {
				projectCache.Files[path] = FileMetadata{
					Checksum: checksum,
					ModTime:  time.Now().Format(time.RFC3339),
				}
			}
		}

		if cacheData, err := json.MarshalIndent(projectCache, "", "  "); err == nil {
			os.WriteFile(cacheFile, cacheData, 0644)
		}

		// Create build record
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

		if err := buildRec.Validate(); err != nil {
			http.Error(w, fmt.Sprintf("Invalid build: %v", err), http.StatusBadRequest)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		if err := buildStore.Create(buildRec); err != nil {
			deltaLog.WithError(err).Error("Failed to create build record")
			http.Error(w, "Failed to create build", http.StatusInternalServerError)
			return
		}

		buildQueue.Enqueue(buildRec)

		deltaLog.WithFields(logrus.Fields{
			"build_id":       buildID,
			"files_received": fileCount,
			"cached_reused":  len(metadata.CachedFiles),
		}).Info("Delta-sync files uploaded, build queued")

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"buildId":       buildID,
			"filesReceived": fileCount,
			"cachedReused":  len(metadata.CachedFiles),
			"status":        "queued",
		})
	}
}

func computeFileChecksum(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

func sanitizeProjectID(id string) string {
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '_'
	}, id)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
