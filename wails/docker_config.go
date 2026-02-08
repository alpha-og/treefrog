package main

import (
	"errors"
	"fmt"
	"net"
)

// RendererConfig holds Docker renderer settings
type RendererConfig struct {
	Port      int  `json:"port"`      // Port to expose renderer on (1024-65535)
	Enabled   bool `json:"enabled"`   // Whether renderer is currently active
	AutoStart bool `json:"autoStart"` // Auto-start renderer on app launch
}

// ValidatePort checks if a port number is valid
func ValidatePort(port int) error {
	if port < 1024 || port > 65535 {
		return errors.New("port must be between 1024 and 65535")
	}
	return nil
}

// IsPortAvailable checks if a port is available for binding
func IsPortAvailable(port int) bool {
	listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		return false
	}
	listener.Close()
	return true
}

// BuildDockerRunCommand constructs a docker run command for the renderer
func BuildDockerRunCommand(port int, imageName string) []string {
	return []string{
		"run",
		"-d",                                         // Detached mode
		"--rm",                                       // Auto-remove on stop
		"-p", fmt.Sprintf("127.0.0.1:%d:8080", port), // Map port
		"--name", "treefrog-renderer", // Container name
		imageName,
	}
}

// BuildDockerStopCommand constructs a docker stop command
func BuildDockerStopCommand() []string {
	return []string{"stop", "treefrog-renderer"}
}

// BuildDockerCheckCommand constructs a docker ps command to check container
func BuildDockerCheckCommand() []string {
	return []string{
		"ps",
		"-a",
		"-q",
		"-f", "name=^treefrog-renderer$", // Exact match
	}
}

// BuildDockerBuildCommand constructs a docker build command
func BuildDockerBuildCommand(dockerfilePath string) []string {
	return []string{
		"build",
		"-t", "treefrog-renderer:latest",
		"-f", dockerfilePath,
		".",
	}
}

// BuildDockerImageCheckCommand checks if image exists
func BuildDockerImageCheckCommand() []string {
	return []string{
		"image",
		"inspect",
		"treefrog-renderer:latest",
	}
}

// BuildDockerPullCommand constructs a docker pull command for downloading from GitHub releases
func BuildDockerPullCommand(imageRef string) []string {
	return []string{
		"pull",
		imageRef,
	}
}
