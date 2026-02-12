package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// ImageManager handles Docker image lifecycle
type ImageManager struct {
	config *RendererConfig
	logger *logrus.Logger
	cache  *ImageCache
}

// ImageCache tracks image metadata for intelligent caching
type ImageCache struct {
	LastPull    time.Time `json:"lastPull"`
	LastBuild   time.Time `json:"lastBuild"`
	PullSource  string    `json:"pullSource"`
	BuildSource string    `json:"buildSource"`
	Digest      string    `json:"digest"`
}

// NewImageManager creates a new ImageManager
func NewImageManager(config *RendererConfig, logger *logrus.Logger) *ImageManager {
	return &ImageManager{
		config: config,
		logger: logger,
		cache:  &ImageCache{},
	}
}

// EnsureImage ensures the required Docker image is available
func (im *ImageManager) EnsureImage(ctx context.Context) error {
	// Check if image already exists
	if im.ImageExists(ctx) && im.isCacheValid() {
		im.logger.Info("Using cached image")
		return nil
	}

	switch im.config.ImageSource {
	case SourceGHCR:
		return im.pullFromGHCR(ctx)
	case SourceEmbedded:
		return im.buildFromDockerfile(ctx)
	case SourceCustom:
		if im.config.CustomTarPath != "" {
			return im.loadFromTar(ctx)
		}
		return im.pullCustom(ctx)
	default:
		return im.pullFromGHCR(ctx)
	}
}

// isCacheValid checks if cached image is still valid
func (im *ImageManager) isCacheValid() bool {
	// Cache is valid for 24 hours
	if im.cache.LastPull.IsZero() && im.cache.LastBuild.IsZero() {
		return false
	}

	lastUpdate := im.cache.LastPull
	if im.cache.LastBuild.After(lastUpdate) {
		lastUpdate = im.cache.LastBuild
	}

	return time.Since(lastUpdate) < 24*time.Hour
}

func (im *ImageManager) pullFromGHCR(ctx context.Context) error {
	im.logger.Info("Pulling image from GHCR...")

	// Cleanup any partial downloads first
	if err := im.cleanupPartialPulls(ctx); err != nil {
		im.logger.WithError(err).Warn("Failed to cleanup partial pulls")
	}

	var lastErr error
	maxRetries := 3
	baseDelay := time.Second

	for attempt := 0; attempt < maxRetries; attempt++ {
		// Use longer timeout for large images
		pullCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
		defer cancel()

		cmd := exec.CommandContext(pullCtx, "docker", "pull", GHCRImageRef)
		output, err := cmd.CombinedOutput()

		if err == nil {
			// Tag as local name
			tagCmd := exec.CommandContext(ctx, "docker", "tag", GHCRImageRef, LocalImageName)
			if err := tagCmd.Run(); err != nil {
				im.logger.WithError(err).Error("Failed to tag image after pull")
				return fmt.Errorf("failed to tag image: %w", err)
			}

			// Verify image integrity
			if err := im.verifyImageIntegrity(ctx); err != nil {
				im.logger.WithError(err).Error("Image verification failed, cleaning up...")
				im.removeImage(ctx, LocalImageName)
				return fmt.Errorf("image verification failed: %w", err)
			}

			im.cache.LastPull = time.Now()
			im.cache.PullSource = GHCRImageRef
			im.logger.Info("Successfully pulled and verified from GHCR")
			return nil
		}

		lastErr = fmt.Errorf("pull failed: %w\nOutput: %s", err, output)
		im.logger.Warnf("Pull attempt %d failed: %v", attempt+1, err)

		// Check if network error - use exponential backoff
		if im.isNetworkError(err) {
			// Progressive backoff: 5s, 15s, 30s
			delay := time.Duration(attempt+1) * baseDelay * 5
			im.logger.Infof("Network error detected, waiting %v before retry...", delay)
			time.Sleep(delay)
		} else {
			// Non-network error - shorter backoff
			delay := time.Duration(attempt+1) * 2 * time.Second
			time.Sleep(delay)
		}
	}

	return fmt.Errorf("failed after %d attempts: %w", maxRetries, lastErr)
}

func (im *ImageManager) buildFromDockerfile(ctx context.Context) error {
	im.logger.Info("Building image from embedded Dockerfile...")

	dockerfilePath, err := im.getDockerfilePath()
	if err != nil {
		return fmt.Errorf("Dockerfile not found: %w", err)
	}

	// Build context is latex-compiler/ root
	buildContext := filepath.Dir(filepath.Dir(dockerfilePath))

	im.logger.Infof("Building with context: %s", buildContext)

	cmd := exec.CommandContext(ctx, "docker", "build",
		"-t", LocalImageName,
		"-f", dockerfilePath,
		buildContext)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("build failed: %w\nOutput: %s", err, output)
	}

	im.cache.LastBuild = time.Now()
	im.cache.BuildSource = dockerfilePath
	im.logger.Info("Successfully built from Dockerfile")
	return nil
}

func (im *ImageManager) loadFromTar(ctx context.Context) error {
	im.logger.Infof("Loading image from tar: %s", im.config.CustomTarPath)

	if !im.validateTar(im.config.CustomTarPath) {
		return errors.New("invalid tar file format")
	}

	f, err := os.Open(im.config.CustomTarPath)
	if err != nil {
		return fmt.Errorf("failed to open tar: %w", err)
	}
	defer f.Close()

	cmd := exec.CommandContext(ctx, "docker", "load")
	cmd.Stdin = f

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("load failed: %w\nOutput: %s", err, output)
	}

	im.cache.LastBuild = time.Now()
	im.cache.BuildSource = im.config.CustomTarPath
	im.logger.Info("Successfully loaded from tar")
	return nil
}

func (im *ImageManager) pullCustom(ctx context.Context) error {
	if im.config.CustomRegistry == "" {
		return errors.New("no custom registry configured")
	}

	im.logger.Infof("Pulling from custom registry: %s", im.config.CustomRegistry)

	// Cleanup any partial downloads first
	if err := im.cleanupPartialPulls(ctx); err != nil {
		im.logger.WithError(err).Warn("Failed to cleanup partial pulls")
	}

	// Use longer timeout for custom registry pulls
	pullCtx, cancel := context.WithTimeout(ctx, 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(pullCtx, "docker", "pull", im.config.CustomRegistry)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("pull failed: %w\nOutput: %s", err, output)
	}

	// Tag as local name
	tagCmd := exec.CommandContext(ctx, "docker", "tag", im.config.CustomRegistry, LocalImageName)
	if err := tagCmd.Run(); err != nil {
		im.logger.WithError(err).Error("Failed to tag custom image")
		return fmt.Errorf("failed to tag custom image: %w", err)
	}

	// Verify image integrity
	if err := im.verifyImageIntegrity(ctx); err != nil {
		im.logger.WithError(err).Error("Custom image verification failed, cleaning up...")
		im.removeImage(ctx, LocalImageName)
		return fmt.Errorf("custom image verification failed: %w", err)
	}

	im.cache.LastPull = time.Now()
	im.cache.PullSource = im.config.CustomRegistry
	im.logger.Info("Successfully pulled and verified from custom registry")
	return nil
}

func (im *ImageManager) validateTar(path string) bool {
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()

	header := make([]byte, 263)
	n, _ := f.Read(header)
	if n < 263 {
		return false
	}

	magic := string(header[257:263])
	return magic == "ustar\x00" || magic == "ustar " || strings.HasPrefix(magic, "ustar")
}

func (im *ImageManager) getDockerfilePath() (string, error) {
	exePath, _ := os.Executable()
	exeDir := filepath.Dir(exePath)

	possiblePaths := []string{
		// Development: relative to wails/
		filepath.Join(exeDir, "..", "latex-compiler", "cmd", "server", "Dockerfile"),
		// macOS app bundle
		filepath.Join(exeDir, "..", "Resources", "latex-compiler", "cmd", "server", "Dockerfile"),
		// Linux/Windows resources
		filepath.Join(exeDir, "resources", "latex-compiler", "cmd", "server", "Dockerfile"),
		// CI/Dev: working directory
		filepath.Join(os.Getenv("PWD"), "latex-compiler", "cmd", "server", "Dockerfile"),
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}

	return "", errors.New("Dockerfile not found")
}

func (im *ImageManager) ImageExists(ctx context.Context) bool {
	cmd := exec.CommandContext(ctx, "docker", "image", "inspect", LocalImageName)
	return cmd.Run() == nil
}

// cleanupPartialPulls removes dangling images from failed pulls
func (im *ImageManager) cleanupPartialPulls(ctx context.Context) error {
	im.logger.Info("Cleaning up partial pulls...")
	cmd := exec.CommandContext(ctx, "docker", "image", "prune", "-f")
	output, err := cmd.CombinedOutput()
	if err != nil {
		im.logger.WithError(err).WithField("output", output).Warn("Image prune had warnings")
	}
	im.logger.Info("Partial pulls cleaned up")
	return nil
}

// verifyImageIntegrity checks if downloaded image is valid
func (im *ImageManager) verifyImageIntegrity(ctx context.Context) error {
	im.logger.Info("Verifying image integrity...")

	// Check if image exists and get details
	cmd := exec.CommandContext(ctx, "docker", "inspect", "--format={{.Id}}", LocalImageName)
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("image does not exist or is corrupted: %w", err)
	}

	imageID := strings.TrimSpace(string(output))
	if imageID == "" {
		return errors.New("image ID is empty - likely corrupted")
	}

	// Additional integrity check - try to get image size
	sizeCmd := exec.CommandContext(ctx, "docker", "inspect", "--format={{.Size}}", LocalImageName)
	sizeOutput, sizeErr := sizeCmd.Output()
	if sizeErr != nil {
		im.logger.WithError(sizeErr).Warn("Could not verify image size")
	} else {
		size := strings.TrimSpace(string(sizeOutput))
		im.logger.WithField("size", size).Debug("Image size verified")
	}

	im.logger.WithField("image_id", imageID).Info("Image integrity verified")
	return nil
}

// removeImage forcefully removes an image
func (im *ImageManager) removeImage(ctx context.Context, imageName string) error {
	im.logger.WithField("image", imageName).Info("Removing image...")
	cmd := exec.CommandContext(ctx, "docker", "rmi", "-f", imageName)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to remove image: %w\nOutput: %s", err, output)
	}
	im.logger.WithField("image", imageName).Info("Image removed successfully")
	return nil
}

// isNetworkError checks if error is network-related
func (im *ImageManager) isNetworkError(err error) bool {
	if err == nil {
		return false
	}

	errStr := err.Error()
	networkIndicators := []string{
		"connection refused",
		"connection timeout",
		"network is unreachable",
		"no such host",
		"timeout awaiting response",
		"temporary failure in name resolution",
		"connection reset",
		"broken pipe",
		" tls: ",
		" x509: ",
		"unknown authority",
		"dial tcp: lookup",
		"i/o timeout",
	}

	for _, indicator := range networkIndicators {
		if strings.Contains(strings.ToLower(errStr), indicator) {
			return true
		}
	}

	return false
}

func (im *ImageManager) runCommand(cmd *exec.Cmd, description string) error {
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s failed: %w\nOutput: %s", description, err, output)
	}
	return nil
}
