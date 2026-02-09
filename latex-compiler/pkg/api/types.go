package api

import "time"

// BuildOptions contains LaTeX compilation options
type BuildOptions struct {
	MainFile    string `json:"mainFile"`
	Engine      string `json:"engine"`
	ShellEscape bool   `json:"shellEscape"`
}

// Build represents a compilation job
type Build struct {
	ID        string    `json:"id"`
	Dir       string    `json:"-"`
	Status    string    `json:"status"`
	Message   string    `json:"message"`
	StartedAt time.Time `json:"startedAt"`
	EndedAt   time.Time `json:"endedAt"`
}

// Config holds server configuration
type Config struct {
	Port    string
	Token   string
	WorkDir string
}
