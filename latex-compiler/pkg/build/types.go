package build

import (
	"fmt"
	"strings"
	"time"
)

type BuildStatus string

const (
	StatusPending   BuildStatus = "pending"
	StatusCompiling BuildStatus = "compiling"
	StatusCompleted BuildStatus = "completed"
	StatusFailed    BuildStatus = "failed"
	StatusExpired   BuildStatus = "expired"
	StatusDeleted   BuildStatus = "deleted"
)

type Engine string

const (
	EnginePDFLaTeX Engine = "pdflatex"
	EngineXeLaTeX  Engine = "xelatex"
	EngineLuaLaTeX Engine = "lualatex"
)

// Validation constants (Issue #9, #45 - input validation)
const (
	MaxFileSize     = 100 * 1024 * 1024 // 100MB
	MaxMainFileLen  = 256
	MaxLogSize      = 10 * 1024 * 1024 // 10MB
	MinBuildTimeout = 30 * time.Second
	MaxBuildTimeout = 10 * time.Minute
)

var (
	ValidEngines = map[string]bool{
		"pdflatex": true,
		"xelatex":  true,
		"lualatex": true,
	}
)

type Build struct {
	ID             string      `json:"id"`
	UserID         string      `json:"user_id"` // Clerk user ID
	Status         BuildStatus `json:"status"`
	Engine         Engine      `json:"engine"`
	MainFile       string      `json:"main_file"`
	DirPath        string      `json:"dir_path"`
	PDFPath        string      `json:"pdf_path,omitempty"`
	SyncTeXPath    string      `json:"synctex_path,omitempty"`
	BuildLog       string      `json:"build_log,omitempty"`
	ErrorMessage   string      `json:"error_message,omitempty"`
	ShellEscape    bool        `json:"shell_escape"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
	ExpiresAt      time.Time   `json:"expires_at"`
	LastAccessedAt time.Time   `json:"last_accessed_at"`
	StorageBytes   int64       `json:"storage_bytes"`
}

// Validate validates build parameters (Issue #9 - input validation)
func (b *Build) Validate() error {
	if b.UserID == "" {
		return fmt.Errorf("user_id required")
	}

	if b.MainFile == "" {
		return fmt.Errorf("main_file required")
	}

	// Prevent path traversal (Issue #9)
	if strings.Contains(b.MainFile, "..") || strings.Contains(b.MainFile, "/") || strings.Contains(b.MainFile, "\\") {
		return fmt.Errorf("invalid main_file: path traversal not allowed")
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
	ID        string      `json:"id"`
	Status    BuildStatus `json:"status"`
	Engine    Engine      `json:"engine"`
	MainFile  string      `json:"main_file"`
	CreatedAt time.Time   `json:"created_at"`
	ExpiresAt time.Time   `json:"expires_at"`
}

type StatusResponse struct {
	ID          string      `json:"id"`
	Status      BuildStatus `json:"status"`
	Message     string      `json:"message,omitempty"`
	Engine      Engine      `json:"engine"`
	Progress    int         `json:"progress,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
	CompletedAt *time.Time  `json:"completed_at,omitempty"`
}

// BuildListResponse for paginated build list (Issue #26 - build listing API)
type BuildListResponse struct {
	Builds     []BuildResponse `json:"builds"`
	Total      int             `json:"total"`
	Page       int             `json:"page"`
	PageSize   int             `json:"page_size"`
	TotalPages int             `json:"total_pages"`
}
