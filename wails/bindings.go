package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
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
	"unicode/utf8"

	"github.com/sirupsen/logrus"
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
		Name:        name,
		Root:        root,
		CompilerURL: a.getCompilerURL(),
	}, nil
}

// SetProject sets the project root and opens a directory dialog if root is empty
func (a *App) SetProject(root string) (*ProjectInfo, error) {
	Logger.WithFields(logrus.Fields{
		"action": "set_project",
		"root":   root,
	}).Info("SetProject called")

	if root == "" {
		Logger.Debug("Opening directory dialog for project selection")
		selected, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
			Title: "Select Project Folder",
		})
		if err != nil {
			Logger.WithError(err).Error("Failed to open directory dialog")
			return nil, err
		}
		if selected == "" {
			Logger.Warn("No folder selected in dialog")
			return nil, fmt.Errorf("no folder selected")
		}
		root = selected
		Logger.WithFields(logrus.Fields{
			"action": "set_project",
			"root":   root,
		}).Info("User selected project folder")
	}

	if err := a.setRoot(root); err != nil {
		Logger.WithError(err).WithFields(logrus.Fields{
			"action": "set_project",
			"root":   root,
		}).Error("Failed to set project root")
		return nil, err
	}

	a.config.ProjectRoot = root
	a.saveConfig()
	Logger.WithFields(logrus.Fields{
		"action": "set_project",
		"root":   root,
	}).Info("Project successfully set")

	return a.GetProject()
}

// OpenProjectDialog opens a directory dialog to select a project
func (a *App) OpenProjectDialog() (*ProjectInfo, error) {
	return a.SetProject("")
}

// File System Operations

// ListFiles lists files in a directory
func (a *App) ListFiles(path string) ([]FileEntry, error) {
	Logger.WithFields(logrus.Fields{
		"action": "list_files",
		"path":   path,
	}).Debug("ListFiles called")

	root := a.getRoot()
	if root == "" {
		Logger.Warn("Project root not set")
		return nil, fmt.Errorf("project root not set")
	}

	abs, err := a.safePath(path)
	if err != nil {
		Logger.WithError(err).WithFields(logrus.Fields{
			"action": "list_files",
			"path":   path,
		}).Error("SafePath failed")
		return nil, err
	}

	entries, err := os.ReadDir(abs)
	if err != nil {
		Logger.WithError(err).WithFields(logrus.Fields{
			"action": "list_files",
			"path":   abs,
		}).Error("Failed to read directory")
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

// FileContent represents the content of a file
type FileContent struct {
	Content  string `json:"content"`
	IsBinary bool   `json:"isBinary"`
}

// ReadFile reads a file's contents
func (a *App) ReadFile(path string) (*FileContent, error) {
	Logger.WithFields(logrus.Fields{
		"action": "read_file",
		"path":   path,
	}).Debug("ReadFile called")

	abs, err := a.safePath(path)
	if err != nil {
		Logger.WithError(err).WithFields(logrus.Fields{
			"action": "read_file",
			"path":   path,
		}).Error("SafePath failed")
		return nil, err
	}

	data, err := os.ReadFile(abs)
	if err != nil {
		Logger.WithError(err).WithFields(logrus.Fields{
			"action": "read_file",
			"path":   abs,
		}).Error("Failed to read file")
		return nil, err
	}

	Logger.WithFields(logrus.Fields{
		"action": "read_file",
		"path":   path,
		"bytes":  len(data),
	}).Debug("Successfully read file")

	// Check if binary (contains null bytes or invalid UTF-8)
	isBinary := false
	for _, b := range data {
		if b == 0 {
			isBinary = true
			break
		}
	}
	if !isBinary {
		// Try to decode as UTF-8
		if !utf8.Valid(data) {
			isBinary = true
		}
	}

	if isBinary {
		Logger.WithFields(logrus.Fields{
			"action": "read_file",
			"path":   path,
		}).Debug("File detected as binary")
	}

	return &FileContent{
		Content:  string(data),
		IsBinary: isBinary,
	}, nil
}

// WriteFile writes content to a file
func (a *App) WriteFile(path string, content string) error {
	Logger.WithFields(logrus.Fields{
		"action": "write_file",
		"path":   path,
		"bytes":  len(content),
	}).Debug("WriteFile called")

	abs, err := a.safePath(path)
	if err != nil {
		Logger.WithError(err).WithFields(logrus.Fields{
			"action": "write_file",
			"path":   path,
		}).Error("SafePath failed")
		return err
	}

	// Ensure parent directory exists
	if err := os.MkdirAll(filepath.Dir(abs), 0755); err != nil {
		Logger.WithError(err).WithFields(logrus.Fields{
			"action": "write_file",
			"path":   abs,
		}).Error("Failed to create directory")
		return err
	}

	err = os.WriteFile(abs, []byte(content), 0644)
	if err != nil {
		Logger.WithError(err).WithFields(logrus.Fields{
			"action": "write_file",
			"path":   abs,
		}).Error("Failed to write file")
		return err
	}

	Logger.WithFields(logrus.Fields{
		"action": "write_file",
		"path":   path,
	}).Debug("Successfully wrote to file")
	return nil
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
	Logger.Infof("TriggerBuild called - mainFile: %s, engine: %s, shellEscape: %v", mainFile, engine, shellEscape)

	root := a.getRoot()
	if root == "" {
		Logger.Error("Cannot trigger build: project root not set")
		return fmt.Errorf("project root not set")
	}

	a.statusMu.Lock()
	a.status = BuildStatus{
		ID:        fmt.Sprintf("build-%d", time.Now().Unix()),
		State:     "running",
		Message:   "Starting build...",
		StartedAt: time.Now().Format(time.RFC3339),
	}
	buildID := a.status.ID
	a.statusMu.Unlock()

	Logger.WithFields(logrus.Fields{
		"action":       "trigger_build",
		"build_id":     buildID,
		"main_file":    mainFile,
		"engine":       engine,
		"shell_escape": shellEscape,
	}).Info("Build started")
	a.emitBuildStatus(a.status)

	// Run build in background
	a.buildWg.Add(1)
	go func() {
		defer a.buildWg.Done()
		a.runBuild(mainFile, engine, shellEscape)
	}()

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
			Logger.WithFields(logrus.Fields{
				"action":    "run_build",
				"main_file": mainFile,
				"engine":    engine,
			}).Errorf("Build panicked: %v", r)
			a.emitBuildStatus(a.status)
		}
	}()

	root := a.getRoot()
	compilerURL := a.getCompilerURL()
	compilerToken := a.getCompilerToken()

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

	// Upload to compiler
	remoteID, err := a.uploadBuild(zipPath, mainFile, engine, shellEscape, compilerURL, compilerToken)
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
	a.pollBuildStatus(remoteID, mainFile, engine, shellEscape, compilerURL, compilerToken)
}

// uploadBuild uploads the project zip to the compiler
func (a *App) uploadBuild(zipPath, mainFile, engine string, shellEscape bool, compilerURL, compilerToken string) (string, error) {
	Logger.Infof("Uploading build to %s - mainFile: %s, engine: %s", compilerURL, mainFile, engine)

	file, err := os.Open(zipPath)
	if err != nil {
		Logger.Errorf("Failed to open zip file %s: %v", zipPath, err)
		return "", err
	}
	defer file.Close()

	fileInfo, _ := file.Stat()
	Logger.Debugf("Uploading zip file (size: %d bytes)", fileInfo.Size())

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add options field with build configuration
	opts := BuildOptions{
		MainFile:    mainFile,
		Engine:      engine,
		ShellEscape: shellEscape,
	}
	optsJSON, _ := json.Marshal(opts)
	_ = writer.WriteField("options", string(optsJSON))
	Logger.Debugf("Added build options: %s", string(optsJSON))

	// Add file field with the zip
	part, err := writer.CreateFormFile("file", "source.zip")
	if err != nil {
		Logger.Errorf("Failed to create form file: %v", err)
		return "", err
	}

	if _, err := io.Copy(part, file); err != nil {
		Logger.Errorf("Failed to copy file to form: %v", err)
		return "", err
	}
	writer.Close()

	req, err := http.NewRequest("POST", compilerURL+"/build", body)
	if err != nil {
		Logger.Errorf("Failed to create HTTP request: %v", err)
		return "", err
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	if compilerToken != "" {
		req.Header.Set("X-Compiler-Token", compilerToken)
	}

	Logger.Debugf("Sending HTTP POST request to %s/build", compilerURL)
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		Logger.Errorf("HTTP request failed: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("compiler error: %s", string(respBody))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.ID, nil
}

// pollBuildStatus polls the compiler for build status
func (a *App) pollBuildStatus(remoteID, mainFile, engine string, shellEscape bool, compilerURL, compilerToken string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	buildStart := time.Now()
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			a.statusMu.Lock()
			a.status.State = "error"
			a.status.Message = "Build timeout"
			a.status.EndedAt = time.Now().Format(time.RFC3339)
			a.statusMu.Unlock()
			// Record timeout as failed attempt
			if a.metrics != nil {
				a.metrics.RecordAttempt(false, time.Since(buildStart))
			}
			a.emitBuildStatus(a.status)
			return
		case <-ticker.C:
			status, err := a.checkRemoteBuild(remoteID, compilerURL, compilerToken)
			if err != nil {
				a.statusMu.Lock()
				a.status.State = "error"
				a.status.Message = err.Error()
				a.status.EndedAt = time.Now().Format(time.RFC3339)
				statusCopy := a.status
				a.statusMu.Unlock()
				// Record error as failed attempt
				if a.metrics != nil {
					a.metrics.RecordAttempt(false, time.Since(buildStart))
				}
				a.emitBuildStatus(statusCopy)
				return
			}

			a.statusMu.Lock()
			a.status.State = status
			a.status.Message = fmt.Sprintf("Build %s", status)
			statusCopy := a.status
			a.statusMu.Unlock()
			a.emitBuildStatus(statusCopy)

			if status == "success" {
				// Download PDF
				if err := a.downloadPDF(remoteID, compilerURL, compilerToken); err != nil {
					a.statusMu.Lock()
					a.status.State = "error"
					a.status.Message = err.Error()
					a.status.EndedAt = time.Now().Format(time.RFC3339)
					a.statusMu.Unlock()
					// Record download error as failed attempt
					if a.metrics != nil {
						a.metrics.RecordAttempt(false, time.Since(buildStart))
					}
					a.emitBuildStatus(a.status)
					return
				}
				a.statusMu.Lock()
				a.status.State = "success"
				a.status.EndedAt = time.Now().Format(time.RFC3339)
				a.statusMu.Unlock()
				// Record successful build
				if a.metrics != nil {
					a.metrics.RecordAttempt(true, time.Since(buildStart))
				}
				a.emitBuildStatus(a.status)
				return
			}

			if status == "error" {
				a.statusMu.Lock()
				a.status.EndedAt = time.Now().Format(time.RFC3339)
				a.statusMu.Unlock()
				// Record failed build
				if a.metrics != nil {
					a.metrics.RecordAttempt(false, time.Since(buildStart))
				}
				a.emitBuildStatus(a.status)
				return
			}
		}
	}
}

// checkRemoteBuild checks the status of a remote build
func (a *App) checkRemoteBuild(remoteID, compilerURL, compilerToken string) (string, error) {
	Logger.Debugf("Checking remote build status for: %s", remoteID)

	url := compilerURL + "/build/" + remoteID + "/status"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		Logger.Errorf("Failed to create HTTP request: %v", err)
		return "", err
	}

	if compilerToken != "" {
		req.Header.Set("X-Compiler-Token", compilerToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		Logger.Errorf("Build status check failed: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		Logger.Errorf("Failed to read response body: %v", err)
		return "", err
	}

	var result struct {
		Status  string `json:"status"`
		Message string `json:"message"`
		Error   string `json:"error"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		Logger.Errorf("Failed to unmarshal build status response: %v", err)
		return "", err
	}

	Logger.Debugf("Build status for %s: %s", remoteID, result.Status)
	return result.Status, nil
}

// downloadPDF downloads the built PDF
func (a *App) downloadPDF(remoteID, compilerURL, compilerToken string) error {
	Logger.Infof("Downloading PDF for build: %s", remoteID)

	url := compilerURL + "/build/" + remoteID + "/artifacts/pdf"

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		Logger.Errorf("Failed to create PDF download request: %v", err)
		return err
	}

	if compilerToken != "" {
		req.Header.Set("X-Compiler-Token", compilerToken)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		Logger.Errorf("PDF download request failed: %v", err)
		return fmt.Errorf("PDF download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		Logger.Errorf("PDF download returned status %d: %s", resp.StatusCode, string(body))
		return fmt.Errorf("PDF download failed with status %s: %s", resp.Status, string(body))
	}

	pdfPath := filepath.Join(a.cacheDir, "last.pdf")

	file, err := os.Create(pdfPath)
	if err != nil {
		Logger.Errorf("Failed to create PDF file: %v", err)
		return err
	}
	defer file.Close()

	n, err := io.Copy(file, resp.Body)
	if err != nil {
		Logger.Errorf("Failed to save PDF: %v", err)
		return fmt.Errorf("failed to save PDF: %w", err)
	}

	if n == 0 {
		Logger.Error("Downloaded PDF file is empty")
		return fmt.Errorf("PDF file is empty")
	}

	Logger.Debugf("PDF downloaded successfully (%d bytes)", n)

	// Check if it's a valid PDF (starts with %PDF)
	f, err := os.Open(pdfPath)
	if err != nil {
		Logger.Errorf("Failed to open PDF for validation: %v", err)
		return err
	}
	defer f.Close()

	header := make([]byte, 4)
	if _, err := f.Read(header); err != nil {
		Logger.Errorf("Failed to read PDF header: %v", err)
		return err
	}

	if string(header) != "%PDF" {
		Logger.Errorf("Invalid PDF file: header is %s, expected %%PDF", string(header))
		return fmt.Errorf("invalid PDF file: header is %s, expected %%PDF", string(header))
	}

	Logger.Infof("PDF validated successfully: %s", pdfPath)
	return nil
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
		if os.IsNotExist(err) {
			return "No build log available. The build may not have started yet.", nil
		}
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

// GetPDFContent returns the PDF content as base64-encoded string for desktop viewing
// We use base64 instead of raw bytes because Wails' type conversion doesn't handle binary data well
func (a *App) GetPDFContent() (string, error) {
	pdfPath := filepath.Join(a.cacheDir, "last.pdf")

	if _, err := os.Stat(pdfPath); err != nil {
		return "", fmt.Errorf("no PDF available")
	}

	content, err := os.ReadFile(pdfPath)
	if err != nil {
		return "", err
	}

	// Convert to base64 for safe transmission to JavaScript
	encoded := base64.StdEncoding.EncodeToString(content)
	return encoded, nil
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

// sanitizeGitInput sanitizes user input for git commands to prevent command injection
func sanitizeGitInput(input string) string {
	// Remove any shell metacharacters and path traversal attempts
	sanitized := strings.ReplaceAll(input, ";", "")
	sanitized = strings.ReplaceAll(sanitized, "|", "")
	sanitized = strings.ReplaceAll(sanitized, "&", "")
	sanitized = strings.ReplaceAll(sanitized, "$", "")
	sanitized = strings.ReplaceAll(sanitized, "`", "")
	sanitized = strings.ReplaceAll(sanitized, "'", "\"")
	sanitized = strings.ReplaceAll(sanitized, "\\", "")
	sanitized = strings.ReplaceAll(sanitized, "\n", "")
	sanitized = strings.ReplaceAll(sanitized, "\r", "")
	sanitized = strings.ReplaceAll(sanitized, "..", "")
	sanitized = strings.TrimSpace(sanitized)
	return sanitized
}

// sanitizeGitInputs sanitizes a slice of git inputs
func sanitizeGitInputs(inputs []string) []string {
	sanitized := make([]string, len(inputs))
	for i, input := range inputs {
		sanitized[i] = sanitizeGitInput(input)
	}
	return sanitized
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
	Logger.WithFields(logrus.Fields{
		"action":  "git_commit",
		"message": message,
		"all":     all,
		"files":   len(files),
	}).Info("GitCommit called")

	root := a.getRoot()
	if root == "" {
		Logger.Error("Cannot commit: project root not set")
		return fmt.Errorf("project root not set")
	}

	if all {
		Logger.Debug("Adding all files with 'git add -A'")
		if _, err := runGit(root, "add", "-A"); err != nil {
			Logger.Errorf("Failed to stage files: %v", err)
			return err
		}
	}

	if len(files) > 0 {
		sanitizedFiles := sanitizeGitInputs(files)
		args := append([]string{"add"}, sanitizedFiles...)
		if _, err := runGit(root, args...); err != nil {
			return err
		}
	}

	_, err := runGit(root, "commit", "-m", sanitizeGitInput(message))
	return err
}

// GitPush pushes commits
func (a *App) GitPush(remote string) error {
	root := a.getRoot()
	if root == "" {
		Logger.Error("Cannot push: project root not set")
		return fmt.Errorf("project root not set")
	}

	args := []string{"push"}
	if remote != "" {
		args = append(args, sanitizeGitInput(remote))
	}

	Logger.WithField("remote", remote).Info("Pushing to git remote")
	out, err := runGit(root, args...)
	if err != nil {
		Logger.WithError(err).WithField("output", out).Error("Git push failed")
		return err
	}

	Logger.Info("Git push completed successfully")
	return nil
}

// GitPull pulls changes
func (a *App) GitPull(remote string) error {
	root := a.getRoot()
	if root == "" {
		Logger.Error("Cannot pull: project root not set")
		return fmt.Errorf("project root not set")
	}

	args := []string{"pull"}
	if remote != "" {
		args = append(args, sanitizeGitInput(remote))
	}

	Logger.WithField("remote", remote).Info("Pulling from git remote")
	out, err := runGit(root, args...)
	if err != nil {
		Logger.WithError(err).WithField("output", out).Error("Git pull failed")
		return err
	}

	Logger.Info("Git pull completed successfully")
	return nil
}

// SyncTeX Operations

// SyncTeXView navigates from source to PDF
func (a *App) SyncTeXView(file string, line, col int) (*SyncTeXResult, error) {
	remoteID := a.getRemoteID()
	if remoteID == "" {
		Logger.Warn("SyncTeX view: no build available")
		return nil, fmt.Errorf("no build available")
	}

	Logger.WithFields(logrus.Fields{
		"file": file,
		"line": line,
		"col":  col,
	}).Debug("SyncTeX forward search request")

	compilerURL := a.getCompilerURL()
	url := fmt.Sprintf("%s/build/%s/synctex/view?file=%s&line=%d",
		compilerURL, remoteID, url.QueryEscape(file), line)
	if col > 0 {
		url += fmt.Sprintf("&col=%d", col)
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		Logger.WithError(err).Error("Failed to create SyncTeX view request")
		return nil, err
	}

	compilerToken := a.getCompilerToken()
	if compilerToken != "" {
		req.Header.Set("X-Compiler-Token", compilerToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		Logger.WithError(err).Error("SyncTeX view request failed")
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		Logger.WithField("status", resp.Status).Error("SyncTeX view failed")
		return nil, fmt.Errorf("synctex failed: %s", resp.Status)
	}

	var result SyncTeXResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		Logger.WithError(err).Error("Failed to decode SyncTeX view response")
		return nil, err
	}

	Logger.WithFields(logrus.Fields{
		"page": result.Page,
		"x":    result.X,
		"y":    result.Y,
	}).Debug("SyncTeX view completed")

	return &result, nil
}

// SyncTeXEdit navigates from PDF to source
func (a *App) SyncTeXEdit(page int, x, y float64) (*SyncTeXResult, error) {
	remoteID := a.getRemoteID()
	if remoteID == "" {
		Logger.Warn("SyncTeX edit: no build available")
		return nil, fmt.Errorf("no build available")
	}

	Logger.WithFields(logrus.Fields{
		"page": page,
		"x":    x,
		"y":    y,
	}).Debug("SyncTeX reverse search request")

	compilerURL := a.getCompilerURL()
	url := fmt.Sprintf("%s/build/%s/synctex/edit?page=%d&x=%f&y=%f",
		compilerURL, remoteID, page, x, y)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		Logger.WithError(err).Error("Failed to create SyncTeX edit request")
		return nil, err
	}

	compilerToken := a.getCompilerToken()
	if compilerToken != "" {
		req.Header.Set("X-Compiler-Token", compilerToken)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		Logger.WithError(err).Error("SyncTeX edit request failed")
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		Logger.WithField("status", resp.Status).Error("SyncTeX edit failed")
		return nil, fmt.Errorf("synctex failed: %s", resp.Status)
	}

	var result SyncTeXResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		Logger.WithError(err).Error("Failed to decode SyncTeX edit response")
		return nil, err
	}

	Logger.WithFields(logrus.Fields{
		"page": result.Page,
		"x":    result.X,
		"y":    result.Y,
	}).Debug("SyncTeX edit completed")

	return &result, nil
}

// Renderer lifecycle management endpoints

// StartRenderer starts the Docker container
func (a *App) StartRenderer() error {
	if a.dockerMgr == nil {
		return fmt.Errorf("renderer not initialized")
	}
	ctx := context.Background()
	return a.dockerMgr.Start(ctx)
}

// StopRenderer stops the Docker container
func (a *App) StopRenderer() error {
	if a.dockerMgr == nil {
		return fmt.Errorf("renderer not initialized")
	}
	ctx := context.Background()
	return a.dockerMgr.Stop(ctx)
}

// RestartRenderer restarts the Docker container
func (a *App) RestartRenderer() error {
	if a.dockerMgr == nil {
		return fmt.Errorf("renderer not initialized")
	}
	ctx := context.Background()

	// Stop first
	if err := a.dockerMgr.Stop(ctx); err != nil {
		Logger.Warnf("Error stopping during restart: %v", err)
	}

	// Wait briefly
	time.Sleep(2 * time.Second)

	// Start again
	return a.dockerMgr.Start(ctx)
}

// GetRendererStatus returns the current status of the renderer
func (a *App) GetRendererStatus() RendererStatus {
	if a.dockerMgr == nil {
		return RendererStatus{
			State:   "not-installed",
			Message: "Renderer not initialized",
		}
	}
	return a.dockerMgr.GetStatus()
}

// SetRendererPort updates the port for the renderer
func (a *App) SetRendererPort(port int) error {
	if err := ValidatePort(port); err != nil {
		return err
	}
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		a.config.Renderer = DefaultRendererConfig()
	}

	a.config.Renderer.Port = port
	return a.saveConfig()
}

// SetRendererAutoStart updates the auto-start setting
func (a *App) SetRendererAutoStart(enabled bool) error {
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		a.config.Renderer = DefaultRendererConfig()
	}

	a.config.Renderer.AutoStart = enabled
	return a.saveConfig()
}

// GetRendererLogs returns the current renderer logs
func (a *App) GetRendererLogs() string {
	if a.dockerMgr == nil {
		return ""
	}
	status := a.dockerMgr.GetStatus()
	return status.Logs
}

// GetRendererConfig returns the current renderer configuration
func (a *App) GetRendererConfig() *RendererConfig {
	a.configMu.Lock()
	defer a.configMu.Unlock()
	if a.config.Renderer == nil {
		return DefaultRendererConfig()
	}
	return a.config.Renderer
}

// SetRendererMode sets the rendering mode
func (a *App) SetRendererMode(mode string) error {
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		a.config.Renderer = DefaultRendererConfig()
	}

	a.config.Renderer.Mode = RendererMode(mode)
	return a.saveConfig()
}

// SetImageSource sets the image source
func (a *App) SetImageSource(source string, ref string) error {
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		a.config.Renderer = DefaultRendererConfig()
	}

	a.config.Renderer.ImageSource = ImageSource(source)
	if ref != "" {
		a.config.Renderer.ImageRef = ref
	}
	return a.saveConfig()
}

// SetRendererRemoteURL sets the remote compiler URL
func (a *App) SetRendererRemoteURL(url string) error {
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		a.config.Renderer = DefaultRendererConfig()
	}

	a.config.Renderer.RemoteURL = url
	return a.saveConfig()
}

// SetRendererRemoteToken sets the remote compiler API token
func (a *App) SetRendererRemoteToken(token string) error {
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		a.config.Renderer = DefaultRendererConfig()
	}

	a.config.Renderer.RemoteToken = token
	return a.saveConfig()
}

// VerifyCustomImage verifies a custom image works
func (a *App) VerifyCustomImage(path string) bool {
	a.configMu.Lock()
	a.config.Renderer.CustomTarPath = path
	a.config.Renderer.ImageSource = SourceCustom
	a.configMu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	im := NewImageManager(a.config.Renderer, Logger)
	err := im.EnsureImage(ctx)
	return err == nil
}

// DetectBestMode detects the best rendering mode
func (a *App) DetectBestMode() string {
	if a.dockerMgr == nil {
		return string(ModeRemote)
	}
	ctx := context.Background()
	mode := a.dockerMgr.DetectBestMode(ctx)
	return string(mode)
}

// GetCompilationMetrics returns compilation statistics
func (a *App) GetCompilationMetrics() CompilationMetrics {
	if a.metrics == nil {
		return CompilationMetrics{}
	}
	return a.metrics.GetMetrics()
}

// ResetCompilationMetrics clears all compilation metrics
func (a *App) ResetCompilationMetrics() error {
	if a.metrics == nil {
		return fmt.Errorf("metrics not initialized")
	}
	a.metrics.Reset()
	Logger.Info("Compilation metrics reset by user")
	return nil
}

// GetRemoteCompilerHealth returns the current remote compiler health status
func (a *App) GetRemoteCompilerHealth() RemoteCompilerHealth {
	if a.remoteMonitor == nil {
		return RemoteCompilerHealth{
			URL:       a.compilerURL,
			IsHealthy: false,
			LastError: "Remote compiler monitor not initialized",
		}
	}
	return a.remoteMonitor.GetHealth()
}

// IsRemoteCompilerHealthy returns whether the remote compiler is healthy
func (a *App) IsRemoteCompilerHealthy() bool {
	if a.remoteMonitor == nil {
		return false
	}
	return a.remoteMonitor.IsHealthy()
}
