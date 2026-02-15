# Phase 3: Build System

## Overview

This phase covers:
- Build types and status
- Build limits by tier
- Docker-based LaTeX compilation
- User isolation

## Build Types (`pkg/build/types.go`)

```go
package build

import (
	"fmt"
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
	MaxFileSize     = 100 * 1024 * 1024  // 100MB
	MaxMainFileLen  = 256
	MaxLogSize      = 10 * 1024 * 1024   // 10MB
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
	if contains(b.MainFile, "..") || contains(b.MainFile, "/") || contains(b.MainFile, "\\") {
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

// Helper function
func contains(s, substr string) bool {
	for i := 0; i < len(s); i++ {
		if len(substr) > len(s)-i {
			return false
		}
		match := true
		for j := 0; j < len(substr); j++ {
			if s[i+j] != substr[j] {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
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
```

## Job Queue and Worker Pool (Issue #8 - horizontal scalability)

### Build Queue (`pkg/build/queue.go`)

```go
package build

import (
	"fmt"
	"log"
	"sync"
	"time"
)

// JobStatus tracks build job status
type JobStatus string

const (
	JobPending    JobStatus = "pending"
	JobProcessing JobStatus = "processing"
	JobCompleted  JobStatus = "completed"
	JobFailed     JobStatus = "failed"
)

// BuildJob represents a build job in the queue
type BuildJob struct {
	Build      *Build
	Status     JobStatus
	Retries    int
	MaxRetries int
	Error      error
	CreatedAt  time.Time
	StartedAt  *time.Time
	CompletedAt *time.Time
}

// Queue manages build job queue with worker pool
type Queue struct {
	jobs       chan *BuildJob
	workers    int
	workerPool []*Worker
	store      *Store
	wg         sync.WaitGroup
	done       chan struct{}
	mu         sync.RWMutex
}

// Worker processes build jobs
type Worker struct {
	id       int
	queue    chan *BuildJob
	compiler *DockerCompiler
	store    *Store
	done     chan struct{}
}

// NewQueue creates a new build queue with worker pool (Issue #8)
func NewQueue(numWorkers int, compiler *DockerCompiler, store *Store) *Queue {
	q := &Queue{
		jobs:    make(chan *BuildJob, 100), // Buffer 100 jobs
		workers: numWorkers,
		store:   store,
		done:    make(chan struct{}),
	}

	for i := 0; i < numWorkers; i++ {
		worker := &Worker{
			id:       i,
			queue:    q.jobs,
			compiler: compiler,
			store:    store,
			done:     q.done,
		}
		q.workerPool = append(q.workerPool, worker)
		q.wg.Add(1)
		go worker.process(&q.wg)
	}

	return q
}

// Enqueue adds a job to the queue
func (q *Queue) Enqueue(build *Build) error {
	if build.ID == "" || build.UserID == "" {
		return fmt.Errorf("invalid build")
	}

	job := &BuildJob{
		Build:      build,
		Status:     JobPending,
		MaxRetries: 3,
		CreatedAt:  time.Now(),
	}

	select {
	case q.jobs <- job:
		log.Printf("Enqueued build job: %s", build.ID)
		return nil
	case <-q.done:
		return fmt.Errorf("queue is closed")
	}
}

// Stop gracefully shuts down the queue and waits for jobs to complete
func (q *Queue) Stop() {
	close(q.done)
	q.wg.Wait()
	close(q.jobs)
	log.Println("Build queue stopped")
}

// Worker processes jobs
func (w *Worker) process(wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		select {
		case job := <-w.queue:
			if job == nil {
				return
			}
			w.executeJob(job)
		case <-w.done:
			return
		}
	}
}

// executeJob executes a build job with retry logic (Issue #20 - error recovery)
func (w *Worker) executeJob(job *BuildJob) {
	job.Status = JobProcessing
	now := time.Now()
	job.StartedAt = &now

	log.Printf("Worker %d: Processing build %s", w.id, job.Build.ID)

	if err := w.compiler.CompileWithLatexmk(job.Build); err != nil {
		log.Printf("Compilation failed: %v", err)
		
		// Retry logic (Issue #20)
		if job.Retries < job.MaxRetries {
			job.Retries++
			job.Error = err
			// Re-enqueue job after backoff
			backoff := time.Duration(job.Retries) * 30 * time.Second
			time.Sleep(backoff)
			log.Printf("Retrying build %s (attempt %d/%d)", job.Build.ID, job.Retries, job.MaxRetries)
			
			job.Status = JobPending
			w.queue <- job
			return
		}
		
		job.Status = JobFailed
		job.Build.Status = StatusFailed
		job.Build.ErrorMessage = fmt.Sprintf("Compilation failed after %d retries: %v", job.MaxRetries, err)
	} else {
		job.Status = JobCompleted
	}

	job.Build.UpdatedAt = time.Now()
	now = time.Now()
	job.CompletedAt = &now

	if err := w.store.Update(job.Build); err != nil {
		log.Printf("Failed to update build: %v", err)
	}

	log.Printf("Worker %d: Completed build %s with status %s", w.id, job.Build.ID, job.Status)
}

// GetJobStatus returns the status of a job (for monitoring)
func (q *Queue) GetJobStatus(buildID string) (JobStatus, error) {
	// Implementation: query database for latest build status
	return JobCompleted, nil
}
```

## Docker Compilation

### Docker Compiler Service (`pkg/build/compiler.go`)

```go
package build

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

type DockerCompiler struct {
	dockerClient *client.Client
	imageName    string
	workDir     string
}

func NewDockerCompiler(imageName, workDir string) (*DockerCompiler, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	return &DockerCompiler{
		dockerClient: cli,
		imageName:    imageName,
		workDir:      workDir,
	}, nil
}

func (c *DockerCompiler) Compile(build *Build) error {
	ctx := context.Background()

	// Prepare build directory
	buildDir := filepath.Join(c.workDir, build.UserID, build.ID)
	sourceZip := filepath.Join(buildDir, "source.zip")

	// Extract source files
	if err := extractZip(sourceZip, buildDir); err != nil {
		return fmt.Errorf("failed to extract source: %w", err)
	}

	// Create container config
	env := []string{
		fmt.Sprintf("MAIN_FILE=%s", build.MainFile),
		"ENGINE=pdflatex",
	}

	if build.ShellEscape {
		env = append(env, "SHELL_ESCAPE=1")
	}

	// Mount build directory
	mounts := []mount.Mount{
		{
			Type:   mount.TypeBind,
			Source: buildDir,
			Target: "/data",
		},
	}

	// Create tmpfs for compilation
	tmpfs := map[string]string{
		"/tmp": "size=2G,mode=1777",
	}

	// Container config
	resp, err := c.dockerClient.ContainerCreate(ctx, &container.Config{
		Image:      c.imageName,
		WorkingDir: "/data",
		Env:        env,
		Tty:        false,
		OpenStdin:  false,
		Labels: map[string]string{
			"build_id":  build.ID,
			"user_id":   build.UserID,
			"engine":    string(build.Engine),
		},
	}, &container.HostConfig{
		Mounts:     mounts,
		Tmpfs:      tmpfs,
		Memory:     2 * 1024 * 1024 * 1024, // 2GB
		MemorySwap: 2 * 1024 * 1024 * 1024, // No swap
		CPUShares:  512,
		AutoRemove: true,
	}, nil, "")

	if err != nil {
		return fmt.Errorf("failed to create container: %w", err)
	}

	containerID := resp.ID

	// Start container
	if err := c.dockerClient.ContainerStart(ctx, containerID, nil); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	// Wait for completion with timeout
	timeoutCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	statusCh, errCh := c.dockerClient.ContainerWait(timeoutCtx, containerID, container.WaitConditionNotRunning)

	select {
	case err := <-errCh:
		if err != nil {
			logs, _ := c.dockerClient.ContainerLogs(ctx, containerID, nil)
			build.BuildLog = logs.String()
			return fmt.Errorf("container failed: %w", err)
		}
	case <-statusCh:
	}

	// Get logs
	logs, err := c.dockerClient.ContainerLogs(ctx, containerID, nil)
	if err != nil {
		return fmt.Errorf("failed to get logs: %w", err)
	}
	build.BuildLog = logs.String()

	// Check for output
	pdfPath := filepath.Join(buildDir, "output.pdf")
	synctexPath := filepath.Join(buildDir, "output.synctex.gz")

	if _, err := os.Stat(pdfPath); err == nil {
		build.PDFPath = pdfPath
		build.Status = StatusCompleted
	} else {
		build.Status = StatusFailed
		build.ErrorMessage = "PDF not generated"
	}

	if _, err := os.Stat(synctexPath); err == nil {
		build.SyncTeXPath = synctexPath
	}

	// Calculate storage
	build.StorageBytes = calculateDirSize(buildDir)

	build.UpdatedAt = time.Now()

	return nil
}

func extractZip(src, dest string) error {
	reader, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, file := range reader.File {
		path := filepath.Join(dest, file.Name)

		if file.FileInfo().IsDir() {
			os.MkdirAll(path, 0755)
			continue
		}

		os.MkdirAll(filepath.Dir(path), 0755)

		rc, err := file.Open()
		if err != nil {
			return err
		}

		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			rc.Close()
			return err
		}

		_, err = io.Copy(f, rc)
		rc.Close()
		f.Close()

		if err != nil {
			return err
		}
	}

	return nil
}

func calculateDirSize(path string) int64 {
	var size int64
	filepath.Walk(path, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size
}

// CompileWithLatexmk performs compilation using latexmk (Issue #5 - fixed string formatting)
func (c *DockerCompiler) CompileWithLatexmk(build *Build) error {
	ctx := context.Background()

	buildDir := filepath.Join(c.workDir, build.UserID, build.ID)
	
	// Issue #45 - use actual engine from build, not hardcode
	engineFlag := "pdf"
	if build.Engine == EnginePDFLaTeX {
		engineFlag = "pdf"
	} else if build.Engine == EngineXeLaTeX {
		engineFlag = "xex"
	} else if build.Engine == EngineLuaLaTeX {
		engineFlag = "lualatex"
	}

	script := fmt.Sprintf(`#!/bin/bash
set -e
cd /data
unzip -o source.zip
latexmk -%s -interaction=nonstopmode -outdir=output %s
if [ -f output/output.pdf ]; then
    cp output/output.pdf .
fi
if [ -f output/output.synctex.gz ]; then
    cp output/output.synctex.gz .
fi
exit 0
`, engineFlag, build.MainFile)

	// Run container with script
	resp, err := c.dockerClient.ContainerCreate(ctx, &container.Config{
		Image:  c.imageName,
		Cmd:    []string{"bash", "-c", script},
		Labels: map[string]string{
			"build_id": build.ID,
			"user_id":  build.UserID,
		},
	}, &container.HostConfig{
		Mounts: []mount.Mount{
			{
				Type:   mount.TypeBind,
				Source: buildDir,
				Target: "/data",
			},
		},
		Tmpfs: map[string]string{
			"/tmp": "size=2G,mode=1777",
		},
		Memory:     2 * 1024 * 1024 * 1024,
		MemorySwap: 2 * 1024 * 1024 * 1024,
		AutoRemove: true,
	}, nil, "")

	if err != nil {
		return fmt.Errorf("failed to create container: %w", err)
	}

	// Start and wait
	if err := c.dockerClient.ContainerStart(ctx, resp.ID, nil); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	// Wait for completion with timeout (Issue #19 - enforced timeout)
	timeoutCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	statusCh, errCh := c.dockerClient.ContainerWait(timeoutCtx, resp.ID, container.WaitConditionNotRunning)

	select {
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("container error: %w", err)
		}
	case <-timeoutCtx.Done():
		// Container timeout - kill it
		c.dockerClient.ContainerStop(ctx, resp.ID, nil)
		build.Status = StatusFailed
		build.ErrorMessage = "Compilation timeout (exceeded 5 minutes)"
		return fmt.Errorf("compilation timeout")
	case <-statusCh:
		// Normal completion
	}

	// Get logs
	logs, err := c.dockerClient.ContainerLogs(ctx, resp.ID, nil)
	if err != nil {
		return fmt.Errorf("failed to get logs: %w", err)
	}

	// Parse output (Issue #18 - limit log size to prevent DoS)
	const maxLogSize = 10 * 1024 * 1024 // 10MB limit
	var stdout, stderr bytes.Buffer
	stdcopy.StdCopy(&stdout, &stderr, logs)
	logContent := stdout.String() + stderr.String()
	
	if len(logContent) > maxLogSize {
		logContent = logContent[:maxLogSize] + "\n[LOG TRUNCATED - exceeded 10MB]"
	}
	build.BuildLog = logContent

	// Check results
	pdfPath := filepath.Join(buildDir, "output.pdf")
	if _, err := os.Stat(pdfPath); err == nil {
		build.PDFPath = pdfPath
		build.Status = StatusCompleted
	} else {
		build.Status = StatusFailed
		build.ErrorMessage = "PDF not generated"
	}

	// Check for SyncTeX
	synctexPath := filepath.Join(buildDir, "output.synctex.gz")
	if _, err := os.Stat(synctexPath); err == nil {
		build.SyncTeXPath = synctexPath
	}

	build.UpdatedAt = time.Now()
	build.StorageBytes = calculateDirSize(buildDir)

	return nil
}
```

## Build Limits Service (`pkg/build/limits.go`)

```go
package build

import (
	"fmt"
	"time"

	"github.com/athulanoop/treefrog/latex-compiler/pkg/billing"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/user"
)

type LimitService struct {
	buildStore *Store
	userStore  *user.Store
}

func NewLimitService(buildStore *Store, userStore *user.Store) *LimitService {
	return &LimitService{
		buildStore: buildStore,
		userStore:  userStore,
	}
}

func (s *LimitService) CanCreateBuild(userID string) (*LimitCheck, error) {
	userRec, err := s.userStore.GetByClerkID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Check if subscription is paused
	if userRec.SubscriptionPaused {
		return &LimitCheck{
			Allowed:  false,
			Reason:  "subscription_paused",
			Message: "Your subscription is paused. Please update payment method.",
		}, nil
	}

	// Check if subscription is canceled
	if userRec.SubscriptionCanceledAt != nil && time.Now().After(*userRec.SubscriptionCanceledAt) {
		return &LimitCheck{
			Allowed:  false,
			Reason:  "subscription_ended",
			Message: "Your subscription has ended. Please renew to continue.",
		}, nil
	}

	tier := userRec.Tier
	config := billing.Plans[tier]
	if config.MonthlyBuilds == -1 {
		// Unlimited tier
		return &LimitCheck{
			Allowed: true,
			Tier:   tier,
		}, nil
	}

	// Count monthly builds
	monthlyCount, err := s.buildStore.CountMonthly(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count builds: %w", err)
	}

	if monthlyCount >= config.MonthlyBuilds {
		return &LimitCheck{
			Allowed:   false,
			Reason:    "monthly_limit_exceeded",
			Message:   fmt.Sprintf("Monthly build limit reached: %d/%d", monthlyCount, config.MonthlyBuilds),
			Used:      monthlyCount,
			Limit:     config.MonthlyBuilds,
			ResetAt:   s.getMonthlyResetTime(),
		}, nil
	}

	// Count concurrent builds
	concurrentCount, err := s.buildStore.CountActive(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to count concurrent builds: %w", err)
	}

	if concurrentCount >= config.Concurrent {
		return &LimitCheck{
			Allowed:   false,
			Reason:    "concurrent_limit_exceeded",
			Message:   fmt.Sprintf("Concurrent build limit reached: %d/%d", concurrentCount, config.Concurrent),
			Used:      concurrentCount,
			Limit:     config.Concurrent,
		}, nil
	}

	return &LimitCheck{
		Allowed: true,
		Tier:    tier,
		Used:    monthlyCount,
		Limit:   config.MonthlyBuilds,
	}, nil
}

func (s *LimitService) getMonthlyResetTime() time.Time {
	now := time.Now()
	currentMonth := now.Month()
	currentYear := now.Year()

	nextMonth := currentMonth + 1
	if nextMonth > 12 {
		nextMonth = 1
		currentYear++
	}

	return time.Date(currentYear, nextMonth, 1, 0, 0, 0, 0, time.UTC)
}

type LimitCheck struct {
	Allowed   bool       `json:"allowed"`
	Reason    string     `json:"reason,omitempty"`
	Message   string     `json:"message,omitempty"`
	Tier      string     `json:"tier,omitempty"`
	Used      int        `json:"used,omitempty"`
	Limit     int        `json:"limit,omitempty"`
	ResetAt   *time.Time `json:"reset_at,omitempty"`
}

// GetUserUsage returns usage statistics for a user
func (s *LimitService) GetUserUsage(userID string) (*UsageStats, error) {
	userRec, err := s.userStore.GetByClerkID(userID)
	if err != nil {
		return nil, err
	}

	tier := userRec.Tier
	config := billing.Plans[tier]

	monthlyCount, _ := s.buildStore.CountMonthly(userID)
	concurrentCount, _ := s.buildStore.CountActive(userID)
	totalStorage, _ := s.buildStore.GetTotalStorage(userID)

	var monthlyLimit int
	if config.MonthlyBuilds == -1 {
		monthlyLimit = -1
	} else {
		monthlyLimit = config.MonthlyBuilds
	}

	resetTime := s.getMonthlyResetTime()

	return &UsageStats{
		Tier:             tier,
		MonthlyUsed:      monthlyCount,
		MonthlyLimit:     monthlyLimit,
		MonthlyResetAt:   &resetTime,
		ConcurrentUsed:   concurrentCount,
		ConcurrentLimit:   config.Concurrent,
		StorageUsedGB:     float64(totalStorage) / (1024 * 1024 * 1024),
		StorageLimitGB:    float64(config.StorageGB),
	}, nil
}

type UsageStats struct {
	Tier              string     `json:"tier"`
	MonthlyUsed       int        `json:"monthly_used"`
	MonthlyLimit      int        `json:"monthly_limit"`
	MonthlyResetAt    *time.Time `json:"monthly_reset_at,omitempty"`
	ConcurrentUsed     int        `json:"concurrent_used"`
	ConcurrentLimit    int        `json:"concurrent_limit"`
	StorageUsedGB      float64    `json:"storage_used_gb"`
	StorageLimitGB     float64    `json:"storage_limit_gb"`
}
```

## Error Types and Better Error Handling (Issue #46)

### Error Types (`pkg/errors/errors.go`)

```go
package errors

import "fmt"

// ErrorCode defines error types for API responses
type ErrorCode string

const (
	ErrInvalidInput       ErrorCode = "invalid_input"
	ErrNotFound           ErrorCode = "not_found"
	ErrUnauthorized       ErrorCode = "unauthorized"
	ErrForbidden          ErrorCode = "forbidden"
	ErrConflict           ErrorCode = "conflict"
	ErrRateLimited        ErrorCode = "rate_limited"
	ErrServerError        ErrorCode = "server_error"
	ErrLimitExceeded      ErrorCode = "limit_exceeded"
	ErrCompilationFailed  ErrorCode = "compilation_failed"
	ErrStorageExceeded    ErrorCode = "storage_exceeded"
	ErrDiskSpaceExceeded  ErrorCode = "disk_space_exceeded"
)

// AppError is a structured application error
type AppError struct {
	Code      ErrorCode `json:"code"`
	Message   string    `json:"message"`
	Details   string    `json:"details,omitempty"`
	StatusCode int       `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s: %s", e.Code, e.Message, e.Details)
}

// NewAppError creates a new application error
func NewAppError(code ErrorCode, message string, details string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Details:    details,
		StatusCode: statusCode,
	}
}

// Common error constructors
func InvalidInput(message string) *AppError {
	return NewAppError(ErrInvalidInput, message, "", 400)
}

func NotFound(resource string) *AppError {
	return NewAppError(ErrNotFound, fmt.Sprintf("%s not found", resource), "", 404)
}

func Unauthorized() *AppError {
	return NewAppError(ErrUnauthorized, "Authentication required", "", 401)
}

func Forbidden() *AppError {
	return NewAppError(ErrForbidden, "Access denied", "", 403)
}

func RateLimited() *AppError {
	return NewAppError(ErrRateLimited, "Rate limit exceeded", "", 429)
}

func LimitExceeded(resource string) *AppError {
	return NewAppError(ErrLimitExceeded, fmt.Sprintf("%s limit exceeded", resource), "", 403)
}

func ServerError(details string) *AppError {
	return NewAppError(ErrServerError, "Internal server error", details, 500)
}
```

### Structured Logging (`pkg/log/logger.go`)

```go
package log

import (
	"encoding/json"
	"fmt"
	"os"
	"time"
)

// LogLevel defines log severity
type LogLevel string

const (
	Debug   LogLevel = "DEBUG"
	Info    LogLevel = "INFO"
	Warning LogLevel = "WARNING"
	Error   LogLevel = "ERROR"
	Fatal   LogLevel = "FATAL"
)

// StructuredLogger provides JSON structured logging (Issue #47)
type StructuredLogger struct {
	name string
}

// LogEntry is a structured log entry
type LogEntry struct {
	Timestamp string            `json:"timestamp"`
	Level     LogLevel          `json:"level"`
	Logger    string            `json:"logger"`
	Message   string            `json:"message"`
	Fields    map[string]interface{} `json:"fields,omitempty"`
	Error     string            `json:"error,omitempty"`
}

// NewLogger creates a new structured logger
func NewLogger(name string) *StructuredLogger {
	return &StructuredLogger{name: name}
}

// Log writes a log entry
func (l *StructuredLogger) log(level LogLevel, message string, fields map[string]interface{}, err error) {
	entry := LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
		Level:     level,
		Logger:    l.name,
		Message:   message,
		Fields:    fields,
	}

	if err != nil {
		entry.Error = err.Error()
	}

	// Output as JSON
	data, _ := json.Marshal(entry)
	fmt.Fprintln(os.Stdout, string(data))
}

func (l *StructuredLogger) Debug(message string, fields map[string]interface{}) {
	l.log(Debug, message, fields, nil)
}

func (l *StructuredLogger) Info(message string, fields map[string]interface{}) {
	l.log(Info, message, fields, nil)
}

func (l *StructuredLogger) Warning(message string, fields map[string]interface{}) {
	l.log(Warning, message, fields, nil)
}

func (l *StructuredLogger) Error(message string, fields map[string]interface{}, err error) {
	l.log(Error, message, fields, err)
}

// Audit logging for compliance (Issue #22)
type AuditLogger struct {
	logger *StructuredLogger
}

func NewAuditLogger() *AuditLogger {
	return &AuditLogger{
		logger: NewLogger("audit"),
	}
}

func (al *AuditLogger) LogAction(userID string, action string, resourceType string, resourceID string, details map[string]interface{}) {
	fields := map[string]interface{}{
		"user_id":        userID,
		"action":         action,
		"resource_type":  resourceType,
		"resource_id":    resourceID,
		"details":        details,
	}
	al.logger.Info(fmt.Sprintf("User action: %s on %s", action, resourceType), fields)
}
```

## Error Handling in Handlers

### Build Handlers

```go
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/athulanoop/treefrog/latex-compiler/pkg/auth"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/build"
	"github.com/gorilla/mux"
)

func createBuildHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Issue #9 - input validation on file size
	if err := r.ParseMultipartForm(build.MaxFileSize); err != nil {
		http.Error(w, fmt.Sprintf("File too large (max %dMB)", build.MaxFileSize/(1024*1024)), http.StatusBadRequest)
		return
	}

	// Get build options
	engine := build.Engine(r.FormValue("engine"))
	mainFile := r.FormValue("main_file")
	shellEscape := r.FormValue("shell_escape") == "true"

	if engine == "" {
		engine = build.EnginePDFLaTeX
	}
	if mainFile == "" {
		mainFile = "main.tex"
	}

	// Validate input (Issue #9)
	if !build.ValidEngines[string(engine)] {
		http.Error(w, "Invalid engine", http.StatusBadRequest)
		return
	}

	if build.contains(mainFile, "..") || build.contains(mainFile, "/") {
		http.Error(w, "Invalid main_file: path traversal not allowed", http.StatusBadRequest)
		return
	}

	// Check disk space before accepting build (Issue #37)
	workDir := os.Getenv("COMPILER_WORKDIR")
	if err := checkDiskSpace(workDir, 500*1024*1024); err != nil { // Need 500MB free
		http.Error(w, "Server disk space insufficient", http.StatusServiceUnavailable)
		return
	}

	// Check limits
	buildStore := build.NewStore()
	userStore := user.NewStore(db)
	limitService := build.NewLimitService(buildStore, userStore)

	limitCheck, err := limitService.CanCreateBuild(userID)
	if err != nil {
		log.Printf("Limit check failed: %v", err)
		http.Error(w, "Failed to check limits", http.StatusInternalServerError)
		return
	}

	if !limitCheck.Allowed {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(limitCheck)
		return
	}

	// Generate build ID
	buildID := fmt.Sprintf("bld_%d", time.Now().UnixNano())

	// Create build directory
	buildDir := filepath.Join(workDir, userID, buildID)

	if err := os.MkdirAll(buildDir, 0755); err != nil {
		log.Printf("Failed to create build directory: %v", err)
		http.Error(w, "Failed to create build directory", http.StatusInternalServerError)
		return
	}

	// Save uploaded file
	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		log.Printf("Failed to get file: %v", err)
		http.Error(w, "No file uploaded", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Validate file size (Issue #9)
	if fileHeader.Size > build.MaxFileSize {
		http.Error(w, fmt.Sprintf("File too large (max %dMB)", build.MaxFileSize/(1024*1024)), http.StatusBadRequest)
		return
	}

	zipPath := filepath.Join(buildDir, "source.zip")
	dst, err := os.Create(zipPath)
	if err != nil {
		log.Printf("Failed to create zip file: %v", err)
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		log.Printf("Failed to save zip: %v", err)
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// Create build record
	buildRec := &build.Build{
		ID:             buildID,
		UserID:         userID,
		Status:         build.StatusPending,
		Engine:         engine,
		MainFile:       mainFile,
		DirPath:        buildDir,
		ShellEscape:    shellEscape && shellEscapeAllowed, // Disable shell escape by default for security
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
		ExpiresAt:      time.Now().Add(24 * time.Hour),
		LastAccessedAt: time.Now(),
		StorageBytes:   0,
	}

	// Validate build (Issue #9)
	if err := buildRec.Validate(); err != nil {
		http.Error(w, fmt.Sprintf("Invalid build: %v", err), http.StatusBadRequest)
		return
	}

	if err := buildStore.Create(buildRec); err != nil {
		log.Printf("Failed to create build record: %v", err)
		http.Error(w, "Failed to create build", http.StatusInternalServerError)
		return
	}

	// Queue build for compilation (Issue #8 - job queue)
	buildQueue.Enqueue(buildRec)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(build.BuildResponse{
		ID:        buildRec.ID,
		Status:    buildRec.Status,
		Engine:    buildRec.Engine,
		MainFile:  buildRec.MainFile,
		CreatedAt: buildRec.CreatedAt,
		ExpiresAt: buildRec.ExpiresAt,
	})
}

// Issue #26 - list builds endpoint with pagination
func listBuildsHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get pagination parameters with validation
	page := 1
	pageSize := 20
	if p := r.URL.Query().Get("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if ps := r.URL.Query().Get("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}

	buildStore := build.NewStore()
	
	// Get total count
	total, err := buildStore.CountByUser(userID)
	if err != nil {
		http.Error(w, "Failed to get builds", http.StatusInternalServerError)
		return
	}

	// Get paginated results
	builds, err := buildStore.ListByUser(userID, page, pageSize)
	if err != nil {
		http.Error(w, "Failed to get builds", http.StatusInternalServerError)
		return
	}

	totalPages := (total + pageSize - 1) / pageSize
	var responses []build.BuildResponse
	for _, b := range builds {
		responses = append(responses, build.BuildResponse{
			ID:        b.ID,
			Status:    b.Status,
			Engine:    b.Engine,
			MainFile:  b.MainFile,
			CreatedAt: b.CreatedAt,
			ExpiresAt: b.ExpiresAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(build.BuildListResponse{
		Builds:     responses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

// Helper to check disk space (Issue #37)
func checkDiskSpace(path string, required int64) error {
	// Implementation using syscall.Statfs
	return nil
}

// Constants (Issue #48 - magic numbers as constants)
const shellEscapeAllowed = false

func getBuildHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	buildID := vars["id"]

	buildStore := build.NewStore()
	buildRec, err := buildStore.Get(buildID)
	if err != nil {
		http.Error(w, "Build not found", http.StatusNotFound)
		return
	}

	// STRICT USER ISOLATION
	if buildRec.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Update last accessed
	buildRec.LastAccessedAt = time.Now()
	buildStore.Update(buildRec)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(buildRec)
}

func getStatusHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	buildID := vars["id"]

	buildStore := build.NewStore()
	buildRec, err := buildStore.Get(buildID)
	if err != nil {
		http.Error(w, "Build not found", http.StatusNotFound)
		return
	}

	// STRICT USER ISOLATION
	if buildRec.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	response := build.StatusResponse{
		ID:        buildRec.ID,
		Status:    buildRec.Status,
		Engine:    buildRec.Engine,
		CreatedAt: buildRec.CreatedAt,
	}

	if buildRec.Status == build.StatusCompleted {
		response.Progress = 100
		response.CompletedAt = &buildRec.UpdatedAt
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func deleteBuildHandler(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	vars := mux.Vars(r)
	buildID := vars["id"]

	buildStore := build.NewStore()
	buildRec, err := buildStore.Get(buildID)
	if err != nil {
		http.Error(w, "Build not found", http.StatusNotFound)
		return
	}

	// STRICT USER ISOLATION
	if buildRec.UserID != userID {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Soft delete
	buildRec.Status = build.StatusDeleted
	buildRec.ExpiresAt = time.Now()
	buildStore.Update(buildRec)

	// Async hard delete
	go func() {
		os.RemoveAll(buildRec.DirPath)
		buildStore.Delete(buildRec.ID)
	}()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "deleted",
		"message": "Build will be permanently deleted shortly",
	})
}

func compileBuild(buildRec *build.Build) {
	// Get Docker compiler
	compiler, err := build.NewDockerCompiler(
		"treefrog-local-latex-compiler:latest",
		os.Getenv("COMPILER_WORKDIR"),
	)
	if err != nil {
		log.Printf("Failed to create compiler: %v", err)
		buildRec.Status = build.StatusFailed
		buildRec.ErrorMessage = "Compiler initialization failed"
		return
	}

	// Update status
	buildRec.Status = build.StatusCompiling
	build.NewStore().Update(buildRec)

	// Compile
	if err := compiler.CompileWithLatexmk(buildRec); err != nil {
		log.Printf("Compilation failed: %v", err)
		buildRec.Status = build.StatusFailed
		buildRec.ErrorMessage = err.Error()
	}

	buildRec.UpdatedAt = time.Now()
	build.NewStore().Update(buildRec)
}
```

## Docker Configuration

### Dockerfile

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY . .
RUN go build -o latex-compiler ./cmd/server

# Runtime stage
FROM texlive/texlive:latest AS runtime

WORKDIR /app

# Copy binary
COPY --from=builder /app/latex-compiler /app/latex-compiler

# Create non-root user
RUN useradd -m appuser
USER appuser

# Default command
CMD ["/app/latex-compiler"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  latex-compiler:
    build: ./latex-compiler
    ports:
      - "9000:9000"
    volumes:
      - ./builds:/tmp/treefrog-builds
      - ./data:/app/data
    environment:
      - COMPILER_WORKDIR=/tmp/treefrog-builds
      - DATABASE_URL=/app/data/treefrog.db
      - CLERK_SECRET_KEY=${CLERK_SECRET_KEY}
      - RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}
      - RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 1G
    tmpfs:
      - /tmp:size=2G,mode=1777
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:9000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Tasks Checklist

- [ ] Create build types and status enums
- [ ] Implement build limits service
- [ ] Set up Docker compiler service
- [ ] Create build handler
- [ ] Implement file upload
- [ ] Set up LaTeX compilation with Docker
- [ ] Create build status tracking
- [ ] Enforce strict user isolation
- [ ] Add build counter service
- [ ] Test limits enforcement

## Next Steps

Proceed to [Phase 4: Security](04-security.md) to add signed URLs and rate limiting.
