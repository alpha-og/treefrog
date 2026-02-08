package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
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
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Project Management

// GetProject returns information about the current project
func (a *App) GetProject() (*ProjectInfo, error) {
	root := a.getRoot()
	name := ""
	if root != "" {
		name = filepath.Base(root)
	}
	return &ProjectInfo{
		Name:       name,
		Root:       root,
		BuilderURL: a.getBuilderURL(),
	}, nil
}

// SetProject sets the project root and opens a directory dialog if root is empty
func (a *App) SetProject(root string) (*ProjectInfo, error) {
	if root == "" {
		// Open directory dialog
		selected, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
			Title: "Select Project Folder",
		})
		if err != nil {
			return nil, err
		}
		if selected == "" {
			return nil, fmt.Errorf("no folder selected")
		}
		root = selected
	}

	if err := a.setRoot(root); err != nil {
		return nil, err
	}

	a.config.ProjectRoot = root
	a.saveConfig()

	return a.GetProject()
}

// OpenProjectDialog opens a directory dialog to select a project
func (a *App) OpenProjectDialog() (*ProjectInfo, error) {
	return a.SetProject("")
}

// File System Operations

// ListFiles lists files in a directory
func (a *App) ListFiles(path string) ([]FileEntry, error) {
	root := a.getRoot()
	if root == "" {
		return nil, fmt.Errorf("project root not set")
	}

	abs, err := a.safePath(path)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(abs)
	if err != nil {
		return nil, err
	}

	var files []FileEntry
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), ".") {
			continue
		}
		info, _ := entry.Info()
		fe := FileEntry{
			Name:    entry.Name(),
			Path:    filepath.Join(path, entry.Name()),
			IsDir:   entry.IsDir(),
			Size:    0,
			ModTime: info.ModTime().Format(time.RFC3339),
		}
		if !entry.IsDir() {
			fe.Size = info.Size()
		}
		files = append(files, fe)
	}

	// Sort: directories first, then alphabetically
	sort.Slice(files, func(i, j int) bool {
		if files[i].IsDir != files[j].IsDir {
			return files[i].IsDir
		}
		return files[i].Name < files[j].Name
	})

	return files, nil
}

// ReadFile reads a file's contents
func (a *App) ReadFile(path string) (string, error) {
	abs, err := a.safePath(path)
	if err != nil {
		return "", err
	}

	data, err := os.ReadFile(abs)
	if err != nil {
		return "", err
	}

	return string(data), nil
}

// WriteFile writes content to a file
func (a *App) WriteFile(path string, content string) error {
	abs, err := a.safePath(path)
	if err != nil {
		return err
	}

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(abs), 0755); err != nil {
		return err
	}

	return os.WriteFile(abs, []byte(content), 0644)
}

// CreateFile creates a new file or directory
func (a *App) CreateFile(path string, fileType string) error {
	abs, err := a.safePath(path)
	if err != nil {
		return err
	}

	if _, err := os.Stat(abs); err == nil {
		return fmt.Errorf("path already exists")
	}

	if fileType == "dir" {
		return os.MkdirAll(abs, 0755)
	}

	// Create parent directories
	if err := os.MkdirAll(filepath.Dir(abs), 0755); err != nil {
		return err
	}

	f, err := os.OpenFile(abs, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	return f.Close()
}

// RenameFile renames a file or directory
func (a *App) RenameFile(from, to string) error {
	fromAbs, err := a.safePath(from)
	if err != nil {
		return err
	}
	toAbs, err := a.safePath(to)
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(toAbs), 0755); err != nil {
		return err
	}

	return os.Rename(fromAbs, toAbs)
}

// DeleteFile deletes a file or directory
func (a *App) DeleteFile(path string, recursive bool) error {
	abs, err := a.safePath(path)
	if err != nil {
		return err
	}

	info, err := os.Stat(abs)
	if err != nil {
		return err
	}

	if info.IsDir() {
		if recursive {
			return os.RemoveAll(abs)
		}
		// Check if empty
		entries, err := os.ReadDir(abs)
		if err != nil {
			return err
		}
		if len(entries) > 0 {
			return fmt.Errorf("directory not empty")
		}
		return os.Remove(abs)
	}

	return os.Remove(abs)
}

// MoveFile moves a file to a different directory
func (a *App) MoveFile(from, toDir string) error {
	fromAbs, err := a.safePath(from)
	if err != nil {
		return err
	}
	toDirAbs, err := a.safePath(toDir)
	if err != nil {
		return err
	}

	info, err := os.Stat(toDirAbs)
	if err != nil || !info.IsDir() {
		return fmt.Errorf("target is not a directory")
	}

	dest := filepath.Join(toDirAbs, filepath.Base(from))
	return os.Rename(fromAbs, dest)
}

// DuplicateFile duplicates a file or directory
func (a *App) DuplicateFile(from, to string) error {
	fromAbs, err := a.safePath(from)
	if err != nil {
		return err
	}
	toAbs, err := a.safePath(to)
	if err != nil {
		return err
	}

	info, err := os.Stat(fromAbs)
	if err != nil {
		return err
	}

	if info.IsDir() {
		return copyDir(fromAbs, toAbs)
	}

	if err := os.MkdirAll(filepath.Dir(toAbs), 0755); err != nil {
		return err
	}
	return copyFile(fromAbs, toAbs)
}

// Build Operations

// GetBuildStatus returns the current build status
func (a *App) GetBuildStatus() BuildStatus {
	a.statusMu.Lock()
	defer a.statusMu.Unlock()
	return a.status
}

// TriggerBuild starts a new build
func (a *App) TriggerBuild(mainFile, engine string, shellEscape bool) error {
	root := a.getRoot()
	if root == "" {
		return fmt.Errorf("project root not set")
	}

	a.statusMu.Lock()
	a.status = BuildStatus{
		ID:        fmt.Sprintf("build-%d", time.Now().Unix()),
		State:     "running",
		Message:   "Starting build...",
		StartedAt: time.Now().Format(time.RFC3339),
	}
	a.statusMu.Unlock()

	a.emitBuildStatus(a.status)

	// Run build in background
	go a.runBuild(mainFile, engine, shellEscape)

	return nil
}

// runBuild performs the actual build
func (a *App) runBuild(mainFile, engine string, shellEscape bool) {
	defer func() {
		if r := recover(); r != nil {
			a.statusMu.Lock()
			a.status.State = "error"
			a.status.Message = fmt.Sprintf("Build panicked: %v", r)
			a.status.EndedAt = time.Now().Format(time.RFC3339)
			a.statusMu.Unlock()
			a.emitBuildStatus(a.status)
		}
	}()

	root := a.getRoot()
	builderURL := a.getBuilderURL()
	builderToken := a.getBuilderToken()

	// Create zip of project
	zipPath := filepath.Join(a.cacheDir, "build.zip")
	if err := zipProject(root, zipPath); err != nil {
		a.statusMu.Lock()
		a.status.State = "error"
		a.status.Message = err.Error()
		a.status.EndedAt = time.Now().Format(time.RFC3339)
		a.statusMu.Unlock()
		a.emitBuildStatus(a.status)
		return
	}

	// Upload to builder
	remoteID, err := a.uploadBuild(zipPath, builderURL, builderToken)
	if err != nil {
		a.statusMu.Lock()
		a.status.State = "error"
		a.status.Message = err.Error()
		a.status.EndedAt = time.Now().Format(time.RFC3339)
		a.statusMu.Unlock()
		a.emitBuildStatus(a.status)
		return
	}

	a.setRemoteID(remoteID)

	// Poll for completion
	a.pollBuildStatus(remoteID, mainFile, engine, shellEscape, builderURL, builderToken)
}

// uploadBuild uploads the project zip to the builder
func (a *App) uploadBuild(zipPath, builderURL, builderToken string) (string, error) {
	file, err := os.Open(zipPath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, err := writer.CreateFormFile("project", "project.zip")
	if err != nil {
		return "", err
	}

	if _, err := io.Copy(part, file); err != nil {
		return "", err
	}
	writer.Close()

	req, err := http.NewRequest("POST", builderURL+"/build", body)
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	if builderToken != "" {
		req.Header.Set("Authorization", "Bearer "+builderToken)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("builder error: %s", string(body))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.ID, nil
}

// pollBuildStatus polls the builder for build status
func (a *App) pollBuildStatus(remoteID, mainFile, engine string, shellEscape bool, builderURL, builderToken string) {
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	timeout := time.AfterFunc(5*time.Minute, func() {
		a.statusMu.Lock()
		a.status.State = "error"
		a.status.Message = "Build timeout"
		a.status.EndedAt = time.Now().Format(time.RFC3339)
		a.statusMu.Unlock()
		a.emitBuildStatus(a.status)
	})
	defer timeout.Stop()

	for range ticker.C {
		status, err := a.checkRemoteBuild(remoteID, builderURL, builderToken)
		if err != nil {
			a.statusMu.Lock()
			a.status.State = "error"
			a.status.Message = err.Error()
			a.status.EndedAt = time.Now().Format(time.RFC3339)
			a.statusMu.Unlock()
			a.emitBuildStatus(a.status)
			return
		}

		a.statusMu.Lock()
		a.status.State = status
		a.status.Message = fmt.Sprintf("Build %s", status)
		a.statusMu.Unlock()
		a.emitBuildStatus(a.status)

		if status == "success" {
			// Download PDF
			if err := a.downloadPDF(remoteID, builderURL, builderToken); err != nil {
				a.statusMu.Lock()
				a.status.State = "error"
				a.status.Message = err.Error()
				a.status.EndedAt = time.Now().Format(time.RFC3339)
				a.statusMu.Unlock()
				a.emitBuildStatus(a.status)
				return
			}
			a.statusMu.Lock()
			a.status.EndedAt = time.Now().Format(time.RFC3339)
			a.statusMu.Unlock()
			a.emitBuildStatus(a.status)
			return
		}

		if status == "error" {
			a.statusMu.Lock()
			a.status.EndedAt = time.Now().Format(time.RFC3339)
			a.statusMu.Unlock()
			a.emitBuildStatus(a.status)
			return
		}
	}
}

// checkRemoteBuild checks the status of a remote build
func (a *App) checkRemoteBuild(remoteID, builderURL, builderToken string) (string, error) {
	req, err := http.NewRequest("GET", builderURL+"/build/"+remoteID+"/status", nil)
	if err != nil {
		return "", err
	}

	if builderToken != "" {
		req.Header.Set("Authorization", "Bearer "+builderToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		State string `json:"state"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.State, nil
}

// downloadPDF downloads the built PDF
func (a *App) downloadPDF(remoteID, builderURL, builderToken string) error {
	req, err := http.NewRequest("GET", builderURL+"/build/"+remoteID+"/pdf", nil)
	if err != nil {
		return err
	}

	if builderToken != "" {
		req.Header.Set("Authorization", "Bearer "+builderToken)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download PDF: %s", resp.Status)
	}

	pdfPath := filepath.Join(a.cacheDir, "last.pdf")
	file, err := os.Create(pdfPath)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = io.Copy(file, resp.Body)
	return err
}

// zipProject creates a zip archive of the project
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

		// Skip hidden files and build artifacts
		if strings.HasPrefix(rel, ".") || strings.HasPrefix(rel, "_") {
			if d.IsDir() {
				return fs.SkipDir
			}
			return nil
		}

		// Skip build artifacts
		if isBuildArtifact(rel) {
			return nil
		}

		if d.IsDir() {
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

// isBuildArtifact checks if a file is a LaTeX build artifact
func isBuildArtifact(rel string) bool {
	ext := strings.ToLower(filepath.Ext(rel))
	artifacts := map[string]bool{
		".aux": true, ".log": true, ".synctex.gz": true,
		".bbl": true, ".blg": true, ".out": true,
		".toc": true, ".lof": true, ".lot": true,
		".fdb_latexmk": true, ".fls": true,
	}
	return artifacts[ext]
}

// GetBuildLog returns the build log content
func (a *App) GetBuildLog() (string, error) {
	logPath := filepath.Join(a.cacheDir, "build.log")
	data, err := os.ReadFile(logPath)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// GetPDFPath returns the path to the last built PDF
func (a *App) GetPDFPath() (string, error) {
	pdfPath := filepath.Join(a.cacheDir, "last.pdf")
	if _, err := os.Stat(pdfPath); err != nil {
		return "", fmt.Errorf("no PDF available")
	}
	return pdfPath, nil
}

// ExportPDF exports the PDF to a user-selected location
func (a *App) ExportPDF() (string, error) {
	pdfPath, err := a.GetPDFPath()
	if err != nil {
		return "", err
	}

	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:                "Export PDF",
		DefaultFilename:      "document.pdf",
		ShowHiddenFiles:      false,
		CanCreateDirectories: true,
	})
	if err != nil {
		return "", err
	}
	if savePath == "" {
		return "", fmt.Errorf("no file selected")
	}

	return savePath, copyFile(pdfPath, savePath)
}

// ExportSource exports the project source as a zip
func (a *App) ExportSource() (string, error) {
	root := a.getRoot()
	if root == "" {
		return "", fmt.Errorf("project root not set")
	}

	savePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:                "Export Source",
		DefaultFilename:      "project.zip",
		ShowHiddenFiles:      false,
		CanCreateDirectories: true,
	})
	if err != nil {
		return "", err
	}
	if savePath == "" {
		return "", fmt.Errorf("no file selected")
	}

	return savePath, zipProject(root, savePath)
}

// Git Operations

// GitStatus returns the git status
func (a *App) GitStatus() (*GitStatus, error) {
	root := a.getRoot()
	if root == "" {
		return nil, fmt.Errorf("project root not set")
	}

	if _, err := os.Stat(filepath.Join(root, ".git")); err != nil {
		return &GitStatus{Raw: "not a git repository"}, nil
	}

	out, err := runGit(root, "status", "--porcelain=v1", "-b")
	if err != nil {
		return nil, err
	}

	return &GitStatus{Raw: out}, nil
}

// runGit executes a git command in the project root
func runGit(root string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = root
	out, err := cmd.CombinedOutput()
	return string(out), err
}

// GitCommit commits changes
func (a *App) GitCommit(message string, files []string, all bool) error {
	root := a.getRoot()
	if root == "" {
		return fmt.Errorf("project root not set")
	}

	if all {
		if _, err := runGit(root, "add", "-A"); err != nil {
			return err
		}
	}

	if len(files) > 0 {
		args := append([]string{"add"}, files...)
		if _, err := runGit(root, args...); err != nil {
			return err
		}
	}

	_, err := runGit(root, "commit", "-m", message)
	return err
}

// GitPush pushes commits
func (a *App) GitPush(remote string) error {
	root := a.getRoot()
	if root == "" {
		return fmt.Errorf("project root not set")
	}

	args := []string{"push"}
	if remote != "" {
		args = append(args, remote)
	}

	_, err := runGit(root, args...)
	return err
}

// GitPull pulls changes
func (a *App) GitPull(remote string) error {
	root := a.getRoot()
	if root == "" {
		return fmt.Errorf("project root not set")
	}

	args := []string{"pull"}
	if remote != "" {
		args = append(args, remote)
	}

	_, err := runGit(root, args...)
	return err
}

// SyncTeX Operations

// SyncTeXView navigates from source to PDF
func (a *App) SyncTeXView(file string, line, col int) (*SyncTeXResult, error) {
	remoteID := a.getRemoteID()
	if remoteID == "" {
		return nil, fmt.Errorf("no build available")
	}

	builderURL := a.getBuilderURL()
	url := fmt.Sprintf("%s/build/%s/synctex/view?file=%s&line=%d",
		builderURL, remoteID, url.QueryEscape(file), line)
	if col > 0 {
		url += fmt.Sprintf("&col=%d", col)
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	builderToken := a.getBuilderToken()
	if builderToken != "" {
		req.Header.Set("Authorization", "Bearer "+builderToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("synctex failed: %s", resp.Status)
	}

	var result SyncTeXResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

// SyncTeXEdit navigates from PDF to source
func (a *App) SyncTeXEdit(page int, x, y float64) (*SyncTeXResult, error) {
	remoteID := a.getRemoteID()
	if remoteID == "" {
		return nil, fmt.Errorf("no build available")
	}

	builderURL := a.getBuilderURL()
	url := fmt.Sprintf("%s/build/%s/synctex/edit?page=%d&x=%f&y=%f",
		builderURL, remoteID, page, x, y)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	builderToken := a.getBuilderToken()
	if builderToken != "" {
		req.Header.Set("Authorization", "Bearer "+builderToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("synctex failed: %s", resp.Status)
	}

	var result SyncTeXResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}
