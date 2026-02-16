package build

import (
	"database/sql"
	"fmt"
	"log"
	"sync"
	"time"

	buildpkg "github.com/alpha-og/treefrog/packages/go/build"
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
	Build       *buildpkg.Build
	Status      JobStatus
	Retries     int
	MaxRetries  int
	Error       error
	CreatedAt   time.Time
	StartedAt   *time.Time
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
	compiler buildpkg.Compiler
	store    *Store
	done     chan struct{}
}

// NewQueue creates a new build queue with worker pool (Issue #8)
func NewQueue(numWorkers int, compiler buildpkg.Compiler, store *Store) *Queue {
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
func (q *Queue) Enqueue(build *buildpkg.Build) error {
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

// GetStore returns the underlying Store for direct access to builds
func (q *Queue) GetStore() *Store {
	return q.store
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

	// Update status to compiling when worker starts
	job.Build.Status = buildpkg.StatusCompiling
	job.Build.UpdatedAt = time.Now()
	if err := w.store.Update(job.Build); err != nil {
		log.Printf("Failed to update build status to compiling: %v", err)
	}

	// If compiler is nil (not yet initialized), we skip compilation
	// This happens during queue initialization before Docker is ready
	if w.compiler == nil {
		log.Printf("Warning: Compiler not initialized for worker %d, skipping build %s", w.id, job.Build.ID)
		job.Status = JobFailed
		job.Error = fmt.Errorf("compiler not initialized")
		job.Build.Status = buildpkg.StatusFailed
		job.Build.ErrorMessage = "Compiler not initialized"
	} else if err := w.compiler.Compile(job.Build); err != nil {
		log.Printf("Compilation failed: %v", err)

		// Retry logic (Issue #20)
		if job.Retries < job.MaxRetries {
			job.Retries++
			job.Error = err

			// Update status to retrying so client can see progress
			job.Build.Status = buildpkg.StatusRetrying
			job.Build.ErrorMessage = fmt.Sprintf("Attempt %d/%d failed: %v. Retrying...", job.Retries, job.MaxRetries, err)
			job.Build.UpdatedAt = time.Now()
			if updateErr := w.store.Update(job.Build); updateErr != nil {
				log.Printf("Failed to update build status to retrying: %v", updateErr)
			}

			// Re-enqueue job after backoff
			backoff := time.Duration(job.Retries) * 30 * time.Second
			log.Printf("Waiting %v before retry %d/%d for build %s", backoff, job.Retries, job.MaxRetries, job.Build.ID)
			time.Sleep(backoff)
			log.Printf("Retrying build %s (attempt %d/%d)", job.Build.ID, job.Retries, job.MaxRetries)

			job.Status = JobPending
			w.queue <- job
			return
		}

		job.Status = JobFailed
		job.Build.Status = buildpkg.StatusFailed
		job.Build.ErrorMessage = fmt.Sprintf("Compilation failed after %d retries: %v", job.MaxRetries, err)
	} else {
		job.Status = JobCompleted
		job.Build.Status = buildpkg.StatusCompleted
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
	if q.store == nil || q.store.db == nil {
		return JobPending, nil
	}

	var status string
	err := q.store.db.QueryRow(
		"SELECT status FROM builds WHERE id = $1",
		buildID,
	).Scan(&status)
	if err != nil {
		if err == sql.ErrNoRows {
			return JobPending, nil
		}
		return JobPending, err
	}

	switch status {
	case string(buildpkg.StatusCompleted):
		return JobCompleted, nil
	case string(buildpkg.StatusFailed):
		return JobFailed, nil
	case string(buildpkg.StatusCompiling):
		return JobProcessing, nil
	default:
		return JobPending, nil
	}
}

// Store manages build persistence using database
type Store struct {
	db *sql.DB
	mu sync.RWMutex
}

// NewStore creates a new build store backed by database
// Note: db can be nil for in-memory operation (for testing)
func NewStore() *Store {
	return &Store{
		db: nil, // To be initialized separately
	}
}

// InitStore initializes a Store with a database connection
func NewStoreWithDB(db *sql.DB) *Store {
	return &Store{
		db: db,
	}
}

// Create creates a new build record in the database
func (s *Store) Create(build *buildpkg.Build) error {
	if s.db == nil {
		return fmt.Errorf("store not initialized with database")
	}

	query := `
	INSERT INTO builds (id, user_id, status, engine, main_file, dir_path, pdf_path, synctex_path, 
		build_log, error_message, shell_escape, created_at, updated_at, expires_at, last_accessed_at, storage_bytes, deleted_at)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NULL)
	`

	_, err := s.db.Exec(query,
		build.ID,
		build.UserID,
		build.Status,
		build.Engine,
		build.MainFile,
		build.DirPath,
		build.PDFPath,
		build.SyncTeXPath,
		build.BuildLog,
		build.ErrorMessage,
		build.ShellEscape,
		build.CreatedAt,
		build.UpdatedAt,
		build.ExpiresAt,
		build.LastAccessedAt,
		build.StorageBytes,
	)

	return err
}

// Get retrieves a build by ID
func (s *Store) Get(id string) (*buildpkg.Build, error) {
	if s.db == nil {
		return nil, fmt.Errorf("store not initialized with database")
	}

	query := `
	SELECT id, user_id, status, engine, main_file, dir_path, pdf_path, synctex_path,
		build_log, error_message, shell_escape, created_at, updated_at, expires_at, last_accessed_at, storage_bytes, deleted_at
	FROM builds WHERE id = $1
	`

	var b buildpkg.Build
	err := s.db.QueryRow(query, id).Scan(
		&b.ID,
		&b.UserID,
		&b.Status,
		&b.Engine,
		&b.MainFile,
		&b.DirPath,
		&b.PDFPath,
		&b.SyncTeXPath,
		&b.BuildLog,
		&b.ErrorMessage,
		&b.ShellEscape,
		&b.CreatedAt,
		&b.UpdatedAt,
		&b.ExpiresAt,
		&b.LastAccessedAt,
		&b.StorageBytes,
		&b.DeletedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("build not found")
		}
		return nil, err
	}

	return &b, nil
}

// Update updates a build record in the database
func (s *Store) Update(build *buildpkg.Build) error {
	if s.db == nil {
		return fmt.Errorf("store not initialized with database")
	}

	query := `
	UPDATE builds 
	SET status = $1, pdf_path = $2, synctex_path = $3, build_log = $4, error_message = $5, 
		updated_at = $6, last_accessed_at = $7, storage_bytes = $8
	WHERE id = $9
	`

	_, err := s.db.Exec(query,
		build.Status,
		build.PDFPath,
		build.SyncTeXPath,
		build.BuildLog,
		build.ErrorMessage,
		build.UpdatedAt,
		build.LastAccessedAt,
		build.StorageBytes,
		build.ID,
	)

	return err
}

// Delete deletes a build record from the database
func (s *Store) Delete(id string) error {
	if s.db == nil {
		return fmt.Errorf("store not initialized with database")
	}

	now := time.Now()
	query := `UPDATE builds SET deleted_at = $1, status = $2 WHERE id = $3`
	_, err := s.db.Exec(query, now, buildpkg.StatusDeleted, id)
	return err
}

// ListByUser lists builds for a user with pagination
func (s *Store) ListByUser(userID string, page, pageSize int) ([]*buildpkg.Build, error) {
	if s.db == nil {
		return nil, fmt.Errorf("store not initialized with database")
	}

	offset := (page - 1) * pageSize
	query := `
	SELECT id, user_id, status, engine, main_file, dir_path, pdf_path, synctex_path,
		build_log, error_message, shell_escape, created_at, updated_at, expires_at, last_accessed_at, storage_bytes, deleted_at
	FROM builds 
	WHERE user_id = $1 AND deleted_at IS NULL
	ORDER BY created_at DESC
	LIMIT $2 OFFSET $3
	`

	rows, err := s.db.Query(query, userID, pageSize, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var builds []*buildpkg.Build
	for rows.Next() {
		var b buildpkg.Build
		err := rows.Scan(
			&b.ID,
			&b.UserID,
			&b.Status,
			&b.Engine,
			&b.MainFile,
			&b.DirPath,
			&b.PDFPath,
			&b.SyncTeXPath,
			&b.BuildLog,
			&b.ErrorMessage,
			&b.ShellEscape,
			&b.CreatedAt,
			&b.UpdatedAt,
			&b.ExpiresAt,
			&b.LastAccessedAt,
			&b.StorageBytes,
			&b.DeletedAt,
		)
		if err != nil {
			return nil, err
		}
		builds = append(builds, &b)
	}

	return builds, rows.Err()
}

// CountByUser counts total non-deleted builds for a user
func (s *Store) CountByUser(userID string) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("store not initialized with database")
	}

	query := `SELECT COUNT(*) FROM builds WHERE user_id = $1 AND deleted_at IS NULL`
	var count int
	err := s.db.QueryRow(query, userID).Scan(&count)
	return count, err
}

// CountMonthly counts monthly builds for a user (created in current month)
func (s *Store) CountMonthly(userID string) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("store not initialized with database")
	}

	// Get first day of current month
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	query := `
	SELECT COUNT(*) FROM builds 
	WHERE user_id = $1 AND created_at >= $2 AND deleted_at IS NULL
	`

	var count int
	err := s.db.QueryRow(query, userID, startOfMonth).Scan(&count)
	return count, err
}

// CountActive counts active (pending or compiling) builds for a user
func (s *Store) CountActive(userID string) (int, error) {
	if s.db == nil {
		return 0, fmt.Errorf("store not initialized with database")
	}

	query := `
	SELECT COUNT(*) FROM builds 
	WHERE user_id = $1 AND (status = $2 OR status = $3)
	`

	var count int
	err := s.db.QueryRow(query, userID, buildpkg.StatusPending, buildpkg.StatusCompiling).Scan(&count)
	return count, err
}

// GetTotalStorage gets total storage used by a user's non-deleted builds
func (s *Store) GetTotalStorage(userID string) (int64, error) {
	if s.db == nil {
		return 0, fmt.Errorf("store not initialized with database")
	}

	query := `
	SELECT COALESCE(SUM(storage_bytes), 0) FROM builds 
	WHERE user_id = $1 AND deleted_at IS NULL
	`

	var total int64
	err := s.db.QueryRow(query, userID).Scan(&total)
	return total, err
}

// FindExpiredBefore finds builds that expired before the given time
func (s *Store) FindExpiredBefore(before time.Time) ([]*buildpkg.Build, error) {
	query := `
	SELECT id, user_id, status, engine, main_file, dir_path, pdf_path, 
	       synctex_path, build_log, error_message, shell_escape, 
	       created_at, updated_at, expires_at, last_accessed_at, storage_bytes, deleted_at
	FROM builds
	WHERE expires_at < $1 AND deleted_at IS NULL AND status != $2
	ORDER BY created_at ASC
	`

	rows, err := s.db.Query(query, before, buildpkg.StatusExpired)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var builds []*buildpkg.Build
	for rows.Next() {
		b := &buildpkg.Build{}
		err := rows.Scan(&b.ID, &b.UserID, &b.Status, &b.Engine, &b.MainFile,
			&b.DirPath, &b.PDFPath, &b.SyncTeXPath, &b.BuildLog, &b.ErrorMessage,
			&b.ShellEscape, &b.CreatedAt, &b.UpdatedAt, &b.ExpiresAt,
			&b.LastAccessedAt, &b.StorageBytes, &b.DeletedAt)
		if err != nil {
			return nil, err
		}
		builds = append(builds, b)
	}

	return builds, rows.Err()
}

// FindOldest finds the oldest N builds by creation time
func (s *Store) FindOldest(limit int) ([]*buildpkg.Build, error) {
	query := `
	SELECT id, user_id, status, engine, main_file, dir_path, pdf_path, 
	       synctex_path, build_log, error_message, shell_escape, 
	       created_at, updated_at, expires_at, last_accessed_at, storage_bytes, deleted_at
	FROM builds
	WHERE deleted_at IS NULL AND status != $1
	ORDER BY created_at ASC
	LIMIT $2
	`

	rows, err := s.db.Query(query, buildpkg.StatusExpired, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var builds []*buildpkg.Build
	for rows.Next() {
		b := &buildpkg.Build{}
		err := rows.Scan(&b.ID, &b.UserID, &b.Status, &b.Engine, &b.MainFile,
			&b.DirPath, &b.PDFPath, &b.SyncTeXPath, &b.BuildLog, &b.ErrorMessage,
			&b.ShellEscape, &b.CreatedAt, &b.UpdatedAt, &b.ExpiresAt,
			&b.LastAccessedAt, &b.StorageBytes, &b.DeletedAt)
		if err != nil {
			return nil, err
		}
		builds = append(builds, b)
	}

	return builds, rows.Err()
}

// FindExpiringIn finds builds expiring within the given duration
func (s *Store) FindExpiringIn(duration time.Duration) ([]*buildpkg.Build, error) {
	expireBefore := time.Now().Add(duration)

	query := `
	SELECT id, user_id, status, engine, main_file, dir_path, pdf_path, 
	       synctex_path, build_log, error_message, shell_escape, 
	       created_at, updated_at, expires_at, last_accessed_at, storage_bytes, deleted_at
	FROM builds
	WHERE expires_at < $1 AND expires_at > $2 AND deleted_at IS NULL AND status != $3
	ORDER BY expires_at ASC
	`

	rows, err := s.db.Query(query, expireBefore, time.Now(), buildpkg.StatusExpired)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var builds []*buildpkg.Build
	for rows.Next() {
		b := &buildpkg.Build{}
		err := rows.Scan(&b.ID, &b.UserID, &b.Status, &b.Engine, &b.MainFile,
			&b.DirPath, &b.PDFPath, &b.SyncTeXPath, &b.BuildLog, &b.ErrorMessage,
			&b.ShellEscape, &b.CreatedAt, &b.UpdatedAt, &b.ExpiresAt,
			&b.LastAccessedAt, &b.StorageBytes, &b.DeletedAt)
		if err != nil {
			return nil, err
		}
		builds = append(builds, b)
	}

	return builds, rows.Err()
}

// FindOldestByUser finds the oldest N builds for a specific user
func (s *Store) FindOldestByUser(userID string, limit int) ([]*buildpkg.Build, error) {
	query := `
	SELECT id, user_id, status, engine, main_file, dir_path, pdf_path, 
	       synctex_path, build_log, error_message, shell_escape, 
	       created_at, updated_at, expires_at, last_accessed_at, storage_bytes, deleted_at
	FROM builds
	WHERE user_id = $1 AND deleted_at IS NULL AND status != $2
	ORDER BY created_at ASC
	LIMIT $3
	`

	rows, err := s.db.Query(query, userID, buildpkg.StatusExpired, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var builds []*buildpkg.Build
	for rows.Next() {
		b := &buildpkg.Build{}
		err := rows.Scan(&b.ID, &b.UserID, &b.Status, &b.Engine, &b.MainFile,
			&b.DirPath, &b.PDFPath, &b.SyncTeXPath, &b.BuildLog, &b.ErrorMessage,
			&b.ShellEscape, &b.CreatedAt, &b.UpdatedAt, &b.ExpiresAt,
			&b.LastAccessedAt, &b.StorageBytes, &b.DeletedAt)
		if err != nil {
			return nil, err
		}
		builds = append(builds, b)
	}

	return builds, rows.Err()
}

// GetAllIDs retrieves all build IDs from the database
func (s *Store) GetAllIDs() ([]string, error) {
	query := `SELECT id FROM builds WHERE deleted_at IS NULL AND status != $1`

	rows, err := s.db.Query(query, buildpkg.StatusExpired)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	return ids, rows.Err()
}

// CountAll returns the total number of non-deleted, non-expired builds
func (s *Store) CountAll() (int64, error) {
	if s.db == nil {
		return 0, fmt.Errorf("store not initialized with database")
	}

	query := `SELECT COUNT(*) FROM builds WHERE deleted_at IS NULL AND status != $1`
	var count int64
	err := s.db.QueryRow(query, buildpkg.StatusExpired).Scan(&count)
	return count, err
}

// CountAllMonthly returns the total number of builds created this month
func (s *Store) CountAllMonthly() (int64, error) {
	if s.db == nil {
		return 0, fmt.Errorf("store not initialized with database")
	}

	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	query := `SELECT COUNT(*) FROM builds WHERE created_at >= $1 AND deleted_at IS NULL`
	var count int64
	err := s.db.QueryRow(query, startOfMonth).Scan(&count)
	return count, err
}

// CountAllActive returns the total number of active (pending or compiling) builds
func (s *Store) CountAllActive() (int64, error) {
	if s.db == nil {
		return 0, fmt.Errorf("store not initialized with database")
	}

	query := `SELECT COUNT(*) FROM builds WHERE status IN ($1, $2) AND deleted_at IS NULL`
	var count int64
	err := s.db.QueryRow(query, buildpkg.StatusPending, buildpkg.StatusCompiling).Scan(&count)
	return count, err
}

// GetTotalStorageAll returns the total storage used by all non-deleted builds
func (s *Store) GetTotalStorageAll() (int64, error) {
	if s.db == nil {
		return 0, fmt.Errorf("store not initialized with database")
	}

	query := `SELECT COALESCE(SUM(storage_bytes), 0) FROM builds WHERE deleted_at IS NULL`
	var total int64
	err := s.db.QueryRow(query).Scan(&total)
	return total, err
}
