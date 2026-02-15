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
	ProjectRoot       string          `json:"projectRoot"`
	RemoteCompilerURL string          `json:"remoteCompilerUrl"`
	Renderer          *RendererConfig `json:"renderer,omitempty"`
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
	Page int     `json:"page,omitempty"`
	X    float64 `json:"x,omitempty"`
	Y    float64 `json:"y,omitempty"`
	File string  `json:"file,omitempty"`
	Line int     `json:"line,omitempty"`
	Col  int     `json:"col,omitempty"`
}

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
	dockerMgr     *DockerManager
	buildWg       sync.WaitGroup
	metrics       *MetricsCollector
	remoteMonitor *RemoteCompilerMonitor
	authMu        sync.RWMutex
	authConfig    *authConfig
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

	// Initialize auth
	a.initAuth()

	if a.config.ProjectRoot != "" {
		a.setRoot(a.config.ProjectRoot)
	}

	if a.config.Renderer == nil {
		a.config.Renderer = DefaultRendererConfig()
		a.saveConfig()
	}

	a.dockerMgr = NewDockerManager(a.config.Renderer, Logger)

	if a.config.Renderer.Mode == ModeAuto {
		detectedMode := a.dockerMgr.DetectBestMode(ctx)
		Logger.WithFields(logrus.Fields{
			"action":        "auto_detect_mode",
			"detected_mode": detectedMode,
		}).Info("Auto-detected rendering mode")
	}

	if a.config.Renderer.AutoStart && a.config.Renderer.Mode == ModeLocal {
		a.buildWg.Add(1)
		go func() {
			defer a.buildWg.Done()
			autoStartCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()

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

	if a.config.RemoteCompilerURL != "" {
		a.remoteMonitor = NewRemoteCompilerMonitor(a.config.RemoteCompilerURL, Logger)
		a.remoteMonitor.Start()
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
	if err := json.Unmarshal(data, &a.config); err != nil {
		Logger.WithError(err).Warn("Failed to parse config file, using defaults")
	}
}

// saveConfig saves configuration to disk
func (a *App) saveConfig() error {
	configPath := a.getConfigPath()
	os.MkdirAll(filepath.Dir(configPath), 0755)
	data, err := json.MarshalIndent(a.config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(configPath, data, 0600)
}

func (a *App) GetConfig() Config {
	return Config{
		ProjectRoot:       a.getRoot(),
		RemoteCompilerURL: a.getRemoteCompilerURL(),
		Renderer:          a.config.Renderer,
	}
}

func (a *App) SetRemoteCompilerURL(url string) {
	Logger.WithFields(logrus.Fields{
		"url": url,
	}).Info("Setting remote compiler URL")

	a.configMu.Lock()
	oldURL := a.config.RemoteCompilerURL
	a.config.RemoteCompilerURL = url
	a.configMu.Unlock()

	if err := a.saveConfig(); err != nil {
		Logger.WithError(err).Error("Failed to save remote compiler configuration")
	} else {
		Logger.Info("Remote compiler URL saved successfully")
	}

	if oldURL != url {
		if a.remoteMonitor != nil {
			a.remoteMonitor.Stop()
			a.remoteMonitor = nil
		}
		if url != "" {
			a.remoteMonitor = NewRemoteCompilerMonitor(url, Logger)
			a.remoteMonitor.Start()
			Logger.WithField("url", url).Info("Started remote compiler monitor")
		}
	}
}

func (a *App) getRoot() string {
	a.rootMu.Lock()
	defer a.rootMu.Unlock()
	return a.projectRoot
}

func (a *App) setRoot(root string) error {
	a.rootMu.Lock()
	defer a.rootMu.Unlock()
	a.projectRoot = root
	a.cacheDir = filepath.Join(root, ".treefrog-cache")
	os.MkdirAll(a.cacheDir, 0755)
	return nil
}

func (a *App) getRemoteCompilerURL() string {
	a.configMu.Lock()
	defer a.configMu.Unlock()
	return a.config.RemoteCompilerURL
}

func (a *App) getCompilerURL() string {
	a.configMu.Lock()
	defer a.configMu.Unlock()

	if a.config.Renderer == nil {
		if a.config.RemoteCompilerURL != "" {
			return a.config.RemoteCompilerURL
		}
		return "http://127.0.0.1:8080"
	}

	effectiveMode := a.config.Renderer.Mode

	if effectiveMode == ModeAuto {
		if a.config.RemoteCompilerURL != "" && a.remoteMonitor != nil && a.remoteMonitor.IsHealthy() {
			return a.config.RemoteCompilerURL
		}
		// Check if local renderer is actually running before returning its URL
		if a.dockerMgr != nil {
			status := a.dockerMgr.GetStatus()
			if status.State == "running" {
				return fmt.Sprintf("http://127.0.0.1:%d", a.config.Renderer.Port)
			}
		}
		// Fall back to default port if nothing is running
		return fmt.Sprintf("http://127.0.0.1:%d", a.config.Renderer.Port)
	}

	if effectiveMode == ModeRemote {
		if a.config.RemoteCompilerURL != "" {
			return a.config.RemoteCompilerURL
		}
	}

	// Check if local renderer is actually running
	if a.dockerMgr != nil {
		status := a.dockerMgr.GetStatus()
		if status.State == "running" {
			return fmt.Sprintf("http://127.0.0.1:%d", a.config.Renderer.Port)
		}
	}

	return fmt.Sprintf("http://127.0.0.1:%d", a.config.Renderer.Port)
}

func (a *App) getRemoteID() string {
	a.remoteMu.Lock()
	defer a.remoteMu.Unlock()
	return a.remoteID
}

func (a *App) setRemoteID(id string) {
	a.remoteMu.Lock()
	defer a.remoteMu.Unlock()
	a.remoteID = id
}

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
