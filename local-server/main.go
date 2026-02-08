package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"mime/multipart"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	"github.com/gorilla/websocket"
)

type Config struct {
	ProjectRoot     string
	BuilderURL      string
	BuilderToken    string
	BuilderInsecure bool
	Port            string
}

type BuildStatus struct {
	ID        string    `json:"id"`
	State     string    `json:"state"` // idle|running|success|error
	Message   string    `json:"message"`
	StartedAt time.Time `json:"startedAt"`
	EndedAt   time.Time `json:"endedAt"`
}

type BuildOptions struct {
	MainFile    string `json:"mainFile"`
	Engine      string `json:"engine"`
	ShellEscape bool   `json:"shellEscape"`
}

type Server struct {
	cfg          Config
	rootMu       sync.Mutex
	projectRoot  string
	cacheDir     string
	statusMu     sync.Mutex
	status       BuildStatus
	clientsMu    sync.Mutex
	clients      map[*websocket.Conn]struct{}
	remoteMu     sync.Mutex
	remoteID     string
	configMu     sync.Mutex
	builderURL   string
	builderToken string
}

func main() {
	cfg := Config{
		ProjectRoot:  os.Getenv("PROJECT_ROOT"),
		BuilderURL:   os.Getenv("BUILDER_URL"),
		BuilderToken: os.Getenv("BUILDER_TOKEN"),
		Port:         os.Getenv("PORT"),
	}
	if cfg.BuilderURL == "" {
		cfg.BuilderURL = "https://builder.example.com"
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	s := &Server{
		cfg:          cfg,
		status:       BuildStatus{State: "idle"},
		clients:      map[*websocket.Conn]struct{}{},
		builderURL:   cfg.BuilderURL,
		builderToken: cfg.BuilderToken,
	}
	if cfg.ProjectRoot != "" {
		_ = s.setRoot(cfg.ProjectRoot)
	}

	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:3000", "http://localhost:8080"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/api/project", s.handleProject)
	r.Post("/api/project/set", s.handleSetProject)
	r.Post("/api/config", s.handleConfig)
	r.Get("/api/files", s.handleListFiles)
	r.Get("/api/file", s.handleGetFile)
	r.Put("/api/file", s.handlePutFile)

	r.Post("/api/build", s.handleBuild)
	r.Get("/api/build/status", s.handleBuildStatus)
	r.Get("/api/build/log", s.handleBuildLog)

	r.Get("/api/export/pdf", s.handleExportPDF)
	r.Get("/api/export/source-zip", s.handleExportSourceZip)

	r.Get("/api/git/status", s.handleGitStatus)
	r.Post("/api/git/commit", s.handleGitCommit)
	r.Post("/api/git/push", s.handleGitPush)
	r.Post("/api/git/pull", s.handleGitPull)

	r.Post("/api/fs/create", s.handleFSCreate)
	r.Post("/api/fs/rename", s.handleFSRename)
	r.Post("/api/fs/move", s.handleFSMove)
	r.Post("/api/fs/duplicate", s.handleFSDuplicate)
	r.Post("/api/fs/delete", s.handleFSDelete)

	r.Get("/api/synctex/view", s.handleSyncView)
	r.Get("/api/synctex/edit", s.handleSyncEdit)

	r.Get("/ws/build", s.handleBuildWS)

	fmt.Printf("═══════════════════════════════════════════════════════════\n")
	fmt.Printf("Local server running on http://localhost:%s\n", cfg.Port)
	fmt.Printf("Builder URL: %s\n", s.getBuilderURL())
	fmt.Printf("Project Root: %s\n", s.getRoot())
	fmt.Printf("═══════════════════════════════════════════════════════════\n")
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func (s *Server) handleProject(w http.ResponseWriter, r *http.Request) {
	root := s.getRoot()
	name := ""
	if root != "" {
		name = filepath.Base(root)
	}
	resp := map[string]any{
		"name":       name,
		"root":       root,
		"builderUrl": s.getBuilderURL(),
	}
	writeJSON(w, resp)
}

func (s *Server) handleSetProject(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Root string `json:"root"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if body.Root == "" {
		http.Error(w, "root required", http.StatusBadRequest)
		return
	}
	if err := s.setRoot(body.Root); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, map[string]any{"ok": true, "root": s.getRoot()})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	var body struct {
		BuilderURL   string `json:"builderUrl"`
		BuilderToken string `json:"builderToken"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	s.configMu.Lock()
	if body.BuilderURL != "" {
		s.builderURL = body.BuilderURL
		fmt.Printf("[CONFIG] Builder URL updated to: %s\n", body.BuilderURL)
	}
	if body.BuilderToken != "" {
		s.builderToken = body.BuilderToken
		fmt.Printf("[CONFIG] Builder Token updated (length: %d)\n", len(body.BuilderToken))
	}
	s.configMu.Unlock()

	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleListFiles(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	path := r.URL.Query().Get("path")
	abs, err := s.safePath(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	entries, err := os.ReadDir(abs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	out := []map[string]any{}
	for _, e := range entries {
		if e.Name() == ".treefrog-cache" {
			continue
		}
		info, _ := e.Info()
		out = append(out, map[string]any{
			"name":    e.Name(),
			"isDir":   e.IsDir(),
			"size":    info.Size(),
			"modTime": info.ModTime(),
		})
	}
	sort.Slice(out, func(i, j int) bool {
		di := out[i]["isDir"].(bool)
		dj := out[j]["isDir"].(bool)
		if di != dj {
			return di
		}
		return out[i]["name"].(string) < out[j]["name"].(string)
	})
	writeJSON(w, out)
}

func (s *Server) handleGetFile(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	path := r.URL.Query().Get("path")
	abs, err := s.safePath(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	isBinary := bytes.Contains(data, []byte{0})
	resp := map[string]any{
		"path":     path,
		"isBinary": isBinary,
	}
	if isBinary {
		resp["contentBase64"] = base64.StdEncoding.EncodeToString(data)
	} else {
		resp["content"] = string(data)
	}
	writeJSON(w, resp)
}

func (s *Server) handlePutFile(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	path := r.URL.Query().Get("path")
	abs, err := s.safePath(path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	var body struct {
		Content       string `json:"content"`
		ContentBase64 string `json:"contentBase64"`
		IsBinary      bool   `json:"isBinary"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	var data []byte
	if body.IsBinary {
		b, err := base64.StdEncoding.DecodeString(body.ContentBase64)
		if err != nil {
			http.Error(w, "invalid base64", http.StatusBadRequest)
			return
		}
		data = b
	} else {
		data = []byte(body.Content)
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := os.WriteFile(abs, data, 0o644); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleBuild(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var opts BuildOptions
	if err := json.NewDecoder(r.Body).Decode(&opts); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if opts.Engine == "" {
		opts.Engine = "pdflatex"
	}

	buildID := fmt.Sprintf("bld_%d", time.Now().UnixNano())
	s.updateStatus(BuildStatus{ID: buildID, State: "running", StartedAt: time.Now()})
	go s.runBuild(buildID, opts)
	writeJSON(w, map[string]any{"id": buildID})
}

func (s *Server) runBuild(buildID string, opts BuildOptions) {
	ctx := context.Background()
	root := s.getRoot()
	zipPath := filepath.Join(s.cacheDir, "source.zip")
	if err := zipProject(root, zipPath); err != nil {
		s.updateStatus(BuildStatus{ID: buildID, State: "error", Message: err.Error(), EndedAt: time.Now()})
		return
	}

	buildURL := strings.TrimRight(s.getBuilderURL(), "/") + "/build"
	fmt.Printf("[BUILD] Sending build to: %s\n", buildURL)

	buf := &bytes.Buffer{}
	mw := multipart.NewWriter(buf)
	_ = mw.WriteField("options", mustJSON(opts))
	fw, err := mw.CreateFormFile("file", "source.zip")
	if err != nil {
		s.updateStatus(BuildStatus{ID: buildID, State: "error", Message: err.Error(), EndedAt: time.Now()})
		return
	}
	f, err := os.Open(zipPath)
	if err != nil {
		s.updateStatus(BuildStatus{ID: buildID, State: "error", Message: err.Error(), EndedAt: time.Now()})
		return
	}
	_, _ = io.Copy(fw, f)
	_ = f.Close()
	_ = mw.Close()

	req, _ := http.NewRequestWithContext(ctx, "POST", buildURL, buf)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	if s.getBuilderToken() != "" {
		req.Header.Set("X-Builder-Token", s.getBuilderToken())
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		s.updateStatus(BuildStatus{ID: buildID, State: "error", Message: err.Error(), EndedAt: time.Now()})
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		s.updateStatus(BuildStatus{ID: buildID, State: "error", Message: string(b), EndedAt: time.Now()})
		return
	}
	var buildResp struct {
		ID string `json:"id"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&buildResp)
	if buildResp.ID == "" {
		s.updateStatus(BuildStatus{ID: buildID, State: "error", Message: "invalid builder response", EndedAt: time.Now()})
		return
	}
	s.setRemoteID(buildResp.ID)

	pdfURL := strings.TrimRight(s.getBuilderURL(), "/") + "/build/" + buildResp.ID + "/artifacts/pdf"
	synURL := strings.TrimRight(s.getBuilderURL(), "/") + "/build/" + buildResp.ID + "/artifacts/synctex"
	logURL := strings.TrimRight(s.getBuilderURL(), "/") + "/build/" + buildResp.ID + "/log"
	statusURL := strings.TrimRight(s.getBuilderURL(), "/") + "/build/" + buildResp.ID + "/status"

	if err := s.waitForRemote(statusURL, 10*time.Minute); err != nil {
		s.updateStatus(BuildStatus{ID: buildID, State: "error", Message: err.Error(), EndedAt: time.Now()})
		return
	}

	_ = s.fetchToFile(logURL, filepath.Join(s.cacheDir, "last.log"))
	if err := s.fetchToFile(pdfURL, filepath.Join(s.cacheDir, "last.pdf")); err != nil {
		msg := err.Error()
		if logData, logErr := os.ReadFile(filepath.Join(s.cacheDir, "last.log")); logErr == nil {
			msg = msg + "\n" + string(logData)
		}
		s.updateStatus(BuildStatus{ID: buildID, State: "error", Message: msg, EndedAt: time.Now()})
		return
	}
	_ = s.fetchToFile(synURL, filepath.Join(s.cacheDir, "last.synctex.gz"))

	_ = s.cleanupRemote(buildResp.ID)
	s.updateStatus(BuildStatus{ID: buildID, State: "success", EndedAt: time.Now()})
}

func (s *Server) waitForRemote(statusURL string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		if time.Now().After(deadline) {
			return fmt.Errorf("remote build timeout")
		}
		resp, err := s.fetchJSON(statusURL)
		if err != nil {
			return err
		}
		if status, ok := resp["status"].(string); ok {
			switch status {
			case "running":
				time.Sleep(500 * time.Millisecond)
				continue
			case "success":
				return nil
			case "error":
				if msg, ok := resp["message"].(string); ok && msg != "" {
					return fmt.Errorf("remote build error: %s", msg)
				}
				return fmt.Errorf("remote build error")
			}
		}
		time.Sleep(500 * time.Millisecond)
	}
}

func (s *Server) fetchToFile(url, dest string) error {
	req, _ := http.NewRequest("GET", url, nil)
	if s.getBuilderToken() != "" {
		req.Header.Set("X-Builder-Token", s.getBuilderToken())
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("remote error: %s", string(b))
	}
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(f, resp.Body)
	return err
}

func (s *Server) cleanupRemote(id string) error {
	url := strings.TrimRight(s.getBuilderURL(), "/") + "/build/" + id
	req, _ := http.NewRequest("DELETE", url, nil)
	if s.getBuilderToken() != "" {
		req.Header.Set("X-Builder-Token", s.getBuilderToken())
	}
	_, err := http.DefaultClient.Do(req)
	return err
}

func (s *Server) handleBuildStatus(w http.ResponseWriter, r *http.Request) {
	s.statusMu.Lock()
	defer s.statusMu.Unlock()
	writeJSON(w, s.status)
}

func (s *Server) handleBuildLog(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	data, err := os.ReadFile(filepath.Join(s.cacheDir, "last.log"))
	if err != nil {
		http.Error(w, "no log", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "text/plain")
	_, _ = w.Write(data)
}

func (s *Server) handleExportPDF(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	path := filepath.Join(s.cacheDir, "last.pdf")
	f, err := os.Open(path)
	if err != nil {
		http.Error(w, "no pdf", http.StatusNotFound)
		return
	}
	defer f.Close()
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Content-Type", "application/pdf")
	_, _ = io.Copy(w, f)
}

func (s *Server) handleExportSourceZip(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	zipPath := filepath.Join(s.cacheDir, "source.zip")
	if _, err := os.Stat(zipPath); err != nil {
		if err := zipProject(s.getRoot(), zipPath); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	f, err := os.Open(zipPath)
	if err != nil {
		http.Error(w, "no zip", http.StatusNotFound)
		return
	}
	defer f.Close()
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Content-Type", "application/zip")
	_, _ = io.Copy(w, f)
}

func (s *Server) handleGitStatus(w http.ResponseWriter, r *http.Request) {
	root := s.getRoot()
	if root == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	if _, err := os.Stat(filepath.Join(root, ".git")); err != nil {
		writeJSON(w, map[string]any{"raw": "not a git repository"})
		return
	}
	out, err := runGit(root, "status", "--porcelain=v1", "-b")
	if err != nil {
		if strings.Contains(err.Error(), "not a git repository") {
			writeJSON(w, map[string]any{"raw": "not a git repository"})
			return
		}
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"raw": out})
}

func (s *Server) handleGitCommit(w http.ResponseWriter, r *http.Request) {
	root := s.getRoot()
	if root == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var body struct {
		Message string   `json:"message"`
		Files   []string `json:"files"`
		All     bool     `json:"all"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if body.Message == "" {
		http.Error(w, "message required", http.StatusBadRequest)
		return
	}
	if body.All {
		if _, err := runGit(root, "add", "-A"); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	if len(body.Files) > 0 {
		args := append([]string{"add"}, body.Files...)
		if _, err := runGit(root, args...); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	if _, err := runGit(root, "commit", "-m", body.Message); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleGitPush(w http.ResponseWriter, r *http.Request) {
	root := s.getRoot()
	if root == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var body struct {
		Remote string `json:"remote"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	args := []string{"push"}
	if body.Remote != "" {
		args = append(args, body.Remote)
	}
	if _, err := runGit(root, args...); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleGitPull(w http.ResponseWriter, r *http.Request) {
	root := s.getRoot()
	if root == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var body struct {
		Remote string `json:"remote"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	args := []string{"pull"}
	if body.Remote != "" {
		args = append(args, body.Remote)
	}
	if _, err := runGit(root, args...); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleFSCreate(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var body struct {
		Path string `json:"path"`
		Type string `json:"type"` // file|dir
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if body.Path == "" || (body.Type != "file" && body.Type != "dir") {
		http.Error(w, "path and type required", http.StatusBadRequest)
		return
	}
	abs, err := s.safePath(body.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if _, err := os.Stat(abs); err == nil {
		http.Error(w, "path already exists", http.StatusBadRequest)
		return
	}
	if body.Type == "dir" {
		if err := os.MkdirAll(abs, 0o755); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		if err := os.MkdirAll(filepath.Dir(abs), 0o755); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		f, err := os.OpenFile(abs, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		_ = f.Close()
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleFSRename(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var body struct {
		From string `json:"from"`
		To   string `json:"to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if body.From == "" || body.To == "" {
		http.Error(w, "from and to required", http.StatusBadRequest)
		return
	}
	fromAbs, err := s.safePath(body.From)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	toAbs, err := s.safePath(body.To)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if err := os.MkdirAll(filepath.Dir(toAbs), 0o755); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if err := os.Rename(fromAbs, toAbs); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleFSMove(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var body struct {
		From  string `json:"from"`
		ToDir string `json:"toDir"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if body.From == "" || body.ToDir == "" {
		http.Error(w, "from and toDir required", http.StatusBadRequest)
		return
	}
	fromAbs, err := s.safePath(body.From)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	toDirAbs, err := s.safePath(body.ToDir)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	info, err := os.Stat(toDirAbs)
	if err != nil || !info.IsDir() {
		http.Error(w, "target directory not found", http.StatusBadRequest)
		return
	}
	dest := filepath.Join(toDirAbs, filepath.Base(fromAbs))
	if err := os.Rename(fromAbs, dest); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleFSDuplicate(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var body struct {
		From string `json:"from"`
		To   string `json:"to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if body.From == "" || body.To == "" {
		http.Error(w, "from and to required", http.StatusBadRequest)
		return
	}
	fromAbs, err := s.safePath(body.From)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	toAbs, err := s.safePath(body.To)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	info, err := os.Stat(fromAbs)
	if err != nil {
		http.Error(w, "source not found", http.StatusBadRequest)
		return
	}
	if info.IsDir() {
		if err := copyDir(fromAbs, toAbs); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		if err := os.MkdirAll(filepath.Dir(toAbs), 0o755); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		if err := copyFile(fromAbs, toAbs); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleFSDelete(w http.ResponseWriter, r *http.Request) {
	if s.getRoot() == "" {
		http.Error(w, "project root not set", http.StatusBadRequest)
		return
	}
	var body struct {
		Path      string `json:"path"`
		Recursive bool   `json:"recursive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	if body.Path == "" {
		http.Error(w, "path required", http.StatusBadRequest)
		return
	}
	abs, err := s.safePath(body.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	info, err := os.Stat(abs)
	if err != nil {
		http.Error(w, "not found", http.StatusBadRequest)
		return
	}
	if info.IsDir() {
		if !body.Recursive {
			entries, err := os.ReadDir(abs)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			if len(entries) > 0 {
				http.Error(w, "directory not empty", http.StatusBadRequest)
				return
			}
			if err := os.Remove(abs); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			if err := os.RemoveAll(abs); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	} else {
		if err := os.Remove(abs); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	writeJSON(w, map[string]any{"ok": true})
}

func (s *Server) handleSyncView(w http.ResponseWriter, r *http.Request) {
	remoteID := s.getRemoteID()
	if remoteID == "" {
		http.Error(w, "no build yet", http.StatusBadRequest)
		return
	}
	file := r.URL.Query().Get("file")
	line := r.URL.Query().Get("line")
	col := r.URL.Query().Get("col")
	if file == "" || line == "" {
		http.Error(w, "file and line required", http.StatusBadRequest)
		return
	}
	url := strings.TrimRight(s.getBuilderURL(), "/") + "/build/" + remoteID + "/synctex/view?file=" + urlQuery(file) + "&line=" + urlQuery(line)
	if col != "" {
		url += "&col=" + urlQuery(col)
	}
	resp, err := s.fetchJSON(url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, resp)
}

func (s *Server) handleSyncEdit(w http.ResponseWriter, r *http.Request) {
	remoteID := s.getRemoteID()
	if remoteID == "" {
		http.Error(w, "no build yet", http.StatusBadRequest)
		return
	}
	page := r.URL.Query().Get("page")
	x := r.URL.Query().Get("x")
	y := r.URL.Query().Get("y")
	if page == "" || x == "" || y == "" {
		http.Error(w, "page, x, y required", http.StatusBadRequest)
		return
	}
	url := strings.TrimRight(s.getBuilderURL(), "/") + "/build/" + remoteID + "/synctex/edit?page=" + urlQuery(page) + "&x=" + urlQuery(x) + "&y=" + urlQuery(y)
	resp, err := s.fetchJSON(url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeJSON(w, resp)
}

func (s *Server) handleBuildWS(w http.ResponseWriter, r *http.Request) {
	up := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	conn, err := up.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	s.clientsMu.Lock()
	s.clients[conn] = struct{}{}
	s.clientsMu.Unlock()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}

	s.clientsMu.Lock()
	delete(s.clients, conn)
	s.clientsMu.Unlock()
	_ = conn.Close()
}

func (s *Server) updateStatus(st BuildStatus) {
	s.statusMu.Lock()
	s.status = st
	s.statusMu.Unlock()
	msg, _ := json.Marshal(st)
	s.broadcast(msg)
}

func (s *Server) setRoot(root string) error {
	abs, err := filepath.Abs(root)
	if err != nil {
		return err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("root is not a directory")
	}
	cacheDir := filepath.Join(abs, ".treefrog-cache")
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return err
	}
	s.rootMu.Lock()
	s.projectRoot = abs
	s.cacheDir = cacheDir
	s.rootMu.Unlock()
	return nil
}

func (s *Server) getRoot() string {
	s.rootMu.Lock()
	defer s.rootMu.Unlock()
	return s.projectRoot
}

func (s *Server) setRemoteID(id string) {
	s.remoteMu.Lock()
	s.remoteID = id
	s.remoteMu.Unlock()
}

func (s *Server) getRemoteID() string {
	s.remoteMu.Lock()
	defer s.remoteMu.Unlock()
	return s.remoteID
}

func (s *Server) getBuilderURL() string {
	s.configMu.Lock()
	defer s.configMu.Unlock()
	return s.builderURL
}

func (s *Server) getBuilderToken() string {
	s.configMu.Lock()
	defer s.configMu.Unlock()
	return s.builderToken
}

func (s *Server) broadcast(msg []byte) {
	s.clientsMu.Lock()
	defer s.clientsMu.Unlock()
	for c := range s.clients {
		_ = c.WriteMessage(websocket.TextMessage, msg)
	}
}

func (s *Server) safePath(path string) (string, error) {
	if path == "" || path == "/" {
		root := s.getRoot()
		if root == "" {
			return "", errors.New("project root not set")
		}
		return root, nil
	}
	root := s.getRoot()
	if root == "" {
		return "", errors.New("project root not set")
	}
	clean := filepath.Clean(path)
	if strings.Contains(clean, "..") {
		return "", errors.New("invalid path")
	}
	abs := filepath.Join(root, clean)
	if !strings.HasPrefix(abs, root) {
		return "", errors.New("invalid path")
	}
	return abs, nil
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func runGit(root string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = root
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("git %v: %s", args, string(out))
	}
	return string(out), nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		return err
	}
	defer out.Close()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return nil
}

func copyDir(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		return copyFile(path, target)
	})
}

func (s *Server) fetchJSON(url string) (map[string]any, error) {
	req, _ := http.NewRequest("GET", url, nil)
	if s.getBuilderToken() != "" {
		req.Header.Set("X-Builder-Token", s.getBuilderToken())
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("remote error: %s", string(b))
	}
	var data map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return data, nil
}

func urlQuery(v string) string {
	return url.QueryEscape(v)
}

func zipProject(root, dest string) error {
	f, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer f.Close()
	zw := zip.NewWriter(f)
	defer zw.Close()

	return filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(root, path)
		if rel == "." {
			return nil
		}
		if strings.HasPrefix(rel, ".git") || strings.HasPrefix(rel, ".treefrog-cache") {
			if d.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		if d.IsDir() {
			return nil
		}
		if isBuildArtifact(rel) {
			return nil
		}
		w, err := zw.Create(rel)
		if err != nil {
			return err
		}
		src, err := os.Open(path)
		if err != nil {
			return err
		}
		defer src.Close()
		_, err = io.Copy(w, src)
		return err
	})
}

func isBuildArtifact(rel string) bool {
	if strings.HasSuffix(rel, ".synctex.gz") {
		return true
	}
	ext := strings.ToLower(filepath.Ext(rel))
	skip := map[string]bool{".aux": true, ".log": true, ".synctex.gz": true, ".bbl": true, ".blg": true, ".out": true}
	if skip[ext] {
		return true
	}
	return false
}

func mustJSON(v any) string {
	b, _ := json.Marshal(v)
	return string(b)
}
