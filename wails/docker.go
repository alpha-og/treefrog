package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// RendererStatus represents the state of the Docker renderer
type RendererStatus struct {
	State     string `json:"state"`   // running|stopped|error|not-installed|building
	Message   string `json:"message"` // Human-readable status/error message
	Port      int    `json:"port"`
	Logs      string `json:"logs"`
	IsRunning bool   `json:"isRunning"`
}

// DockerManager handles the lifecycle of the Docker renderer container
type DockerManager struct {
	config         *RendererConfig
	ctx            context.Context
	logger         *logrus.Logger
	isRunning      bool
	mu             sync.Mutex
	logs           strings.Builder
	dockerfilePath string
	lastError      string
}

// NewDockerManager creates a new DockerManager
func NewDockerManager(ctx context.Context, config *RendererConfig, logger *logrus.Logger, dockerfilePath string) *DockerManager {
	return &DockerManager{
		config:         config,
		ctx:            ctx,
		logger:         logger,
		dockerfilePath: dockerfilePath,
	}
}

// IsDockerInstalled checks if Docker is available on the system
func (dm *DockerManager) IsDockerInstalled() bool {
	cmd := exec.CommandContext(dm.ctx, "docker", "version")
	return cmd.Run() == nil
}

// BuildImage builds the Docker image from the bundled Dockerfile
func (dm *DockerManager) BuildImage() error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	dm.logs.Reset()

	if !dm.IsDockerInstalled() {
		dm.lastError = "Docker is not installed or not accessible"
		dm.logger.Error(dm.lastError)
		return errors.New("docker not installed")
	}

	// Check if image already exists
	if dm.imageExists() {
		dm.logger.Info("Docker image already exists, skipping build")
		return nil
	}

	dm.logger.Info("Building Docker image from Dockerfile")

	// Build the image
	cmd := exec.CommandContext(dm.ctx, "docker", BuildDockerBuildCommand(dm.dockerfilePath)...)
	output, err := cmd.CombinedOutput()
	dm.logs.WriteString(string(output))

	if err != nil {
		dm.lastError = fmt.Sprintf("Failed to build image: %v", err)
		dm.logger.Error(dm.lastError)
		return err
	}

	dm.logger.Info("Docker image built successfully")
	return nil
}

// PullImage downloads the Docker image from a remote registry
func (dm *DockerManager) PullImage(imageRef string) error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	dm.logs.Reset()

	if !dm.IsDockerInstalled() {
		dm.lastError = "Docker is not installed or not accessible"
		dm.logger.Error(dm.lastError)
		return errors.New("docker not installed")
	}

	dm.logger.Infof("Pulling Docker image: %s", imageRef)

	cmd := exec.CommandContext(dm.ctx, "docker", BuildDockerPullCommand(imageRef)...)
	output, err := cmd.CombinedOutput()
	dm.logs.WriteString(string(output))

	if err != nil {
		dm.lastError = fmt.Sprintf("Failed to pull image: %v", err)
		dm.logger.Error(dm.lastError)
		return err
	}

	dm.logger.Info("Docker image pulled successfully")
	return nil
}

// imageExists checks if the treefrog-renderer image exists
func (dm *DockerManager) imageExists() bool {
	cmd := exec.CommandContext(dm.ctx, "docker", BuildDockerImageCheckCommand()...)
	return cmd.Run() == nil
}

// Start starts the Docker container
func (dm *DockerManager) Start() error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	dm.logs.Reset()

	if !dm.IsDockerInstalled() {
		dm.lastError = "Docker is not installed or not accessible"
		dm.logger.Error(dm.lastError)
		return errors.New("docker not installed")
	}

	// Validate port
	if err := ValidatePort(dm.config.Port); err != nil {
		dm.lastError = err.Error()
		dm.logger.Error(dm.lastError)
		return err
	}

	// Check port availability
	if !IsPortAvailable(dm.config.Port) {
		dm.lastError = fmt.Sprintf("Port %d is already in use", dm.config.Port)
		dm.logger.Error(dm.lastError)
		return errors.New("port in use")
	}

	// Check if container is already running
	if dm.containerExists() {
		dm.logger.Info("Container already exists, stopping it first")
		if err := dm.stopContainer(); err != nil {
			dm.logger.Warnf("Failed to stop existing container: %v", err)
		}
	}

	dm.logger.Infof("Starting Docker container on port %d", dm.config.Port)

	cmd := exec.CommandContext(dm.ctx, "docker", BuildDockerRunCommand(dm.config.Port, "treefrog-renderer:latest")...)
	output, err := cmd.CombinedOutput()
	dm.logs.WriteString(string(output))

	if err != nil {
		dm.lastError = fmt.Sprintf("Failed to start container: %v", err)
		dm.logger.Error(dm.lastError)
		return err
	}

	// Wait for health check
	if err := dm.healthCheck(); err != nil {
		dm.lastError = fmt.Sprintf("Container failed health check: %v", err)
		dm.logger.Error(dm.lastError)
		// Try to stop the container
		dm.stopContainer()
		return err
	}

	dm.isRunning = true
	dm.config.Enabled = true
	dm.logger.Info("Docker container started successfully")
	return nil
}

// Stop stops the Docker container
func (dm *DockerManager) Stop() error {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	if !dm.isRunning {
		return nil
	}

	dm.logger.Info("Stopping Docker container")

	if err := dm.stopContainer(); err != nil {
		dm.lastError = fmt.Sprintf("Failed to stop container: %v", err)
		dm.logger.Error(dm.lastError)
		return err
	}

	dm.isRunning = false
	dm.config.Enabled = false
	dm.logger.Info("Docker container stopped")
	return nil
}

// stopContainer is the internal implementation of stopping a container
func (dm *DockerManager) stopContainer() error {
	cmd := exec.CommandContext(dm.ctx, "docker", BuildDockerStopCommand()...)
	_, err := cmd.CombinedOutput()
	return err
}

// containerExists checks if the treefrog-renderer container exists
func (dm *DockerManager) containerExists() bool {
	cmd := exec.CommandContext(dm.ctx, "docker", BuildDockerCheckCommand()...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return false
	}
	return len(strings.TrimSpace(string(output))) > 0
}

// Restart stops and starts the container
func (dm *DockerManager) Restart() error {
	dm.logger.Info("Restarting Docker container")

	if err := dm.Stop(); err != nil {
		dm.logger.Warnf("Error stopping container during restart: %v", err)
	}

	// Wait before restarting
	time.Sleep(2 * time.Second)

	if err := dm.Start(); err != nil {
		dm.lastError = fmt.Sprintf("Failed to restart container: %v", err)
		dm.logger.Error(dm.lastError)
		return err
	}

	dm.logger.Info("Docker container restarted successfully")
	return nil
}

// healthCheck performs an HTTP health check on the renderer
func (dm *DockerManager) healthCheck() error {
	const maxRetries = 30
	const retryInterval = 200 * time.Millisecond

	url := fmt.Sprintf("http://127.0.0.1:%d/health", dm.config.Port)

	for i := 0; i < maxRetries; i++ {
		resp, err := http.Get(url)
		if err == nil && resp.StatusCode == http.StatusOK {
			resp.Body.Close()
			dm.logger.Info("Container health check passed")
			return nil
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(retryInterval)
	}

	return errors.New("health check timeout")
}

// GetStatus returns the current status of the renderer
func (dm *DockerManager) GetStatus() RendererStatus {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	state := "stopped"
	message := ""

	if !dm.IsDockerInstalled() {
		state = "not-installed"
		message = "Docker is not installed"
	} else if dm.isRunning {
		state = "running"
		message = fmt.Sprintf("Running on port %d", dm.config.Port)
	} else if dm.lastError != "" {
		state = "error"
		message = dm.lastError
	}

	return RendererStatus{
		State:     state,
		Message:   message,
		Port:      dm.config.Port,
		Logs:      dm.logs.String(),
		IsRunning: dm.isRunning,
	}
}

// GetLogs returns the current logs
func (dm *DockerManager) GetLogs() string {
	dm.mu.Lock()
	defer dm.mu.Unlock()
	return dm.logs.String()
}

// SetPort updates the port and gracefully restarts if running
func (dm *DockerManager) SetPort(port int) error {
	if err := ValidatePort(port); err != nil {
		return err
	}

	dm.mu.Lock()
	wasRunning := dm.isRunning
	dm.mu.Unlock()

	// Update port
	dm.config.Port = port

	// If was running, restart with new port
	if wasRunning {
		if err := dm.Stop(); err != nil {
			dm.logger.Warnf("Error stopping container for port change: %v", err)
		}
		time.Sleep(1 * time.Second)
		return dm.Start()
	}

	return nil
}

// GetEmbeddedDockerfilePath returns the path to the embedded Dockerfile
func GetEmbeddedDockerfilePath() (string, error) {
	// The Dockerfile is bundled in the executable
	// We need to extract it or find it at a known location

	// Try multiple possible locations
	possiblePaths := []string{
		// During development
		filepath.Join(os.Getenv("PWD"), "remote-builder", "Dockerfile"),
		// Relative to executable
		filepath.Join(filepath.Dir(os.Args[0]), "..", "remote-builder", "Dockerfile"),
		// Absolute path
		"/Users/athulanoop/software_projects/treefrog/remote-builder/Dockerfile",
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}

	return "", errors.New("Dockerfile not found in any expected location")
}
