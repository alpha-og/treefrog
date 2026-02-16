package build

import (
	"fmt"
	"strings"
	"time"
)

type Status string

const (
	StatusPending   Status = "pending"
	StatusCompiling Status = "compiling"
	StatusRetrying  Status = "retrying"
	StatusCompleted Status = "completed"
	StatusFailed    Status = "failed"
	StatusExpired   Status = "expired"
	StatusDeleted   Status = "deleted"
)

type Engine string

const (
	EnginePDFLaTeX Engine = "pdflatex"
	EngineXeLaTeX  Engine = "xelatex"
	EngineLuaLaTeX Engine = "lualatex"
)

var ValidEngines = map[string]bool{
	"pdflatex": true,
	"xelatex":  true,
	"lualatex": true,
}

const (
	MaxFileSize     = 100 * 1024 * 1024
	MaxMainFileLen  = 256
	MaxLogSize      = 10 * 1024 * 1024
	MinBuildTimeout = 30 * time.Second
	MaxBuildTimeout = 10 * time.Minute
)

const (
	ContainerMemoryMB    = 2048
	ContainerCPUQuota    = 200000
	ContainerCPUShares   = 1024
	ContainerPidsLimit   = 256
	ContainerTmpfsSizeMB = 2048
)

type Build struct {
	ID             string     `json:"id"`
	UserID         string     `json:"user_id,omitempty"`
	Status         Status     `json:"status"`
	Engine         Engine     `json:"engine"`
	MainFile       string     `json:"main_file"`
	DirPath        string     `json:"dir_path,omitempty"`
	PDFPath        string     `json:"pdf_path,omitempty"`
	SyncTeXPath    string     `json:"synctex_path,omitempty"`
	BuildLog       string     `json:"build_log,omitempty"`
	ErrorMessage   string     `json:"error_message,omitempty"`
	ShellEscape    bool       `json:"shell_escape"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	ExpiresAt      time.Time  `json:"expires_at,omitempty"`
	LastAccessedAt time.Time  `json:"last_accessed_at,omitempty"`
	StorageBytes   int64      `json:"storage_bytes,omitempty"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty"`
}

type BuildOptions struct {
	MainFile    string `json:"main_file"`
	Engine      Engine `json:"engine"`
	ShellEscape bool   `json:"shell_escape"`
}

func (b *Build) Validate() error {
	if b.MainFile == "" {
		return fmt.Errorf("main_file required")
	}

	// Block parent directory traversal and absolute paths
	if strings.Contains(b.MainFile, "..") {
		return fmt.Errorf("invalid main_file: path traversal not allowed")
	}
	// Block absolute paths (Unix and Windows)
	if strings.HasPrefix(b.MainFile, "/") || strings.HasPrefix(b.MainFile, "\\") {
		return fmt.Errorf("invalid main_file: absolute path not allowed")
	}
	if len(b.MainFile) >= 2 && b.MainFile[1] == ':' { // Windows drive letter (C:\)
		return fmt.Errorf("invalid main_file: absolute path not allowed")
	}

	if len(b.MainFile) > MaxMainFileLen {
		return fmt.Errorf("main_file too long (max %d chars)", MaxMainFileLen)
	}

	if !ValidEngines[string(b.Engine)] {
		return fmt.Errorf("invalid engine: must be one of pdflatex, xelatex, lualatex")
	}

	return nil
}

type BuildResponse struct {
	ID        string    `json:"id"`
	Status    Status    `json:"status"`
	Engine    Engine    `json:"engine"`
	MainFile  string    `json:"main_file"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at,omitempty"`
}

type StatusResponse struct {
	ID          string     `json:"id"`
	Status      Status     `json:"status"`
	Message     string     `json:"message,omitempty"`
	Engine      Engine     `json:"engine"`
	Progress    int        `json:"progress,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}

type BuildListResponse struct {
	Builds     []BuildResponse `json:"builds"`
	Total      int             `json:"total"`
	Page       int             `json:"page"`
	PageSize   int             `json:"page_size"`
	TotalPages int             `json:"total_pages"`
}
