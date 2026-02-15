package cleanup

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"syscall"
	"time"

	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/billing"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/build"
	"github.com/alpha-og/treefrog/apps/remote-latex-compiler/internal/user"
	buildpkg "github.com/alpha-og/treefrog/packages/go/build"
	"github.com/sirupsen/logrus"
)

// DiskStats holds disk usage information
type DiskStats struct {
	Total       uint64
	Free        uint64
	Used        uint64
	UsedPercent float64
}

// Service performs cleanup operations
type Service struct {
	config     Config
	buildStore *build.Store
	userStore  *user.Store
	logger     *logrus.Logger
	cleanupMu  sync.Mutex // Prevent concurrent cleanup
}

// NewService creates a new cleanup service
func NewService(cfg Config, buildStore *build.Store, userStore *user.Store, logger *logrus.Logger) *Service {
	return &Service{
		config:     cfg,
		buildStore: buildStore,
		userStore:  userStore,
		logger:     logger,
	}
}

// Run executes a cleanup cycle
func (s *Service) Run() {
	// Use lock to prevent concurrent cleanup execution
	if !s.cleanupMu.TryLock() {
		s.logger.Debug("Cleanup already running, skipping this cycle")
		return
	}
	defer s.cleanupMu.Unlock()

	s.logger.Info("Starting cleanup cycle")

	// Ensure work directory exists
	if err := os.MkdirAll(s.config.WorkDir, 0755); err != nil {
		s.logger.WithError(err).Error("Failed to create work directory")
		return
	}

	// Run all cleanup tasks
	s.expireOldBuilds()
	s.hardDeleteExpired()
	s.checkDiskSpace()
	s.cleanOrphanedFiles()
	s.cleanupStorageQuotas()
	s.updateUserStorageUsage()

	s.logger.Info("Cleanup cycle completed")
}

// expireOldBuilds marks old builds as expired
func (s *Service) expireOldBuilds() error {
	cutoff := time.Now().Add(-s.config.TTL)

	expired, err := s.buildStore.FindExpiredBefore(cutoff)
	if err != nil {
		s.logger.WithError(err).Error("Failed to find expired builds")
		return err
	}

	for _, b := range expired {
		s.logger.WithFields(logrus.Fields{
			"buildID":   b.ID,
			"createdAt": b.CreatedAt,
		}).Debug("Expiring old build")

		b.Status = buildpkg.StatusExpired
		b.ExpiresAt = time.Now().Add(s.config.GracePeriod)
		s.buildStore.Update(b)
	}

	s.logger.WithField("count", len(expired)).Info("Marked builds as expired")
	return nil
}

// hardDeleteExpired physically removes expired builds
func (s *Service) hardDeleteExpired() {
	now := time.Now()

	expired, err := s.buildStore.FindExpiredBefore(now)
	if err != nil {
		s.logger.WithError(err).Error("Failed to find expired builds for deletion")
		return
	}

	for _, b := range expired {
		s.logger.WithField("buildID", b.ID).Debug("Hard deleting build")

		// Remove files
		if err := os.RemoveAll(b.DirPath); err != nil {
			s.logger.WithError(err).Warn("Failed to remove build directory")
		}

		// Remove from database
		if err := s.buildStore.Delete(b.ID); err != nil {
			s.logger.WithError(err).Warn("Failed to delete build record")
		}
	}

	s.logger.WithField("count", len(expired)).Info("Hard deleted expired builds")
}

// checkDiskSpace monitors disk usage and triggers cleanup
func (s *Service) checkDiskSpace() error {
	stats, err := getDiskStats(s.config.WorkDir)
	if err != nil {
		s.logger.WithError(err).Error("Failed to get disk usage")
		return err
	}

	percent := stats.UsedPercent

	switch {
	case percent >= float64(s.config.DiskEmergency):
		s.logger.WithField("usage", fmt.Sprintf("%.1f%%", percent)).Error("EMERGENCY: Disk usage critical")
		s.emergencyCleanup()
		s.notifyAdmin("EMERGENCY: Disk usage critical", percent)
		return fmt.Errorf("disk space emergency")

	case percent >= float64(s.config.DiskCritical):
		s.logger.WithField("usage", fmt.Sprintf("%.1f%%", percent)).Warn("CRITICAL: Disk usage high")
		s.aggressiveCleanup()
		s.notifyAdmin("CRITICAL: Disk usage high", percent)
		return fmt.Errorf("disk space critical")

	case percent >= float64(s.config.DiskWarning):
		s.logger.WithField("usage", fmt.Sprintf("%.1f%%", percent)).Warn("WARNING: Disk usage elevated")
		s.notifyAdmin("WARNING: Disk usage elevated", percent)

	default:
		s.logger.WithField("usage", fmt.Sprintf("%.1f%%", percent)).Debug("Disk usage normal")
	}

	return nil
}

// getDiskStats retrieves disk statistics using syscall
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

// emergencyCleanup aggressively removes builds to free disk space
func (s *Service) emergencyCleanup() {
	s.logger.Warn("Running emergency cleanup...")

	// Delete all expired builds immediately
	s.hardDeleteExpired()

	// Also delete oldest builds regardless of expiration (up to 50)
	oldest, err := s.buildStore.FindOldest(50)
	if err != nil {
		s.logger.WithError(err).Warn("Failed to find oldest builds for emergency cleanup")
		return
	}
	for _, b := range oldest {
		s.logger.WithField("buildID", b.ID).Debug("Emergency delete build")
		s.buildStore.Delete(b.ID)
		os.RemoveAll(b.DirPath)
	}
}

// aggressiveCleanup removes builds close to expiration
func (s *Service) aggressiveCleanup() {
	s.logger.Warn("Running aggressive cleanup...")

	// Delete expired builds
	s.hardDeleteExpired()

	// Delete builds close to expiration (within 1 hour)
	expiring, err := s.buildStore.FindExpiringIn(1 * time.Hour)
	if err != nil {
		s.logger.WithError(err).Warn("Failed to find expiring builds for aggressive cleanup")
		return
	}
	for i, b := range expiring {
		if i >= 25 { // Delete max 25 at a time
			break
		}
		s.logger.WithField("buildID", b.ID).Debug("Aggressive delete build")
		s.buildStore.Delete(b.ID)
		os.RemoveAll(b.DirPath)
	}
}

// cleanOrphanedFiles removes build directories without database records
func (s *Service) cleanOrphanedFiles() {
	entries, err := os.ReadDir(s.config.WorkDir)
	if err != nil {
		s.logger.WithError(err).Warn("Failed to read work directory")
		return
	}

	// Build index of known builds
	allBuilds, err := s.buildStore.GetAllIDs()
	if err != nil {
		s.logger.WithError(err).Warn("Failed to get all build IDs for orphan check")
		return
	}
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
			s.logger.WithField("dir", entry.Name()).Debug("Found orphaned directory")
			path := filepath.Join(s.config.WorkDir, entry.Name())
			if err := os.RemoveAll(path); err != nil {
				s.logger.WithError(err).Warn("Failed to remove orphaned directory")
			}
			orphanedCount++
		}
	}

	s.logger.WithField("count", orphanedCount).Info("Cleaned orphaned directories")
}

// cleanupStorageQuotas enforces storage limits per user tier
func (s *Service) cleanupStorageQuotas() {
	// Get all active users
	users, err := s.userStore.GetAll()
	if err != nil {
		s.logger.WithError(err).Warn("Failed to get users for quota check")
		return
	}

	for _, u := range users {
		// Get user tier and storage limit
		tierConfig, exists := billing.Plans[u.Tier]
		if !exists {
			continue
		}

		maxStorageBytes := int64(tierConfig.StorageGB) * 1024 * 1024 * 1024

		// Get user's current storage usage
		totalStorage, err := s.buildStore.GetTotalStorage(u.ID)
		if err != nil {
			continue
		}

		// If over quota, delete oldest builds
		if totalStorage > maxStorageBytes {
			s.logger.WithFields(logrus.Fields{
				"userID":  u.ID,
				"storage": fmt.Sprintf("%.1f GB", float64(totalStorage)/(1024*1024*1024)),
			}).Warn("User exceeded storage quota")

			// Delete oldest builds until under quota
			oldest, err := s.buildStore.FindOldestByUser(u.ID, 100)
			if err != nil {
				s.logger.WithError(err).WithField("userID", u.ID).Warn("Failed to find oldest builds for user")
				continue
			}
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

// updateUserStorageUsage recalculates storage usage for all users
func (s *Service) updateUserStorageUsage() {
	users, err := s.userStore.GetAll()
	if err != nil {
		s.logger.WithError(err).Debug("Failed to get users for storage update")
		return
	}

	for _, u := range users {
		totalStorage, err := s.buildStore.GetTotalStorage(u.ID)
		if err != nil {
			s.logger.WithError(err).WithField("userID", u.ID).Debug("Failed to get storage for user")
			continue
		}
		u.StorageUsedBytes = totalStorage
		s.userStore.Update(u)
	}

	s.logger.Debug("Updated user storage usage")
}

// notifyAdmin sends admin notification about disk space
func (s *Service) notifyAdmin(subject string, percent float64) {
	s.logger.WithFields(logrus.Fields{
		"subject": subject,
		"usage":   fmt.Sprintf("%.1f%%", percent),
	}).Warn("ADMIN NOTIFICATION")
	// TODO: Implement email notification
}
