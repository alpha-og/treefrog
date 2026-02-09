package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/registry"
	"github.com/docker/docker/client"
	"github.com/sirupsen/logrus"
)

// RendererStatus represents the current state
type RendererStatus struct {
	State   string       `json:"state"` // running|stopped|error|not-installed|building
	Mode    RendererMode `json:"mode"`
	Message string       `json:"message"`
	Port    int          `json:"port"`
	Logs    string       `json:"logs"`
}

// DockerManager handles the Docker renderer lifecycle
type DockerManager struct {
	config    *RendererConfig
	imageMgr  *ImageManager
	logger    *logrus.Logger
	isRunning bool
	logs      strings.Builder
	mu        sync.Mutex
}

// NewDockerManager creates a new DockerManager
func NewDockerManager(config *RendererConfig, logger *logrus.Logger) *DockerManager {
	dm := &DockerManager{
		config: config,
		logger: logger,
	}
	dm.imageMgr = NewImageManager(config, logger)
	return dm
}

// IsDockerInstalled checks if Docker is available
func (dm *DockerManager) IsDockerInstalled() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "docker", "version")
	return cmd.Run() == nil
}

// Start starts the Docker container
func (dm *DockerManager) Start(ctx context.Context) error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	dm.logs.Reset()

	if !dm.IsDockerInstalled() {
		return errors.New("Docker not installed")
	}

	// Ensure image is available
	if err := dm.imageMgr.EnsureImage(ctx); err != nil {
		return fmt.Errorf("failed to prepare image: %w", err)
	}

	// Check port availability
	port := dm.config.Port
	if !IsPortAvailable(port) {
		newPort, err := FindAvailablePort(0)
		if err != nil {
			return fmt.Errorf("port %d unavailable: %w", port, err)
		}
		dm.logger.WithFields(logrus.Fields{
			"requested_port": port,
			"actual_port":    newPort,
		}).Info("Port in use, using alternative port")
		port = newPort
		dm.config.Port = port
	}

	// Stop any existing container
	dm.stopContainer(ctx)

	// Start container
	dm.logger.WithFields(logrus.Fields{
		"port": port,
	}).Info("Starting container")
	cmd := exec.CommandContext(ctx, "docker", "run", "-d", "--rm",
		"-p", fmt.Sprintf("127.0.0.1:%d:9000", port),
		"--name", "treefrog-renderer",
		LocalImageName)

	output, err := cmd.CombinedOutput()
	dm.logs.WriteString(string(output))

	if err != nil {
		return fmt.Errorf("failed to start: %w", err)
	}

	// Health check
	if err := dm.healthCheck(ctx, port); err != nil {
		dm.stopContainer(ctx)
		return fmt.Errorf("health check failed: %w", err)
	}

	dm.isRunning = true
	dm.logger.Info("Container started successfully")
	return nil
}

// Stop stops the Docker container
func (dm *DockerManager) Stop(ctx context.Context) error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	if !dm.isRunning {
		return nil
	}

	dm.logger.Info("Stopping container...")
	if err := dm.stopContainer(ctx); err != nil {
		return err
	}

	dm.isRunning = false
	dm.logger.Info("Container stopped")
	return nil
}

func (dm *DockerManager) stopContainer(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "docker", "stop", "treefrog-renderer")
	output, err := cmd.CombinedOutput()
	dm.logs.WriteString(string(output))
	return err
}

func (dm *DockerManager) healthCheck(ctx context.Context, port int) error {
	url := fmt.Sprintf("http://127.0.0.1:%d/health", port)
	client := &http.Client{Timeout: 1 * time.Second}

	for i := 0; i < 30; i++ {
		resp, err := client.Get(url)
		if err == nil && resp.StatusCode == 200 {
			if resp != nil {
				resp.Body.Close()
			}
			return nil
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(200 * time.Millisecond)
	}

	return errors.New("health check timeout")
}

// GetStatus returns current status
func (dm *DockerManager) GetStatus() RendererStatus {
	dockerInstalled := dm.IsDockerInstalled()

	dm.mu.Lock()
	defer dm.mu.Unlock()

	state := "stopped"
	message := ""

	if !dockerInstalled {
		state = "not-installed"
		message = "Docker not installed"
	} else if dm.isRunning {
		state = "running"
		message = fmt.Sprintf("Running on port %d", dm.config.Port)
	}

	return RendererStatus{
		State:   state,
		Mode:    dm.config.Mode,
		Message: message,
		Port:    dm.config.Port,
		Logs:    dm.logs.String(),
	}
}

// DetectBestMode determines the optimal rendering mode
func (dm *DockerManager) DetectBestMode(ctx context.Context) RendererMode {
	if dm.config.Mode != ModeAuto {
		return dm.config.Mode
	}

	// Try remote first (if configured)
	if dm.config.RemoteURL != "" && dm.pingRemote(ctx) {
		dm.logger.Info("Remote builder available")
		return ModeRemote
	}

	// Fall back to local
	if dm.IsDockerInstalled() {
		dm.logger.Info("Docker available, using local mode")
		return ModeLocal
	}

	dm.logger.Warn("No rendering backend available")
	return ModeRemote // Default even if unreachable
}

func (dm *DockerManager) pingRemote(ctx context.Context) bool {
	remoteURL := dm.config.RemoteURL

	// Validate URL to prevent SSRF attacks
	if !isValidRemoteURL(remoteURL) {
		dm.logger.Warnf("Invalid remote URL blocked: %s", remoteURL)
		return false
	}

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(remoteURL + "/health")
	if err != nil || resp == nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}

// isValidRemoteURL validates that a remote URL is safe to query
func isValidRemoteURL(urlStr string) bool {
	u, err := url.Parse(urlStr)
	if err != nil {
		return false
	}

	// Only allow HTTP and HTTPS
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}

	// Reject localhost and private IP ranges
	host := u.Hostname()
	if host == "localhost" || host == "127.0.0.1" || host == "::1" {
		return false
	}

	// Check for private IP ranges
	if ip := net.ParseIP(host); ip != nil {
		if ip.IsPrivate() || ip.IsLoopback() || ip.IsUnspecified() {
			return false
		}
	}

	return true
}
