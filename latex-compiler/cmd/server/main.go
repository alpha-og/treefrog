package main

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/alpha-og/treefrog-latex-compiler/pkg/api"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/compiler"
	"github.com/alpha-og/treefrog-latex-compiler/pkg/synctex"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/sirupsen/logrus"
)

// correlationIDKey is used to store correlation IDs in context
type correlationIDKey struct{}

// Server holds the application state
type Server struct {
	cfg         api.Config
	mu          sync.Mutex
	builds      map[string]*api.Build
	log         *logrus.Logger
	buildWG     sync.WaitGroup
	buildCancel context.CancelFunc
	buildCtx    context.Context
}

func main() {
	// Initialize structured logger
	log := logrus.New()
	log.SetFormatter(&logrus.JSONFormatter{
		TimestampFormat: time.RFC3339,
	})
	log.SetOutput(os.Stdout)

	// Set log level from environment
	if level := os.Getenv("LOG_LEVEL"); level != "" {
		if lvl, err := logrus.ParseLevel(level); err == nil {
			log.SetLevel(lvl)
		}
	}

	cfg := api.Config{
		Port:    getenv("PORT", "9000"),
		Token:   os.Getenv("BUILDER_TOKEN"),
		WorkDir: getenv("BUILDER_WORKDIR", "/tmp/treefrog-builds"),
	}

	log.WithFields(logrus.Fields{
		"port":     cfg.Port,
		"workDir":  cfg.WorkDir,
		"hasToken": cfg.Token != "",
	}).Info("Starting LaTeX compiler server")

	if err := os.MkdirAll(cfg.WorkDir, 0o755); err != nil {
		log.WithError(err).Fatal("Failed to create working directory")
	}

	buildCtx, buildCancel := context.WithCancel(context.Background())
	s := &Server{
		cfg:         cfg,
		builds:      map[string]*api.Build{},
		log:         log,
		buildCtx:    buildCtx,
		buildCancel: buildCancel,
	}

	r := chi.NewRouter()

	// Add comprehensive middleware stack
	r.Use(middleware.RequestID)    // Unique ID per request
	r.Use(correlationIDMiddleware) // Build correlation tracking
	r.Use(loggingMiddleware(log))  // Request/response logging
	r.Use(middleware.Recoverer)    // Panic recovery with logging
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-Builder-Token"},
		MaxAge:         300,
	}))

	r.Get("/health", s.handleHealth)
	r.Post("/build", s.handleBuild)
	r.Get("/build/{id}/status", s.handleStatus)
	r.Get("/build/{id}/log", s.handleLog)
	r.Get("/build/{id}/artifacts/pdf", s.handlePDF)
	r.Get("/build/{id}/artifacts/synctex", s.handleSynctex)
	r.Get("/build/{id}/synctex/view", s.handleSyncView)
	r.Get("/build/{id}/synctex/edit", s.handleSyncEdit)
	r.Delete("/build/{id}", s.handleDelete)

	log.WithField("port", cfg.Port).Info("Server ready to accept connections")

	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.WithError(err).Fatal("Server failed to start")
	}
}

// correlationIDMiddleware extracts or generates correlation IDs
func correlationIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check for existing correlation ID in header
		corrID := r.Header.Get("X-Correlation-ID")
		if corrID == "" {
			corrID = middleware.GetReqID(r.Context())
		}

		// Store in context
		ctx := context.WithValue(r.Context(), correlationIDKey{}, corrID)

		// Add to response headers
		w.Header().Set("X-Correlation-ID", corrID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// loggingMiddleware logs all HTTP requests with structured fields
func loggingMiddleware(log *logrus.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Wrap response writer to capture status code
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			duration := time.Since(start)
			corrID, _ := r.Context().Value(correlationIDKey{}).(string)

			fields := logrus.Fields{
				"method":        r.Method,
				"path":          r.URL.Path,
				"status":        ww.Status(),
				"duration_ms":   duration.Milliseconds(),
				"correlationID": corrID,
				"remoteAddr":    r.RemoteAddr,
				"userAgent":     r.UserAgent(),
			}

			// Log at appropriate level based on status
			switch {
			case ww.Status() >= 500:
				log.WithFields(fields).Error("HTTP request failed")
			case ww.Status() >= 400:
				log.WithFields(fields).Warn("HTTP request rejected")
			default:
				log.WithFields(fields).Debug("HTTP request completed")
			}
		})
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"endpoint":      "health",
	}).Debug("Health check requested")

	writeJSON(w, map[string]any{
		"status": "ok",
		"time":   time.Now(),
	})
}

func (s *Server) handleBuild(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	if !s.authorize(w, r) {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"endpoint":      "build",
			"remoteAddr":    r.RemoteAddr,
		}).Warn("Authorization failed")
		return
	}

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"endpoint":      "build",
		"contentType":   r.Header.Get("Content-Type"),
	}).Info("Build request received")

	// Limit request body size to prevent DoS attacks (100MB max)
	r.Body = http.MaxBytesReader(w, r.Body, 100<<20)
	mr, err := r.MultipartReader()
	if err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"error":         err.Error(),
		}).Error("Failed to parse multipart request")
		http.Error(w, "invalid multipart", http.StatusBadRequest)
		return
	}

	var opts api.BuildOptions
	var zipBuf bytes.Buffer
	var fileSize int64

	for {
		part, err := mr.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			s.log.WithFields(logrus.Fields{
				"correlationID": corrID,
				"error":         err.Error(),
			}).Error("Failed to read multipart part")
			http.Error(w, "bad multipart", http.StatusBadRequest)
			return
		}
		switch part.FormName() {
		case "options":
			b, _ := io.ReadAll(part)
			if err := json.Unmarshal(b, &opts); err != nil {
				s.log.WithFields(logrus.Fields{
					"correlationID": corrID,
					"error":         err.Error(),
				}).Warn("Failed to parse build options")
			}
		case "file":
			n, _ := io.Copy(&zipBuf, part)
			fileSize = n
		}
	}

	if opts.Engine == "" {
		opts.Engine = "pdflatex"
	}
	if opts.MainFile == "" {
		opts.MainFile = "main.tex"
	}

	id := fmt.Sprintf("bld_%d", time.Now().UnixNano())
	buildDir := filepath.Join(s.cfg.WorkDir, id)

	if err := os.MkdirAll(buildDir, 0o755); err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
			"error":         err.Error(),
		}).Error("Failed to create build directory")
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	zipPath := filepath.Join(buildDir, "source.zip")
	if err := os.WriteFile(zipPath, zipBuf.Bytes(), 0o644); err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
			"error":         err.Error(),
		}).Error("Failed to write source zip")
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	if err := unzip(zipPath, buildDir); err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
			"error":         err.Error(),
		}).Error("Failed to extract source zip")
		s.setBuild(id, &api.Build{
			ID: id, Dir: buildDir, Status: "error",
			Message: "Failed to process uploaded file", EndedAt: time.Now(),
		})
		http.Error(w, "Failed to process uploaded file", http.StatusBadRequest)
		return
	}

	b := &api.Build{
		ID: id, Dir: buildDir,
		Status: "running", StartedAt: time.Now(),
	}
	s.setBuild(id, b)

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
		"engine":        opts.Engine,
		"mainFile":      opts.MainFile,
		"shellEscape":   opts.ShellEscape,
		"fileSize":      fileSize,
	}).Info("Build started")

	// Create persistent context with correlation ID for the build goroutine
	// Use s.buildCtx instead of r.Context() so build isn't canceled when request ends
	buildCtx := context.WithValue(s.buildCtx, correlationIDKey{}, corrID)

	// Pass persistent context to build goroutine
	s.buildWG.Add(1)
	go func(ctx context.Context, b *api.Build, opts api.BuildOptions) {
		defer s.buildWG.Done()
		s.runBuild(ctx, b, opts)
	}(buildCtx, b, opts)

	writeJSON(w, map[string]any{"id": id})
}

func (s *Server) runBuild(ctx context.Context, b *api.Build, opts api.BuildOptions) {
	startTime := time.Now()
	corrID, _ := ctx.Value(correlationIDKey{}).(string)

	// Create child context with timeout
	ctx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	engine := compiler.PDFLaTeX
	switch strings.ToLower(opts.Engine) {
	case "xelatex":
		engine = compiler.XeLaTeX
	case "lualatex":
		engine = compiler.LuaLaTeX
	}

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       b.ID,
		"engine":        engine,
		"workDir":       b.Dir,
	}).Debug("Starting compilation")

	compileOpts := compiler.CompileOptions{
		WorkDir:     b.Dir,
		MainFile:    opts.MainFile,
		Engine:      engine,
		ShellEscape: opts.ShellEscape,
		BuildDir:    b.Dir,
	}

	output, err := compiler.Compile(ctx, compileOpts)
	duration := time.Since(startTime)

	// Always write build log
	logPath := filepath.Join(b.Dir, "build.log")
	if writeErr := os.WriteFile(logPath, output, 0o644); writeErr != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       b.ID,
			"error":         writeErr.Error(),
		}).Error("Failed to write build log")
	}

	if err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       b.ID,
			"duration_ms":   duration.Milliseconds(),
			"error":         err.Error(),
			"outputPreview": truncate(string(output), 200),
		}).Error("Build failed")
		s.updateBuild(b.ID, "error", string(output))
		return
	}

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       b.ID,
		"duration_ms":   duration.Milliseconds(),
		"engine":        engine,
	}).Info("Build completed successfully")
	s.updateBuild(b.ID, "success", "")
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	if !s.authorize(w, r) {
		return
	}

	id := chi.URLParam(r, "id")
	b := s.getBuild(id)

	if b == nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
		}).Warn("Build not found")
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
		"status":        b.Status,
	}).Debug("Build status requested")

	writeJSON(w, b)
}

func (s *Server) handleLog(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	if !s.authorize(w, r) {
		return
	}

	id := chi.URLParam(r, "id")
	b := s.getBuild(id)

	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	data, err := os.ReadFile(filepath.Join(b.Dir, "build.log"))
	if err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
			"error":         err.Error(),
		}).Debug("Build log not found")
		http.Error(w, "no log", http.StatusNotFound)
		return
	}

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
		"logSize":       len(data),
	}).Debug("Build log served")

	w.Header().Set("Content-Type", "text/plain")
	_, _ = w.Write(data)
}

func (s *Server) handlePDF(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	if !s.authorize(w, r) {
		return
	}

	id := chi.URLParam(r, "id")
	b := s.getBuild(id)

	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	pdf := findFile(b.Dir, ".pdf")
	if pdf == "" {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
		}).Warn("PDF not found for build")
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}

	f, err := os.Open(pdf)
	if err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
			"error":         err.Error(),
		}).Error("Failed to open PDF")
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}
	defer f.Close()

	info, _ := f.Stat()
	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
		"pdfSize":       info.Size(),
	}).Debug("PDF served")

	w.Header().Set("Content-Type", "application/pdf")
	_, _ = io.Copy(w, f)
}

func (s *Server) handleSynctex(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	if !s.authorize(w, r) {
		return
	}

	id := chi.URLParam(r, "id")
	b := s.getBuild(id)

	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	syn := findFile(b.Dir, ".synctex.gz")
	if syn == "" {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
		}).Debug("SyncTeX file not found")
		http.Error(w, "no synctex", http.StatusNotFound)
		return
	}

	f, err := os.Open(syn)
	if err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
			"error":         err.Error(),
		}).Error("Failed to open SyncTeX file")
		http.Error(w, "no synctex", http.StatusNotFound)
		return
	}
	defer f.Close()

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
	}).Debug("SyncTeX file served")

	w.Header().Set("Content-Type", "application/octet-stream")
	_, _ = io.Copy(w, f)
}

func (s *Server) handleSyncView(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	if !s.authorize(w, r) {
		return
	}

	id := chi.URLParam(r, "id")
	b := s.getBuild(id)

	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	file := r.URL.Query().Get("file")
	lineStr := r.URL.Query().Get("line")
	colStr := r.URL.Query().Get("col")

	if file == "" || lineStr == "" {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
		}).Warn("SyncTeX view: missing required parameters")
		http.Error(w, "file and line required", http.StatusBadRequest)
		return
	}

	var line, col int
	fmt.Sscanf(lineStr, "%d", &line)
	fmt.Sscanf(colStr, "%d", &col)

	pdf := findFile(b.Dir, ".pdf")
	if pdf == "" {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
		}).Warn("SyncTeX view: PDF not found")
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
		"file":          file,
		"line":          line,
		"col":           col,
	}).Debug("SyncTeX forward search")

	view, err := synctex.ForwardSearch(b.Dir, pdf, line, file, col)
	if err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
			"error":         err.Error(),
		}).Error("SyncTeX forward search failed")
		http.Error(w, "Forward search failed", http.StatusInternalServerError)
		return
	}

	// Make path relative
	view.File = synctex.MakeRelative(b.Dir, view.File)

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
		"page":          view.Page,
		"x":             view.X,
		"y":             view.Y,
	}).Debug("SyncTeX forward search completed")

	writeJSON(w, view)
}

func (s *Server) handleSyncEdit(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	if !s.authorize(w, r) {
		return
	}

	id := chi.URLParam(r, "id")
	b := s.getBuild(id)

	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	pageStr := r.URL.Query().Get("page")
	xStr := r.URL.Query().Get("x")
	yStr := r.URL.Query().Get("y")

	if pageStr == "" || xStr == "" || yStr == "" {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
		}).Warn("SyncTeX edit: missing required parameters")
		http.Error(w, "page, x, y required", http.StatusBadRequest)
		return
	}

	var page int
	var x, y float64
	fmt.Sscanf(pageStr, "%d", &page)
	fmt.Sscanf(xStr, "%f", &x)
	fmt.Sscanf(yStr, "%f", &y)

	pdf := findFile(b.Dir, ".pdf")
	if pdf == "" {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
		}).Warn("SyncTeX edit: PDF not found")
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
		"page":          page,
		"x":             x,
		"y":             y,
	}).Debug("SyncTeX reverse search")

	edit, err := synctex.ReverseSearch(b.Dir, pdf, page, x, y)
	if err != nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
			"error":         err.Error(),
		}).Error("SyncTeX reverse search failed")
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Make path relative
	edit.File = synctex.MakeRelative(b.Dir, edit.File)

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
		"file":          edit.File,
		"line":          edit.Line,
	}).Debug("SyncTeX reverse search completed")

	writeJSON(w, edit)
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	corrID, _ := r.Context().Value(correlationIDKey{}).(string)

	if !s.authorize(w, r) {
		return
	}

	id := chi.URLParam(r, "id")
	b := s.getBuild(id)

	if b == nil {
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"buildID":       id,
		}).Debug("Delete: build not found (already deleted)")
		writeJSON(w, map[string]any{"ok": true})
		return
	}

	s.mu.Lock()
	if b != nil {
		if err := os.RemoveAll(b.Dir); err != nil {
			s.log.WithFields(logrus.Fields{
				"correlationID": corrID,
				"buildID":       id,
				"error":         err.Error(),
			}).Error("Failed to delete build directory")
		}
	}
	delete(s.builds, id)
	s.mu.Unlock()

	s.log.WithFields(logrus.Fields{
		"correlationID": corrID,
		"buildID":       id,
	}).Info("Build deleted")

	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) setBuild(id string, b *api.Build) {
	s.mu.Lock()
	s.builds[id] = b
	s.mu.Unlock()
}

func (s *Server) getBuild(id string) *api.Build {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.builds[id]
}

func (s *Server) updateBuild(id, status, message string) {
	s.mu.Lock()
	b := s.builds[id]
	if b != nil {
		b.Status = status
		b.Message = message
		b.EndedAt = time.Now()
	}
	s.mu.Unlock()
}

func (s *Server) authorize(w http.ResponseWriter, r *http.Request) bool {
	if s.cfg.Token == "" {
		return true
	}

	providedToken := r.Header.Get("X-Builder-Token")
	if subtle.ConstantTimeCompare([]byte(providedToken), []byte(s.cfg.Token)) != 1 {
		corrID, _ := r.Context().Value(correlationIDKey{}).(string)
		s.log.WithFields(logrus.Fields{
			"correlationID": corrID,
			"remoteAddr":    r.RemoteAddr,
			"hasToken":      providedToken != "",
		}).Warn("Authorization failed: invalid token")
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func getenv(k, def string) string {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	return v
}

func unzip(path, dest string) error {
	r, err := zip.OpenReader(path)
	if err != nil {
		return err
	}
	defer r.Close()

	for _, f := range r.File {
		fp := filepath.Join(dest, f.Name)
		cleanFp := filepath.Clean(fp)
		cleanDest := filepath.Clean(dest) + string(os.PathSeparator)
		if !strings.HasPrefix(cleanFp, cleanDest) {
			return fmt.Errorf("invalid path: %s", f.Name)
		}
		if f.FileInfo().IsDir() {
			_ = os.MkdirAll(fp, 0o755)
			continue
		}
		_ = os.MkdirAll(filepath.Dir(fp), 0o755)

		rc, err := f.Open()
		if err != nil {
			return err
		}

		out, err := os.Create(fp)
		if err != nil {
			rc.Close()
			return err
		}

		_, err = io.Copy(out, rc)
		_ = rc.Close()
		_ = out.Close()

		if err != nil {
			return err
		}
	}
	return nil
}

func findFile(dir string, suffix string) string {
	var found string
	_ = filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			if filepath.Base(path) == ".git" {
				return fs.SkipDir
			}
			return nil
		}
		if strings.HasSuffix(strings.ToLower(path), suffix) {
			found = path
			return errors.New("found")
		}
		return nil
	})
	return found
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}

// Shutdown gracefully shuts down the server and waits for all builds to complete
func (s *Server) Shutdown(ctx context.Context) error {
	s.log.Info("Shutting down server, waiting for builds to complete...")

	// Cancel all running builds
	s.buildCancel()

	// Wait for all builds to complete or timeout
	done := make(chan struct{})
	go func() {
		s.buildWG.Wait()
		close(done)
	}()

	select {
	case <-done:
		s.log.Info("All builds completed successfully")
		return nil
	case <-ctx.Done():
		s.log.Warn("Shutdown timeout, some builds may still be running")
		return ctx.Err()
	}
}
