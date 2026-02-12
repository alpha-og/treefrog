# Phase 5: Cache & Cleanup

## Overview

This phase covers:
- Cleanup engine for periodic tasks
- TTL-based build expiration
- Disk space monitoring
- Startup/shutdown cleanup

## Cleanup Engine (`pkg/cleanup/engine.go`)

```go
package cleanup

import (
	"log"
	"os"
	"time"
)

type Config struct {
	Interval       time.Duration
	TTL            time.Duration
	GracePeriod    time.Duration
	WorkDir        string
	DiskWarning    int
	DiskCritical   int
	DiskEmergency  int
}

type Engine struct {
	ticker  *time.Ticker
	cleanup *Service
	done    chan struct{}
}

func NewEngine(cfg Config) *Engine {
	return &Engine{
		ticker:  time.NewTicker(cfg.Interval),
		cleanup: NewService(cfg),
		done:    make(chan struct{}),
	}
}

func (e *Engine) Start() {
	go func() {
		log.Println("Cleanup engine started")

		// Run initial cleanup on startup
		log.Println("Running initial cleanup...")
		e.cleanup.Run()

		for {
			select {
			case <-e.ticker.C:
				log.Println("Running scheduled cleanup...")
				e.cleanup.Run()
			case <-e.done:
				log.Println("Cleanup engine stopped")
				return
			}
		}
	}()
}

func (e *Engine) Stop() {
	close(e.done)
	e.ticker.Stop()
}

func (e *Engine) ForceRun() {
	e.cleanup.Run()
}
```

## Cleanup Service (`pkg/cleanup/service.go`)

```go
package cleanup

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/athulanoop/treefrog/latex-compiler/pkg/build"
	"github.com/athulanoop/treefrog/latex-compiler/pkg/user"
)

// DiskStats holds disk usage information (Issue #37, #36)
type DiskStats struct {
	Total      uint64
	Free       uint64
	Used       uint64
	UsedPercent float64
}

type Service struct {
	config     Config
	buildStore *build.Store
	userStore  *user.Store
	cleanupMu  sync.Mutex // Prevent concurrent cleanup (Issue #12)
}

func NewService(cfg Config) *Service {
	return &Service{
		config:     cfg,
		buildStore: build.NewStore(),
		userStore:  user.NewStore(),
	}
}

func (s *Service) Run() {
	// Use lock to prevent concurrent cleanup execution (Issue #12 - distributed cleanup)
	if !s.cleanupMu.TryLock() {
		log.Println("Cleanup already running, skipping this cycle")
		return
	}
	defer s.cleanupMu.Unlock()

	log.Println("Starting cleanup cycle...")

	// Run all cleanup tasks
	s.expireOldBuilds()
	s.hardDeleteExpired()
	s.checkDiskSpace() // Issue #37 - pre-build disk check
	s.cleanOrphanedFiles()
	s.cleanupStorageQuotas() // Issue #21 - enforce storage quotas
	s.updateUserStorageUsage() // Issue #21 - track storage usage

	log.Println("Cleanup cycle completed")
}

func (s *Service) expireOldBuilds() error {
	cutoff := time.Now().Add(-s.config.TTL)

	expired, err := s.buildStore.FindExpiredBefore(cutoff)
	if err != nil {
		return fmt.Errorf("failed to find expired builds: %w", err)
	}

	for _, b := range expired {
		log.Printf("Expiring build %s (created: %s)", b.ID, b.CreatedAt)

		b.Status = build.StatusExpired
		b.ExpiresAt = time.Now().Add(s.config.GracePeriod)
		s.buildStore.Update(b)
	}

	log.Printf("Expired %d builds", len(expired))
	return nil
}

func (s *Service) hardDeleteExpired() {
	now := time.Now()

	expired, err := s.buildStore.FindExpiredBefore(now)
	if err != nil {
		log.Printf("Failed to find expired builds for deletion: %v", err)
		return
	}

	for _, b := range expired {
		log.Printf("Hard deleting build %s", b.ID)

		// Remove files
		if err := os.RemoveAll(b.DirPath); err != nil {
			log.Printf("Failed to remove build directory: %v", err)
		}

		// Remove from database
		if err := s.buildStore.Delete(b.ID); err != nil {
			log.Printf("Failed to delete build record: %v", err)
		}
	}

	log.Printf("Hard deleted %d expired builds", len(expired))
}

// Issue #37 - pre-build disk space check
func (s *Service) checkDiskSpace() error {
	stats, err := getDiskStats(s.config.WorkDir)
	if err != nil {
		return fmt.Errorf("failed to get disk usage: %w", err)
	}

	percent := stats.UsedPercent

	switch {
	case percent >= float64(s.config.DiskEmergency):
		log.Printf("EMERGENCY: Disk usage at %.1f%%", percent)
		s.emergencyCleanup()
		s.notifyAdmin("EMERGENCY: Disk usage critical", percent)
		return fmt.Errorf("disk space emergency")

	case percent >= float64(s.config.DiskCritical):
		log.Printf("CRITICAL: Disk usage at %.1f%%", percent)
		s.aggressiveCleanup()
		s.notifyAdmin("CRITICAL: Disk usage high", percent)
		return fmt.Errorf("disk space critical")

	case percent >= float64(s.config.DiskWarning):
		log.Printf("WARNING: Disk usage at %.1f%%", percent)
		s.notifyAdmin("WARNING: Disk usage elevated", percent)

	default:
		log.Printf("Disk usage normal: %.1f%%", percent)
	}

	return nil
}

// Issue #37 - get disk statistics using syscall (not os.DiskUsage which doesn't exist)
func getDiskStats(path string) (*DiskStats, error) {
	var stat syscall.Statfs_t
	err := syscall.Statfs(path, &stat)
	if err != nil {
		return nil, fmt.Errorf("statfs failed: %w", err)
	}

	// Calculate sizes
	total := stat.Blocks * uint64(stat.Bsize)
	free := stat.Bavail * uint64(stat.Bsize)
	used := total - free
	usedPercent := float64(used) / float64(total) * 100

	return &DiskStats{
		Total:       total,
		Free:        free,
		Used:        used,
		UsedPercent: usedPercent,
	}, nil
}

func (s *Service) emergencyCleanup() {
	log.Println("Running emergency cleanup...")

	// Delete all expired builds immediately
	s.hardDeleteExpired()

	// Also delete oldest builds regardless of expiration (up to 50)
	// Issue #36 - use index to avoid full scans
	oldest, _ := s.buildStore.FindOldest(50)
	for _, b := range oldest {
		s.buildStore.Delete(b.ID)
		os.RemoveAll(b.DirPath)
	}
}

func (s *Service) aggressiveCleanup() {
	log.Println("Running aggressive cleanup...")

	// Delete expired builds
	s.hardDeleteExpired()

	// Delete builds close to expiration
	expiring, _ := s.buildStore.FindExpiringIn(1 * time.Hour)
	for _, b := range expiring {
		if len(expiring) > 25 { // Delete max 25 at a time
			break
		}
		s.buildStore.Delete(b.ID)
		os.RemoveAll(b.DirPath)
	}
}

// Issue #36 - optimized orphaned file cleanup using filesystem markers
func (s *Service) cleanOrphanedFiles() {
	entries, err := os.ReadDir(s.config.WorkDir)
	if err != nil {
		log.Printf("Failed to read work directory: %v", err)
		return
	}

	// Build index of known builds
	allBuilds, _ := s.buildStore.GetAllIDs()
	knownBuilds := make(map[string]bool)
	for _, id := range allBuilds {
		knownBuilds[id] = true
	}

	orphanedCount := 0
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		// Check if directory is a known build
		if !knownBuilds[entry.Name()] {
			log.Printf("Found orphaned directory: %s, removing...", entry.Name())
			path := filepath.Join(s.config.WorkDir, entry.Name())
			if err := os.RemoveAll(path); err != nil {
				log.Printf("Failed to remove orphaned directory: %v", err)
			}
			orphanedCount++
		}
	}

	log.Printf("Cleaned %d orphaned directories", orphanedCount)
}

// Issue #21 - enforce storage quotas per tier
func (s *Service) cleanupStorageQuotas() {
	// Get all active users
	users, err := s.userStore.GetAll()
	if err != nil {
		log.Printf("Failed to get users: %v", err)
		return
	}

	for _, u := range users {
		// Get user tier and storage limit
		tierConfig, exists := user.Plans[u.Tier]
		if !exists {
			continue
		}

		maxStorageBytes := int64(tierConfig.StorageGB) * 1024 * 1024 * 1024

		// Get user's current storage usage
		totalStorage, err := s.buildStore.GetTotalStorage(u.ClerkID)
		if err != nil {
			continue
		}

		// If over quota, delete oldest builds
		if totalStorage > maxStorageBytes {
			log.Printf("User %s exceeded storage quota (%.1f GB)", u.ClerkID, float64(totalStorage)/(1024*1024*1024))
			
			// Delete oldest builds until under quota
			oldest, _ := s.buildStore.FindOldestByUser(u.ClerkID, 100)
			for _, b := range oldest {
				os.RemoveAll(b.DirPath)
				s.buildStore.Delete(b.ID)
				
				totalStorage -= b.StorageBytes
				if totalStorage <= maxStorageBytes {
					break
				}
			}

			u.StorageUsedBytes = totalStorage
			s.userStore.Update(u)
		}
	}
}

// Issue #21 - update user storage usage tracking
func (s *Service) updateUserStorageUsage() {
	users, err := s.userStore.GetAll()
	if err != nil {
		return
	}

	for _, u := range users {
		totalStorage, _ := s.buildStore.GetTotalStorage(u.ClerkID)
		u.StorageUsedBytes = totalStorage
		s.userStore.Update(u)
	}
}

func (s *Service) notifyAdmin(subject string, percent float64) {
	log.Printf("ADMIN NOTIFICATION - %s: %.1f%%", subject, percent)
	// TODO: Implement email notification
}
```

## Startup/Shutdown Cleanup

```go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/athulanoop/treefrog/latex-compiler/pkg/cleanup"
)

func main() {
	// Initialize cleanup engine
	cleanupConfig := cleanup.Config{
		Interval:       time.Hour,
		TTL:            24 * time.Hour,
		GracePeriod:    time.Hour,
		WorkDir:        os.Getenv("COMPILER_WORKDIR"),
		DiskWarning:    80,
		DiskCritical:   90,
		DiskEmergency: 95,
	}

	cleanupEngine := cleanup.NewEngine(cleanupConfig)
	cleanupEngine.Start()

	// Start server in goroutine
	go func() {
		log.Println("Server starting...")
		if err := http.ListenAndServe(":9000", nil); err != nil {
			log.Printf("Server error: %v", err)
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Trigger graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Run final cleanup (non-blocking)
	go func() {
		log.Println("Running final cleanup...")
		cleanupEngine.ForceRun()
		log.Println("Final cleanup completed")
	}()

	// Wait for cleanup or timeout
	time.Sleep(10 * time.Second)

	log.Println("Server stopped")
	os.Exit(0)
}
```

## Environment Variables

```bash
# Build Management
COMPILER_BUILD_TTL=24h
COMPILER_BUILD_GRACE=1h

# Disk Management
DISK_WARNING_PCT=80
DISK_CRITICAL_PCT=90
DISK_EMERGENCY_PCT=95
```

## Cleanup Schedule

| Task | Frequency | Trigger |
|------|-----------|---------|
| Expire old builds | Hourly | Timer |
| Hard delete expired | Hourly | Timer |
| Disk monitoring | Hourly | Timer |
| Orphaned files | Hourly | Timer |
| Initial cleanup | Once | Startup |
| Final cleanup | Once | Shutdown |

## Tasks Checklist

- [ ] Create cleanup engine
- [ ] Implement TTL expiration
- [ ] Set up periodic scans
- [ ] Create hard deletion logic
- [ ] Test cleanup flow
- [ ] Implement disk monitoring
- [ ] Create warning/critical thresholds
- [ ] Set up aggressive cleanup on low disk
- [ ] Add admin notifications
- [ ] Test disk management

## Next Steps

Proceed to [Phase 6: Frontend](06-frontend.md) to add the React frontend integration.
