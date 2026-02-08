package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

type Config struct {
	Port    string
	Token   string
	WorkDir string
}

type BuildOptions struct {
	MainFile    string `json:"mainFile"`
	Engine      string `json:"engine"`
	ShellEscape bool   `json:"shellEscape"`
}

type Build struct {
	ID        string    `json:"id"`
	Dir       string    `json:"-"`
	Status    string    `json:"status"`
	Message   string    `json:"message"`
	StartedAt time.Time `json:"startedAt"`
	EndedAt   time.Time `json:"endedAt"`
}

type Server struct {
	cfg    Config
	mu     sync.Mutex
	builds map[string]*Build
}

func main() {
	cfg := Config{
		Port:    getenv("PORT", "9000"),
		Token:   os.Getenv("BUILDER_TOKEN"),
		WorkDir: getenv("BUILDER_WORKDIR", "/tmp/treefrog-builds"),
	}
	_ = os.MkdirAll(cfg.WorkDir, 0o755)

	s := &Server{cfg: cfg, builds: map[string]*Build{}}

	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-Builder-Token"},
		MaxAge:         300,
	}))

	// Health check endpoint
	r.Get("/health", s.handleHealth)

	r.Post("/build", s.handleBuild)
	r.Get("/build/{id}/status", s.handleStatus)
	r.Get("/build/{id}/log", s.handleLog)
	r.Get("/build/{id}/artifacts/pdf", s.handlePDF)
	r.Get("/build/{id}/artifacts/synctex", s.handleSynctex)
	r.Get("/build/{id}/synctex/view", s.handleSyncView)
	r.Get("/build/{id}/synctex/edit", s.handleSyncEdit)
	r.Delete("/build/{id}", s.handleDelete)

	fmt.Printf("Remote builder on :%s\n", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	// No authentication needed for health checks
	writeJSON(w, map[string]any{
		"status": "ok",
		"time":   time.Now(),
	})
}

func (s *Server) handleBuild(w http.ResponseWriter, r *http.Request) {
	if !s.authorize(w, r) {
		return
	}

	mr, err := r.MultipartReader()
	if err != nil {
		http.Error(w, "invalid multipart", http.StatusBadRequest)
		return
	}

	var opts BuildOptions
	var zipBuf bytes.Buffer
	for {
		part, err := mr.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			http.Error(w, "bad multipart", http.StatusBadRequest)
			return
		}
		switch part.FormName() {
		case "options":
			b, _ := io.ReadAll(part)
			_ = json.Unmarshal(b, &opts)
		case "file":
			_, _ = io.Copy(&zipBuf, part)
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
	_ = os.MkdirAll(buildDir, 0o755)
	zipPath := filepath.Join(buildDir, "source.zip")
	_ = os.WriteFile(zipPath, zipBuf.Bytes(), 0o644)
	if err := unzip(zipPath, buildDir); err != nil {
		s.setBuild(id, &Build{ID: id, Dir: buildDir, Status: "error", Message: err.Error(), EndedAt: time.Now()})
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	b := &Build{ID: id, Dir: buildDir, Status: "running", StartedAt: time.Now()}
	s.setBuild(id, b)
	go s.runBuild(b, opts)

	writeJSON(w, map[string]any{"id": id})
}

func (s *Server) runBuild(b *Build, opts BuildOptions) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	mainFile := filepath.Clean(opts.MainFile)
	if strings.HasPrefix(mainFile, "..") || filepath.IsAbs(mainFile) {
		s.updateBuild(b.ID, "error", "invalid main file path")
		return
	}
	workingDir := b.Dir
	if dir := filepath.Dir(mainFile); dir != "." {
		workingDir = filepath.Join(b.Dir, dir)
		mainFile = filepath.Base(mainFile)
	}

	args := []string{"-interaction=nonstopmode"}
	args = append(args, "-synctex=1")
	switch strings.ToLower(opts.Engine) {
	case "xelatex":
		args = append(args, "-xelatex")
	case "lualatex":
		args = append(args, "-lualatex")
	default:
		args = append(args, "-pdf")
	}
	if opts.ShellEscape {
		args = append(args, "-shell-escape")
	} else {
		args = append(args, "-no-shell-escape")
	}
	args = append(args, mainFile)

	cmd := exec.CommandContext(ctx, "latexmk", args...)
	cmd.Dir = workingDir
	texInputs := fmt.Sprintf(".:%s//:", b.Dir)
	cmd.Env = append(os.Environ(),
		"TEXINPUTS="+texInputs,
		"BIBINPUTS="+texInputs,
		"BSTINPUTS="+texInputs,
	)
	out, err := cmd.CombinedOutput()
	_ = os.WriteFile(filepath.Join(b.Dir, "build.log"), out, 0o644)

	if err != nil {
		s.updateBuild(b.ID, "error", string(out))
		return
	}
	s.updateBuild(b.ID, "success", "")
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	if !s.authorize(w, r) {
		return
	}
	id := chi.URLParam(r, "id")
	b := s.getBuild(id)
	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, b)
}

func (s *Server) handleLog(w http.ResponseWriter, r *http.Request) {
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
		http.Error(w, "no log", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/plain")
	_, _ = w.Write(data)
}

func (s *Server) handlePDF(w http.ResponseWriter, r *http.Request) {
	if !s.authorize(w, r) {
		return
	}
	id := chi.URLParam(r, "id")
	b := s.getBuild(id)
	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	pdf := findPDF(b.Dir)
	if pdf == "" {
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}
	f, err := os.Open(pdf)
	if err != nil {
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", "application/pdf")
	_, _ = io.Copy(w, f)
}

func (s *Server) handleSynctex(w http.ResponseWriter, r *http.Request) {
	if !s.authorize(w, r) {
		return
	}
	id := chi.URLParam(r, "id")
	b := s.getBuild(id)
	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	syn := findSynctex(b.Dir)
	if syn == "" {
		http.Error(w, "no synctex", http.StatusNotFound)
		return
	}
	f, err := os.Open(syn)
	if err != nil {
		http.Error(w, "no synctex", http.StatusNotFound)
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", "application/octet-stream")
	_, _ = io.Copy(w, f)
}

func (s *Server) handleSyncView(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !s.authorize(w, r) {
		return
	}
	b := s.getBuild(id)
	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	file := r.URL.Query().Get("file")
	line := r.URL.Query().Get("line")
	col := r.URL.Query().Get("col")
	if file == "" || line == "" {
		http.Error(w, "file and line required", http.StatusBadRequest)
		return
	}
	pdf := findPDF(b.Dir)
	if pdf == "" {
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}
	if col == "" {
		col = "1"
	}
	input := fmt.Sprintf("%s:%s:%s", line, col, file)
	cmd := exec.Command("synctex", "view", "-i", input, "-o", pdf)
	cmd.Dir = b.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}
	view, err := parseSyncView(string(out))
	if err != nil {
		http.Error(w, "failed to parse synctex", http.StatusInternalServerError)
		return
	}
	if filepath.IsAbs(view.File) {
		if rel, err := filepath.Rel(b.Dir, view.File); err == nil {
			view.File = rel
		}
	}
	writeJSON(w, view)
}

func (s *Server) handleSyncEdit(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !s.authorize(w, r) {
		return
	}
	b := s.getBuild(id)
	if b == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	page := r.URL.Query().Get("page")
	x := r.URL.Query().Get("x")
	y := r.URL.Query().Get("y")
	if page == "" || x == "" || y == "" {
		http.Error(w, "page, x, y required", http.StatusBadRequest)
		return
	}
	pdf := findPDF(b.Dir)
	if pdf == "" {
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}
	input := fmt.Sprintf("%s:%s:%s:%s", page, x, y, pdf)
	cmd := exec.Command("synctex", "edit", "-o", input)
	cmd.Dir = b.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}
	edit, err := parseSyncEdit(string(out))
	if err != nil {
		http.Error(w, "failed to parse synctex", http.StatusInternalServerError)
		return
	}
	if filepath.IsAbs(edit.File) {
		if rel, err := filepath.Rel(b.Dir, edit.File); err == nil {
			edit.File = rel
		}
	}
	writeJSON(w, edit)
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	if !s.authorize(w, r) {
		return
	}
	id := chi.URLParam(r, "id")
	b := s.getBuild(id)
	if b == nil {
		writeJSON(w, map[string]any{"ok": true})
		return
	}
	_ = os.RemoveAll(b.Dir)
	s.mu.Lock()
	delete(s.builds, id)
	s.mu.Unlock()
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) setBuild(id string, b *Build) {
	s.mu.Lock()
	s.builds[id] = b
	s.mu.Unlock()
}

func (s *Server) getBuild(id string) *Build {
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
	if r.Header.Get("X-Builder-Token") != s.cfg.Token {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

func unzip(path, dest string) error {
	r, err := zip.OpenReader(path)
	if err != nil {
		return err
	}
	defer r.Close()
	for _, f := range r.File {
		fp := filepath.Join(dest, f.Name)
		if !strings.HasPrefix(fp, dest) {
			return fmt.Errorf("invalid path")
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

func findPDF(dir string) string {
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
		if strings.HasSuffix(strings.ToLower(path), ".pdf") {
			found = path
			return errors.New("found")
		}
		return nil
	})
	return found
}

func findSynctex(dir string) string {
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
		if strings.HasSuffix(strings.ToLower(path), ".synctex.gz") {
			found = path
			return errors.New("found")
		}
		return nil
	})
	return found
}

type SyncView struct {
	Page int     `json:"page"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	File string  `json:"file"`
	Line int     `json:"line"`
}

type SyncEdit struct {
	File string `json:"file"`
	Line int    `json:"line"`
	Col  int    `json:"col"`
}

func parseSyncView(out string) (*SyncView, error) {
	view := &SyncView{}
	lines := strings.Split(out, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "Page:") {
			fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(line, "Page:")), "%d", &view.Page)
		}
		if strings.HasPrefix(line, "x:") {
			fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(line, "x:")), "%f", &view.X)
		}
		if strings.HasPrefix(line, "y:") {
			fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(line, "y:")), "%f", &view.Y)
		}
		if strings.HasPrefix(line, "Input:") {
			view.File = strings.TrimSpace(strings.TrimPrefix(line, "Input:"))
		}
		if strings.HasPrefix(line, "Line:") {
			fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(line, "Line:")), "%d", &view.Line)
		}
	}
	if view.Page == 0 {
		return nil, fmt.Errorf("missing page")
	}
	return view, nil
}

func parseSyncEdit(out string) (*SyncEdit, error) {
	edit := &SyncEdit{}
	lines := strings.Split(out, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "Input:") {
			edit.File = strings.TrimSpace(strings.TrimPrefix(line, "Input:"))
		}
		if strings.HasPrefix(line, "Line:") {
			fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(line, "Line:")), "%d", &edit.Line)
		}
		if strings.HasPrefix(line, "Column:") {
			fmt.Sscanf(strings.TrimSpace(strings.TrimPrefix(line, "Column:")), "%d", &edit.Col)
		}
	}
	if edit.File == "" || edit.Line == 0 {
		return nil, fmt.Errorf("missing edit info")
	}
	return edit, nil
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

func parseMultipart(r *http.Request) (*multipart.Reader, error) {
	if !strings.Contains(r.Header.Get("Content-Type"), "multipart/form-data") {
		return nil, fmt.Errorf("expected multipart")
	}
	return r.MultipartReader()
}
