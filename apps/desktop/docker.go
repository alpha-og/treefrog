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
	config          *RendererConfig
	imageMgr        *ImageManager
	logger          *logrus.Logger
	isRunning       bool
	logs            strings.Builder
	dockerVersion   string
	dockerVersionOK bool
	mu              sync.Mutex
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

// CheckDockerVersion verifies Docker is installed and meets version requirements
func (dm *DockerManager) CheckDockerVersion() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Get docker version output
	cmd := exec.CommandContext(ctx, "docker", "version", "--format", "{{.Server.Version}}")
	output, err := cmd.Output()
	if err != nil {
		dm.dockerVersionOK = false
		return fmt.Errorf("failed to get docker version: %w", err)
	}

	version := strings.TrimSpace(string(output))
	if version == "" {
		dm.dockerVersionOK = false
		return errors.New("docker version string is empty")
	}

	dm.dockerVersion = version

	// Parse version - minimum 19.03
	parts := strings.Split(version, ".")
	if len(parts) < 2 {
		dm.dockerVersionOK = false
		return fmt.Errorf("invalid docker version format: %s", version)
	}

	// Extract major version
	var major int
	if _, err := fmt.Sscanf(parts[0], "%d", &major); err != nil {
		dm.dockerVersionOK = false
		return fmt.Errorf("invalid docker major version: %s", parts[0])
	}

	// Minimum required version is 19.03
	const minMajor = 19
	if major < minMajor {
		dm.dockerVersionOK = false
		return fmt.Errorf("docker version %s is too old (minimum required: 19.03)", version)
	}

	dm.dockerVersionOK = true
	dm.logger.WithFields(logrus.Fields{
		"version": version,
	}).Info("Docker version check passed")

	return nil
}

// Start starts the Docker container
func (dm *DockerManager) Start(ctx context.Context) error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	dm.logs.Reset()

	if !dm.IsDockerInstalled() {
		return errors.New("Docker not installed")
	}

	// Check Docker version
	if err := dm.CheckDockerVersion(); err != nil {
		dm.logger.WithError(err).Error("Docker version check failed")
		return fmt.Errorf("docker version check failed: %w", err)
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

	// Force remove any existing container (including zombie containers)
	if err := dm.forceRemoveContainer(ctx); err != nil {
		dm.logger.WithError(err).Warn("Failed to remove existing container")
	}

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
			"-p", fmt.Sprintf("127.0.0.1:%d:8080", port),
			"--name", "treefrog-local-latex-compiler",
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

func (dm *DockerManager) forceRemoveContainer(ctx context.Context) error {
	dm.logger.Info("Force removing any existing container...")

	// Try graceful stop first
	dm.stopContainer(ctx)

	// Force remove container
	rmCmd := exec.CommandContext(ctx, "docker", "rm", "-f", "treefrog-local-latex-compiler")
	rmOutput, rmErr := rmCmd.CombinedOutput()
	dm.logs.WriteString(string(rmOutput))

	if rmErr != nil {
		// Check if container exists
		inspectCmd := exec.CommandContext(ctx, "docker", "inspect", "treefrog-local-latex-compiler")
		if inspectCmd.Run() != nil {
			// Container doesn't exist, which is fine
			dm.logger.Info("No existing container to remove")
			return nil
		}
		dm.logger.WithError(rmErr).WithField("output", string(rmOutput)).Error("Failed to remove container")
		return fmt.Errorf("failed to force remove container: %w", rmErr)
	}

	dm.logger.Info("Container force removed successfully")
	return nil
}

func (dm *DockerManager) stopContainer(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "docker", "stop", "treefrog-local-latex-compiler")
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

	// Check if container is actually running (not just cached state)
	if dockerInstalled && dm.isRunning {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		cmd := exec.CommandContext(ctx, "docker", "inspect", "-f", "{{.State.Running}}", "treefrog-local-latex-compiler")
		output, err := cmd.Output()
		cancel()

		if err != nil || strings.TrimSpace(string(output)) != "true" {
			// Container is not actually running, update state
			dm.isRunning = false
			dm.logger.Warn("Container state mismatch: marked running but container not found")
		}
	}

	if !dockerInstalled {
		state = "not-installed"
		message = "Docker not installed"
	} else if !dm.dockerVersionOK {
		state = "error"
		if dm.dockerVersion != "" {
			message = fmt.Sprintf("Docker version %s is not supported (minimum: 19.03)", dm.dockerVersion)
		} else {
			message = "Docker version check failed"
		}
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

func (dm *DockerManager) DetectBestMode(ctx context.Context) RendererMode {
	if dm.config.Mode != ModeAuto {
		return dm.config.Mode
	}

	if dm.IsDockerInstalled() {
		dm.logger.Info("Docker available, using local mode")
		return ModeLocal
	}

	dm.logger.Warn("No local backend available, using remote mode")
	return ModeRemote
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

// CheckDiskSpace checks available disk space for Docker operations
func (dm *DockerManager) CheckDiskSpace() (int64, error) {
	cmd := exec.Command("df", "-h", "/var/lib/docker")
	output, err := cmd.Output()
	if err != nil {
		// Try fallback to root partition
		cmd = exec.Command("df", "/", "-h")
		output, err = cmd.Output()
		if err != nil {
			return 0, fmt.Errorf("failed to check disk space: %w", err)
		}
	}

	lines := strings.Split(string(output), "\n")
	if len(lines) < 2 {
		return 0, errors.New("failed to parse disk space output")
	}

	// Parse the second line (actual disk info)
	fields := strings.Fields(lines[1])
	if len(fields) < 4 {
		return 0, errors.New("failed to parse disk space fields")
	}

	available := fields[3]
	// Remove 'G', 'M', 'K' suffix and convert to bytes
	var availableBytes int64
	if strings.HasSuffix(available, "G") {
		var gigabytes float64
		fmt.Sscanf(available[:len(available)-1], "%f", &gigabytes)
		availableBytes = int64(gigabytes * 1024 * 1024 * 1024)
	} else if strings.HasSuffix(available, "M") {
		var megabytes float64
		fmt.Sscanf(available[:len(available)-1], "%f", &megabytes)
		availableBytes = int64(megabytes * 1024 * 1024)
	} else if strings.HasSuffix(available, "K") {
		var kilobytes float64
		fmt.Sscanf(available[:len(available)-1], "%f", &kilobytes)
		availableBytes = int64(kilobytes * 1024)
	} else {
		// Assume bytes
		fmt.Sscanf(available, "%d", &availableBytes)
	}

	dm.logger.WithField("available_bytes", availableBytes).Debug("Disk space check")
	return availableBytes, nil
}

// CleanupDockerSystem performs cleanup of unused Docker resources
func (dm *DockerManager) CleanupDockerSystem(ctx context.Context) error {
	dm.logger.Info("Performing Docker system cleanup...")

	// Cleanup stopped containers
	containerCmd := exec.CommandContext(ctx, "docker", "container", "prune", "-f")
	output, err := containerCmd.CombinedOutput()
	if err != nil {
		dm.logger.WithError(err).WithField("output", string(output)).Warn("Container prune had warnings")
	}

	// Cleanup unused images
	imageCmd := exec.CommandContext(ctx, "docker", "image", "prune", "-f")
	output, err = imageCmd.CombinedOutput()
	if err != nil {
		dm.logger.WithError(err).WithField("output", string(output)).Warn("Image prune had warnings")
	}

	// Cleanup unused networks (safe, won't affect active networks)
	networkCmd := exec.CommandContext(ctx, "docker", "network", "prune", "-f")
	output, err = networkCmd.CombinedOutput()
	if err != nil {
		dm.logger.WithError(err).WithField("output", string(output)).Warn("Network prune had warnings")
	}

	dm.logger.Info("Docker system cleanup completed")
	return nil
}
