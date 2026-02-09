package main

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os/exec"
	"strings"
	"sync"
	"time"

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

	// Handle port with intelligent fallback
	port, err := dm.resolvePort(ctx)
	if err != nil {
		return err
	}

	// Stop any existing container
	dm.stopContainer(ctx)

	// Start container with retry
	if err := dm.startContainerWithRetry(ctx, port); err != nil {
		return err
	}

	// Health check
	if err := dm.healthCheckWithRetry(ctx, port); err != nil {
		dm.stopContainer(ctx)
		return fmt.Errorf("health check failed: %w", err)
	}

	dm.isRunning = true
	dm.logger.Info("Container started successfully")
	return nil
}

// resolvePort finds an available port with intelligent fallback
func (dm *DockerManager) resolvePort(ctx context.Context) (int, error) {
	port := dm.config.Port

	// Try configured port first
	if IsPortAvailable(port) {
		dm.logger.WithFields(logrus.Fields{
			"port": port,
		}).Debug("Configured port is available")
		return port, nil
	}

	dm.logger.WithFields(logrus.Fields{
		"port": port,
	}).Warn("Configured port in use, searching for alternative")

	// Try to find nearby ports first (better UX)
	for offset := 1; offset <= 10; offset++ {
		candidatePort := port + offset
		if candidatePort <= 65535 && IsPortAvailable(candidatePort) {
			dm.logger.WithFields(logrus.Fields{
				"requested_port": port,
				"actual_port":    candidatePort,
			}).Info("Using nearby available port")
			dm.config.Port = candidatePort
			return candidatePort, nil
		}

		candidatePort = port - offset
		if candidatePort >= 1024 && IsPortAvailable(candidatePort) {
			dm.logger.WithFields(logrus.Fields{
				"requested_port": port,
				"actual_port":    candidatePort,
			}).Info("Using nearby available port")
			dm.config.Port = candidatePort
			return candidatePort, nil
		}
	}

	// Fall back to ephemeral range
	newPort, err := FindAvailablePort(0)
	if err != nil {
		return 0, fmt.Errorf("no available ports found (requested: %d): %w", port, err)
	}

	dm.logger.WithFields(logrus.Fields{
		"requested_port": port,
		"actual_port":    newPort,
	}).Warn("Using ephemeral port due to port unavailability")
	dm.config.Port = newPort
	return newPort, nil
}

// startContainerWithRetry attempts to start container with exponential backoff
func (dm *DockerManager) startContainerWithRetry(ctx context.Context, port int) error {
	maxRetries := dm.config.MaxRetries
	if maxRetries == 0 {
		maxRetries = DefaultMaxRetries
	}

	delay := dm.config.RetryDelay
	if delay == 0 {
		delay = DefaultRetryDelay
	}

	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		dm.logger.WithFields(logrus.Fields{
			"port":    port,
			"attempt": attempt + 1,
		}).Debug("Starting container")

		cmd := exec.CommandContext(ctx, "docker", "run", "-d", "--rm",
			"-p", fmt.Sprintf("127.0.0.1:%d:9000", port),
			"--name", "treefrog-renderer",
			LocalImageName)

		output, err := cmd.CombinedOutput()
		dm.logs.WriteString(string(output))

		if err == nil {
			dm.logger.WithFields(logrus.Fields{
				"port": port,
			}).Info("Container started")
			return nil
		}

		lastErr = err
		dm.logger.WithFields(logrus.Fields{
			"port":    port,
			"attempt": attempt + 1,
			"error":   err,
		}).Warn("Container start failed")

		if attempt < maxRetries-1 {
			backoffDelay := time.Duration(float64(delay) * (dm.config.RetryBackoff))
			dm.logger.WithFields(logrus.Fields{
				"delay_ms": backoffDelay.Milliseconds(),
			}).Debug("Waiting before retry")
			time.Sleep(backoffDelay)
		}
	}

	return fmt.Errorf("failed to start container after %d attempts: %w", maxRetries, lastErr)
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

// healthCheckWithRetry performs health check with exponential backoff retry
func (dm *DockerManager) healthCheckWithRetry(ctx context.Context, port int) error {
	url := fmt.Sprintf("http://127.0.0.1:%d/health", port)
	client := &http.Client{Timeout: 1 * time.Second}

	maxRetries := HealthCheckMaxRetries
	delay := HealthCheckDelay

	dm.logger.WithFields(logrus.Fields{
		"port":        port,
		"max_retries": maxRetries,
	}).Debug("Starting health check with retry")

	for attempt := 0; attempt < maxRetries; attempt++ {
		resp, err := client.Get(url)
		if err == nil && resp.StatusCode == 200 {
			if resp != nil {
				resp.Body.Close()
			}
			dm.logger.WithFields(logrus.Fields{
				"port":     port,
				"attempts": attempt + 1,
			}).Debug("Health check passed")
			return nil
		}
		if resp != nil {
			resp.Body.Close()
		}

		if attempt < maxRetries-1 {
			dm.logger.WithFields(logrus.Fields{
				"port":        port,
				"attempt":     attempt + 1,
				"max_retries": maxRetries,
			}).Debug("Health check attempt failed, retrying...")
			time.Sleep(delay)
		}
	}

	return fmt.Errorf("health check timeout after %d attempts", maxRetries)
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
