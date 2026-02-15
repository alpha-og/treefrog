package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/alpha-og/treefrog/apps/local-latex-compiler/internal/storage"
	"github.com/alpha-og/treefrog/packages/go/build"
	"github.com/alpha-og/treefrog/packages/go/security"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
)

var buildLog = logrus.WithField("component", "handlers/build")

func CreateBuildHandler(store *storage.Store, compiler *build.DockerCompiler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		if security.HasPathTraversal(mainFile) {
			http.Error(w, "Invalid main_file: path traversal not allowed", http.StatusBadRequest)
			return
		}

		file, fileHeader, err := r.FormFile("file")
		if err != nil {
			http.Error(w, "No file uploaded", http.StatusBadRequest)
			return
		}
		defer file.Close()

		if fileHeader.Size > build.MaxFileSize {
			http.Error(w, fmt.Sprintf("File too large (max %dMB)", build.MaxFileSize/(1024*1024)), http.StatusBadRequest)
			return
		}

		buildID := "bld_" + uuid.New().String()

		b, err := store.Create(buildID, build.BuildOptions{
			MainFile:    mainFile,
			Engine:      engine,
			ShellEscape: shellEscape,
		})
		if err != nil {
			buildLog.WithError(err).Error("Failed to create build")
			http.Error(w, "Failed to create build", http.StatusInternalServerError)
			return
		}

		zipPath := filepath.Join(b.DirPath, "source.zip")
		dst, err := os.Create(zipPath)
		if err != nil {
			buildLog.WithError(err).Error("Failed to create zip file")
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			buildLog.WithError(err).Error("Failed to save zip file")
			http.Error(w, "Failed to save file", http.StatusInternalServerError)
			return
		}
		dst.Close()

		if err := build.ExtractZip(zipPath, b.DirPath); err != nil {
			buildLog.WithError(err).Error("Failed to extract zip")
			http.Error(w, "Failed to extract source files", http.StatusInternalServerError)
			return
		}

		b.Status = build.StatusCompiling
		store.Update(b)

		go func() {
			if err := compiler.Compile(b); err != nil {
				buildLog.WithError(err).WithField("build_id", buildID).Error("Compilation failed")
				b.Status = build.StatusFailed
				b.ErrorMessage = err.Error()
			}
			store.Update(b)
		}()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]string{
			"id":      buildID,
			"status":  string(b.Status),
			"message": "Build started",
		})
	}
}

func GetBuildHandler(store *storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		b, err := store.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(build.BuildResponse{
			ID:        b.ID,
			Status:    b.Status,
			Engine:    b.Engine,
			MainFile:  b.MainFile,
			CreatedAt: b.CreatedAt,
			ExpiresAt: b.ExpiresAt,
		})
	}
}

func GetStatusHandler(store *storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		b, err := store.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(build.StatusResponse{
			ID:        b.ID,
			Status:    b.Status,
			Message:   b.ErrorMessage,
			Engine:    b.Engine,
			CreatedAt: b.CreatedAt,
		})
	}
}

func ServePDFHandler(store *storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		b, err := store.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		if b.PDFPath == "" {
			http.Error(w, "PDF not available", http.StatusNotFound)
			return
		}

		if _, err := os.Stat(b.PDFPath); os.IsNotExist(err) {
			http.Error(w, "PDF file not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/pdf")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.pdf", buildID))
		http.ServeFile(w, r, b.PDFPath)
	}
}

func ServeLogHandler(store *storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		b, err := store.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write([]byte(b.BuildLog))
	}
}

func ServeSyncTeXHandler(store *storage.Store) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		b, err := store.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		if b.SyncTeXPath == "" {
			http.Error(w, "SyncTeX not available", http.StatusNotFound)
			return
		}

		if _, err := os.Stat(b.SyncTeXPath); os.IsNotExist(err) {
			http.Error(w, "SyncTeX file not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/gzip")
		w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s.synctex.gz", buildID))
		http.ServeFile(w, r, b.SyncTeXPath)
	}
}
