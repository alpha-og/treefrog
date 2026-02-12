package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// Config holds application configuration
type Config struct {
	ProjectRoot   string          `json:"projectRoot"`
	CompilerURL   string          `json:"compilerUrl"`
	CompilerToken string          `json:"compilerToken"`
	Renderer      *RendererConfig `json:"renderer,omitempty"`
}

// BuildStatus represents the current state of a build
type BuildStatus struct {
	ID        string `json:"id"`
	State     string `json:"state"` // idle|running|success|error
	Message   string `json:"message"`
	StartedAt string `json:"startedAt"`
	EndedAt   string `json:"endedAt"`
}

// BuildOptions contains options for a LaTeX build
type BuildOptions struct {
	MainFile    string `json:"mainFile"`
	Engine      string `json:"engine"`
	ShellEscape bool   `json:"shellEscape"`
}

// FileEntry represents a file or directory
type FileEntry struct {
	Name    string      `json:"name"`
	Path    string      `json:"path"`
	IsDir   bool        `json:"isDir"`
	Size    int64       `json:"size"`
	ModTime string      `json:"modTime"`
	Entries []FileEntry `json:"entries,omitempty"`
}

// ProjectInfo holds information about the current project
type ProjectInfo struct {
	Name        string `json:"name"`
	Root        string `json:"root"`
	CompilerURL string `json:"compilerUrl"`
}

// GitStatus represents the git status output
type GitStatus struct {
	Raw string `json:"raw"`
}

// SyncTeXResult holds SyncTeX navigation results
type SyncTeXResult struct {
	Page int     `json:"page"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
}

// App struct
type App struct {
	ctx           context.Context
	config        Config
	configPath    string
	configMu      sync.Mutex
	rootMu        sync.Mutex
	projectRoot   string
	cacheDir      string
	statusMu      sync.Mutex
	status        BuildStatus
	remoteMu      sync.Mutex
	remoteID      string
	compilerURL   string
	compilerToken string
	dockerMgr     *DockerManager
	buildWg       sync.WaitGroup
	metrics       *MetricsCollector
	remoteMonitor *RemoteCompilerMonitor
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		status: BuildStatus{State: "idle"},
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.loadConfig()
	if a.config.ProjectRoot != "" {
		a.setRoot(a.config.ProjectRoot)
	}
	a.compilerURL = a.config.CompilerURL
	a.compilerToken = a.config.CompilerToken

	// Initialize metrics collector
	a.metrics = NewMetricsCollector(Logger)

	// Initialize remote compiler monitor if URL is configured
	if a.config.CompilerURL != "" {
		a.remoteMonitor = NewRemoteCompilerMonitor(a.config.CompilerURL, Logger)
		a.remoteMonitor.Start()
	}

	// Initialize Docker manager for renderer
	if a.config.Renderer == nil {
		a.config.Renderer = DefaultRendererConfig()
		a.saveConfig()
	}

	a.dockerMgr = NewDockerManager(a.config.Renderer, Logger)

	// Auto-detect mode if set to Auto
	if a.config.Renderer.Mode == ModeAuto {
		detectedMode := a.dockerMgr.DetectBestMode(ctx)
		Logger.WithFields(logrus.Fields{
			"action":        "auto_detect_mode",
			"detected_mode": detectedMode,
		}).Info("Auto-detected rendering mode")
	}

	// Auto-start renderer if configured
	if a.config.Renderer.AutoStart && a.config.Renderer.Mode == ModeLocal {
		a.buildWg.Add(1)
		go func() {
			defer a.buildWg.Done()
			// Create a separate context with timeout for auto-start to prevent blocking app shutdown
			autoStartCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

			// Wait for app to fully initialize
			select {
			case <-time.After(2 * time.Second):
				if err := a.dockerMgr.Start(autoStartCtx); err != nil {
					Logger.WithError(err).Error("Failed to auto-start renderer")
				}
			case <-ctx.Done():
				Logger.Info("App shutdown initiated, cancelling auto-start")
			}
		}()
	}
}

// shutdown is called when the app closes
func (a *App) shutdown(ctx context.Context) {
	// Wait for builds to complete gracefully
	done := make(chan struct{})
	go func() {
		a.buildWg.Wait()
		close(done)
	}()

	// Allow up to 30 seconds for builds to complete
	select {
	case <-done:
		Logger.Info("All builds completed gracefully")
	case <-time.After(30 * time.Second):
		Logger.Warn("Build shutdown timeout - forcing exit")
	}

	if a.dockerMgr != nil {
		Logger.Info("Shutting down renderer on app close")
		if err := a.dockerMgr.Stop(ctx); err != nil {
			Logger.WithError(err).Error("Failed to stop renderer on shutdown")
		}
	}

	// Stop remote compiler monitor if running
	if a.remoteMonitor != nil {
		a.remoteMonitor.Stop()
	}
}

// getConfigPath returns the path to the config file
func (a *App) getConfigPath() string {
	if a.configPath != "" {
		return a.configPath
	}
	configDir, _ := os.UserConfigDir()
	a.configPath = filepath.Join(configDir, "treefrog", "config.json")
	return a.configPath
}

// loadConfig loads configuration from disk
func (a *App) loadConfig() {
	configPath := a.getConfigPath()
	data, err := os.ReadFile(configPath)
	if err != nil {
		return
	}
	json.Unmarshal(data, &a.config)
}

// saveConfig saves configuration to disk
func (a *App) saveConfig() error {
	configPath := a.getConfigPath()
	os.MkdirAll(filepath.Dir(configPath), 0755)
	data, err := json.MarshalIndent(a.config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, 0644)
}

// GetConfig returns the current configuration
func (a *App) GetConfig() Config {
	return Config{
		ProjectRoot:   a.getRoot(),
		CompilerURL:   a.getCompilerURL(),
		CompilerToken: a.getCompilerToken(),
	}
}

// SetCompilerConfig updates the compiler configuration
func (a *App) SetCompilerConfig(url, token string) {
	Logger.WithFields(logrus.Fields{
		"url":      url,
		"hasToken": token != "",
	}).Info("Setting compiler configuration")

	a.configMu.Lock()
	defer a.configMu.Unlock()
	a.compilerURL = url
	a.compilerToken = token
	a.config.CompilerURL = url
	a.config.CompilerToken = token

	if err := a.saveConfig(); err != nil {
		Logger.WithError(err).Error("Failed to save compiler configuration")
	} else {
		Logger.Info("Compiler configuration saved successfully")
	}
}

// getRoot returns the current project root safely
func (a *App) getRoot() string {
	a.rootMu.Lock()
	defer a.rootMu.Unlock()
	return a.projectRoot
}

// setRoot sets the project root and creates cache directory
func (a *App) setRoot(root string) error {
	a.rootMu.Lock()
	defer a.rootMu.Unlock()
	a.projectRoot = root
	a.cacheDir = filepath.Join(root, ".treefrog-cache")
	os.MkdirAll(a.cacheDir, 0755)
	return nil
}

// getCompilerURL returns the current compiler URL based on renderer mode
func (a *App) getCompilerURL() string {
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		if a.compilerURL != "" {
			return a.compilerURL
		}
		return "https://compiler.example.com"
	}

	// Determine effective mode
	effectiveMode := a.config.Renderer.Mode

	// For auto mode, use remote URL if configured
	// (auto mode prefers remote when available)
	if effectiveMode == ModeAuto && a.config.Renderer.RemoteURL != "" {
		Logger.WithFields(logrus.Fields{
			"mode":      "auto",
			"remoteUrl": a.config.Renderer.RemoteURL,
		}).Debug("Auto mode: using remote URL")
		return a.config.Renderer.RemoteURL
	}

	// If explicitly using remote mode and remote URL is configured, use it
	if effectiveMode == ModeRemote && a.config.Renderer.RemoteURL != "" {
		return a.config.Renderer.RemoteURL
	}

	// Fall back to local/legacy compiler URL
	if a.compilerURL != "" {
		return a.compilerURL
	}
	return "https://compiler.example.com"
}

// getCompilerToken returns the current compiler token based on renderer mode
func (a *App) getCompilerToken() string {
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		return a.compilerToken
	}

	// Determine effective mode
	effectiveMode := a.config.Renderer.Mode

	// For auto mode, use remote token if remote URL is configured
	// (auto mode prefers remote when available)
	if effectiveMode == ModeAuto && a.config.Renderer.RemoteURL != "" {
		Logger.WithFields(logrus.Fields{
			"mode":      "auto",
			"remoteUrl": a.config.Renderer.RemoteURL,
			"hasToken":  a.config.Renderer.RemoteToken != "",
		}).Debug("Auto mode: using remote token")
		return a.config.Renderer.RemoteToken
	}

	// If explicitly using remote mode, return remote token
	if effectiveMode == ModeRemote {
		return a.config.Renderer.RemoteToken
	}

	// Fall back to legacy compiler token (local mode)
	return a.compilerToken
}

// getRemoteID returns the current remote build ID
func (a *App) getRemoteID() string {
	a.remoteMu.Lock()
	defer a.remoteMu.Unlock()
	return a.remoteID
}

// setRemoteID sets the current remote build ID
func (a *App) setRemoteID(id string) {
	a.remoteMu.Lock()
	defer a.remoteMu.Unlock()
	a.remoteID = id
}

// safePath ensures a path is within the project root
func (a *App) safePath(rel string) (string, error) {
	root := a.getRoot()
	if root == "" {
		return "", fmt.Errorf("project root not set")
	}
	abs := filepath.Join(root, rel)
	abs, err := filepath.Abs(abs)
	if err != nil {
		return "", fmt.Errorf("failed to resolve absolute path: %w", err)
	}
	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return "", fmt.Errorf("failed to resolve root path: %w", err)
	}
	if !strings.HasPrefix(abs, rootAbs) {
		return "", fmt.Errorf("path outside project root")
	}
	return abs, nil
}

// emitBuildStatus emits a build status event to the frontend
func (a *App) emitBuildStatus(status BuildStatus) {
	runtime.EventsEmit(a.ctx, "build-status", status)
}

// Helper functions
func copyFile(src, dst string) error {
	sf, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sf.Close()
	df, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer df.Close()
	_, err = io.Copy(df, sf)
	return err
}

func copyDir(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(src, path)
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0755)
		}
		return copyFile(path, target)
	})
}
