package cleanup

import (
	"time"

	"github.com/alpha-og/treefrog/apps/compiler/internal/build"
	"github.com/alpha-og/treefrog/apps/compiler/internal/user"
	"github.com/sirupsen/logrus"
)

// Config holds cleanup engine configuration
type Config struct {
	Interval      time.Duration
	TTL           time.Duration
	GracePeriod   time.Duration
	WorkDir       string
	DiskWarning   int // Percentage
	DiskCritical  int
	DiskEmergency int
}

// Engine manages automatic cleanup of builds
type Engine struct {
	ticker  *time.Ticker
	service *Service
	done    chan struct{}
	logger  *logrus.Logger
}

// NewEngine creates a new cleanup engine with dependencies
func NewEngine(config Config, buildStore *build.Store, userStore *user.Store, logger *logrus.Logger) *Engine {
	service := NewService(config, buildStore, userStore, logger)
	return &Engine{
		ticker:  time.NewTicker(config.Interval),
		service: service,
		done:    make(chan struct{}),
		logger:  logger,
	}
}

// Start begins the cleanup routine
func (e *Engine) Start() {
	go func() {
		e.logger.Info("Cleanup engine started")

		// Run initial cleanup on startup
		e.logger.Info("Running initial cleanup")
		e.service.Run()

		for {
			select {
			case <-e.ticker.C:
				e.logger.Info("Running scheduled cleanup")
				e.service.Run()
			case <-e.done:
				e.logger.Info("Cleanup engine stopped")
				return
			}
		}
	}()
}

// Stop stops the cleanup routine
func (e *Engine) Stop() {
	close(e.done)
	e.ticker.Stop()
}

// ForceRun triggers an immediate cleanup cycle
func (e *Engine) ForceRun() {
	e.service.Run()
}
