package main

import (
	"errors"
	"fmt"
	"net"
)

// Image references
const (
	LocalImageName = "treefrog-renderer:latest"
	GHCRImageRef   = "ghcr.io/alpha-og/treefrog/renderer:latest"
)

// RendererMode represents the rendering mode
type RendererMode string

const (
	ModeAuto   RendererMode = "auto"
	ModeLocal  RendererMode = "local"
	ModeRemote RendererMode = "remote"
)

// ImageSource represents the source of the Docker image
type ImageSource string

const (
	SourceGHCR     ImageSource = "ghcr"
	SourceEmbedded ImageSource = "embedded"
	SourceCustom   ImageSource = "custom"
)

// RendererConfig holds all renderer settings
type RendererConfig struct {
	Mode      RendererMode `json:"mode"`
	Port      int          `json:"port"`
	AutoStart bool         `json:"autoStart"`

	// Image configuration
	ImageSource ImageSource `json:"imageSource"`
	ImageRef    string      `json:"imageRef"`

	// Remote builder settings
	RemoteURL   string `json:"remoteUrl"` // JSON tag uses lowercase 'url'
	RemoteToken string `json:"remoteToken"`

	// Custom image settings
	CustomRegistry string `json:"customRegistry,omitempty"`
	CustomTarPath  string `json:"customTarPath,omitempty"`
}

// DefaultRendererConfig returns sensible defaults
func DefaultRendererConfig() *RendererConfig {
	return &RendererConfig{
		Mode:        ModeAuto,
		Port:        8080,
		AutoStart:   false,
		ImageSource: SourceGHCR,
		ImageRef:    GHCRImageRef,
	}
}

// ValidatePort checks if port is valid
func ValidatePort(port int) error {
	if port < 1024 || port > 65535 {
		return errors.New("port must be between 1024 and 65535")
	}
	return nil
}

// IsPortAvailable checks if a port is available
func IsPortAvailable(port int) bool {
	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return false
	}
	listener.Close()
	return true
}

// FindAvailablePort finds an available port, preferring the given one
func FindAvailablePort(preferred int) (int, error) {
	if preferred > 0 && IsPortAvailable(preferred) {
		return preferred, nil
	}

	// Search ephemeral port range
	for port := 49152; port <= 65535; port++ {
		if IsPortAvailable(port) {
			return port, nil
		}
	}

	return 0, errors.New("no available ports found")
}
