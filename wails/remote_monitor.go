package main

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// RemoteBuilderHealth tracks remote builder status
type RemoteBuilderHealth struct {
	URL              string        `json:"url"`
	IsHealthy        bool          `json:"isHealthy"`
	LastCheck        time.Time     `json:"lastCheck"`
	ConsecutiveFails int           `json:"consecutiveFails"`
	LastError        string        `json:"lastError"`
	ResponseTime     time.Duration `json:"responseTime"`
	UpSince          time.Time     `json:"upSince"`
}

// RemoteBuilderMonitor monitors remote builder health
type RemoteBuilderMonitor struct {
	logger         *logrus.Logger
	health         *RemoteBuilderHealth
	mu             sync.RWMutex
	checkInterval  time.Duration
	maxConsecutive int
	timeout        time.Duration
	stopChan       chan struct{}
	wg             sync.WaitGroup
}

// NewRemoteBuilderMonitor creates a new remote builder monitor
func NewRemoteBuilderMonitor(url string, logger *logrus.Logger) *RemoteBuilderMonitor {
	return &RemoteBuilderMonitor{
		logger:         logger,
		checkInterval:  30 * time.Second,
		maxConsecutive: 3,
		timeout:        10 * time.Second,
		stopChan:       make(chan struct{}),
		health: &RemoteBuilderHealth{
			URL:       url,
			IsHealthy: true,
		},
	}
}

// Start begins health monitoring
func (rbm *RemoteBuilderMonitor) Start() {
	rbm.wg.Add(1)
	go rbm.monitorLoop()
	rbm.logger.WithFields(logrus.Fields{
		"url": rbm.health.URL,
	}).Info("Remote builder monitoring started")
}

// Stop stops health monitoring
func (rbm *RemoteBuilderMonitor) Stop() {
	close(rbm.stopChan)
	rbm.wg.Wait()
	rbm.logger.Info("Remote builder monitoring stopped")
}

// monitorLoop continuously monitors builder health
func (rbm *RemoteBuilderMonitor) monitorLoop() {
	defer rbm.wg.Done()

	ticker := time.NewTicker(rbm.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-rbm.stopChan:
			return
		case <-ticker.C:
			rbm.checkHealth()
		}
	}
}

// checkHealth performs a single health check
func (rbm *RemoteBuilderMonitor) checkHealth() {
	rbm.mu.Lock()
	defer rbm.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), rbm.timeout)
	defer cancel()

	start := time.Now()
	url := rbm.health.URL + "/health"

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		rbm.recordFailure(fmt.Sprintf("request creation failed: %v", err))
		return
	}

	client := &http.Client{Timeout: rbm.timeout}
	resp, err := client.Do(req)
	duration := time.Since(start)

	if err != nil {
		rbm.recordFailure(fmt.Sprintf("connection failed: %v", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		rbm.recordFailure(fmt.Sprintf("unhealthy status code: %d", resp.StatusCode))
		return
	}

	rbm.recordSuccess(duration)
}

// recordSuccess marks a successful health check
func (rbm *RemoteBuilderMonitor) recordSuccess(duration time.Duration) {
	wasUnhealthy := !rbm.health.IsHealthy

	rbm.health.IsHealthy = true
	rbm.health.LastCheck = time.Now()
	rbm.health.ConsecutiveFails = 0
	rbm.health.LastError = ""
	rbm.health.ResponseTime = duration

	if wasUnhealthy {
		rbm.health.UpSince = time.Now()
		rbm.logger.WithFields(logrus.Fields{
			"url":              rbm.health.URL,
			"response_time_ms": duration.Milliseconds(),
		}).Info("Remote builder recovered")
	} else {
		rbm.logger.WithFields(logrus.Fields{
			"response_time_ms": duration.Milliseconds(),
		}).Debug("Remote builder health check passed")
	}
}

// recordFailure marks a failed health check
func (rbm *RemoteBuilderMonitor) recordFailure(reason string) {
	rbm.health.ConsecutiveFails++
	rbm.health.LastCheck = time.Now()
	rbm.health.LastError = reason
	rbm.health.ResponseTime = 0

	if rbm.health.ConsecutiveFails >= rbm.maxConsecutive {
		rbm.health.IsHealthy = false
		rbm.logger.WithFields(logrus.Fields{
			"url":               rbm.health.URL,
			"consecutive_fails": rbm.health.ConsecutiveFails,
			"reason":            reason,
		}).Warn("Remote builder marked as unhealthy")
	} else {
		rbm.logger.WithFields(logrus.Fields{
			"consecutive_fails": rbm.health.ConsecutiveFails,
			"reason":            reason,
		}).Debug("Remote builder health check failed")
	}
}

// GetHealth returns the current health status
func (rbm *RemoteBuilderMonitor) GetHealth() RemoteBuilderHealth {
	rbm.mu.RLock()
	defer rbm.mu.RUnlock()
	return *rbm.health
}

// IsHealthy returns whether the builder is considered healthy
func (rbm *RemoteBuilderMonitor) IsHealthy() bool {
	rbm.mu.RLock()
	defer rbm.mu.RUnlock()
	return rbm.health.IsHealthy
}

// UpTime returns how long the builder has been up (if it's healthy)
func (rbm *RemoteBuilderMonitor) UpTime() time.Duration {
	rbm.mu.RLock()
	defer rbm.mu.RUnlock()

	if rbm.health.IsHealthy && !rbm.health.UpSince.IsZero() {
		return time.Since(rbm.health.UpSince)
	}
	return 0
}
