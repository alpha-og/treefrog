package cleanup

import (
	"sync"
	"time"

	"github.com/alpha-og/treefrog/apps/local-latex-compiler/internal/storage"
	"github.com/sirupsen/logrus"
)

type Engine struct {
	store    *storage.Store
	interval time.Duration
	ttl      time.Duration
	logger   *logrus.Logger
	stopCh   chan struct{}
	wg       sync.WaitGroup
}

func NewEngine(store *storage.Store, interval, ttl time.Duration) *Engine {
	return &Engine{
		store:    store,
		interval: interval,
		ttl:      ttl,
		logger:   logrus.WithField("component", "cleanup").Logger,
		stopCh:   make(chan struct{}),
	}
}

func (e *Engine) Start() {
	e.wg.Add(1)
	go e.run()
}

func (e *Engine) Stop() {
	close(e.stopCh)
	e.wg.Wait()
}

func (e *Engine) run() {
	defer e.wg.Done()

	ticker := time.NewTicker(e.interval)
	defer ticker.Stop()

	for {
		select {
		case <-e.stopCh:
			return
		case <-ticker.C:
			e.cleanup()
		}
	}
}

func (e *Engine) cleanup() {
	expired := e.store.ListExpired()
	if len(expired) == 0 {
		return
	}

	e.logger.WithField("count", len(expired)).Info("Cleaning up expired builds")

	for _, b := range expired {
		if err := e.store.Delete(b.ID); err != nil {
			e.logger.WithError(err).WithField("build_id", b.ID).Error("Failed to delete expired build")
		} else {
			e.logger.WithField("build_id", b.ID).Debug("Deleted expired build")
		}
	}
}
