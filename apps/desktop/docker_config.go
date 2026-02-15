package main

import (
	"errors"
	"fmt"
	"net"
	"time"
)

const (
	LocalImageName = "treefrog-local-latex-compiler:latest"
	GHCRImageRef   = "ghcr.io/alpha-og/treefrog/local-latex-compiler:latest"
)

const (
	DefaultMaxRetries     = 3
	DefaultRetryDelay     = 1 * time.Second
	DefaultRetryBackoff   = 2.0
	DefaultRetryTimeout   = 5 * time.Minute
	HealthCheckMaxRetries = 30
	HealthCheckDelay      = 200 * time.Millisecond
)

type RendererMode string

const (
	ModeAuto   RendererMode = "auto"
	ModeLocal  RendererMode = "local"
	ModeRemote RendererMode = "remote"
)

type ImageSource string

const (
	SourceGHCR     ImageSource = "ghcr"
	SourceEmbedded ImageSource = "embedded"
	SourceCustom   ImageSource = "custom"
)

type RendererConfig struct {
	Mode      RendererMode `json:"mode"`
	Port      int          `json:"port"`
	AutoStart bool         `json:"autoStart"`

	ImageSource ImageSource `json:"imageSource"`
	ImageRef    string      `json:"imageRef"`

	RemoteCompilerURL string `json:"remoteCompilerUrl"`

	CustomRegistry string `json:"customRegistry,omitempty"`
	CustomTarPath  string `json:"customTarPath,omitempty"`

	MaxRetries   int           `json:"maxRetries"`
	RetryDelay   time.Duration `json:"retryDelay"`
	RetryBackoff float64       `json:"retryBackoff"`
	RetryTimeout time.Duration `json:"retryTimeout"`
}

func DefaultRendererConfig() *RendererConfig {
	return &RendererConfig{
		Mode:         ModeAuto,
		Port:         8080,
		AutoStart:    false,
		ImageSource:  SourceGHCR,
		ImageRef:     GHCRImageRef,
		MaxRetries:   DefaultMaxRetries,
		RetryDelay:   DefaultRetryDelay,
		RetryBackoff: DefaultRetryBackoff,
		RetryTimeout: DefaultRetryTimeout,
	}
}

func ValidatePort(port int) error {
	if port < 1024 || port > 65535 {
		return errors.New("port must be between 1024 and 65535")
	}
	return nil
}

func IsPortAvailable(port int) bool {
	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return false
	}
	listener.Close()
	return true
}

func FindAvailablePort(preferred int) (int, error) {
	if preferred > 0 && IsPortAvailable(preferred) {
		return preferred, nil
	}

	for port := 49152; port <= 65535; port++ {
		if IsPortAvailable(port) {
			return port, nil
		}
	}

	return 0, errors.New("no available ports found")
}
