package main

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// RemoteCompilerHealth tracks remote compiler status
type RemoteCompilerHealth struct {
	URL              string `json:"url"`
	IsHealthy        bool   `json:"isHealthy"`
	LastCheck        string `json:"lastCheck"` // RFC3339 timestamp
	ConsecutiveFails int    `json:"consecutiveFails"`
	LastError        string `json:"lastError"`
	ResponseTime     int64  `json:"responseTime"` // milliseconds
	UpSince          string `json:"upSince"`      // RFC3339 timestamp
}

// RemoteCompilerMonitor monitors remote compiler health
type RemoteCompilerMonitor struct {
	logger         *logrus.Logger
	health         *RemoteCompilerHealth
	mu             sync.RWMutex
	checkInterval  time.Duration
	maxConsecutive int
	timeout        time.Duration
	stopChan       chan struct{}
	wg             sync.WaitGroup
}

// NewRemoteCompilerMonitor creates a new remote compiler monitor
func NewRemoteCompilerMonitor(url string, logger *logrus.Logger) *RemoteCompilerMonitor {
	return &RemoteCompilerMonitor{
		logger:         logger,
		checkInterval:  30 * time.Second,
		maxConsecutive: 3,
		timeout:        10 * time.Second,
		stopChan:       make(chan struct{}),
		health: &RemoteCompilerHealth{
			URL:       url,
			IsHealthy: true,
		},
	}
}

// Start begins health monitoring
func (rbm *RemoteCompilerMonitor) Start() {
	rbm.wg.Add(1)
	go rbm.monitorLoop()
	rbm.logger.WithFields(logrus.Fields{
		"url": rbm.health.URL,
	}).Info("Remote compiler monitoring started")
}

// Stop stops health monitoring
func (rbm *RemoteCompilerMonitor) Stop() {
	close(rbm.stopChan)
	rbm.wg.Wait()
	rbm.logger.Info("Remote compiler monitoring stopped")
}

// monitorLoop continuously monitors compiler health
func (rbm *RemoteCompilerMonitor) monitorLoop() {
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
func (rbm *RemoteCompilerMonitor) checkHealth() {
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
func (rbm *RemoteCompilerMonitor) recordSuccess(duration time.Duration) {
	wasUnhealthy := !rbm.health.IsHealthy

	rbm.health.IsHealthy = true
	rbm.health.LastCheck = time.Now().Format(time.RFC3339)
	rbm.health.ConsecutiveFails = 0
	rbm.health.LastError = ""
	rbm.health.ResponseTime = duration.Milliseconds()

	if wasUnhealthy {
		rbm.health.UpSince = time.Now().Format(time.RFC3339)
		rbm.logger.WithFields(logrus.Fields{
			"url":              rbm.health.URL,
			"response_time_ms": rbm.health.ResponseTime,
		}).Info("Remote compiler recovered")
	} else {
		rbm.logger.WithFields(logrus.Fields{
			"response_time_ms": rbm.health.ResponseTime,
		}).Debug("Remote compiler health check passed")
	}
}

// recordFailure marks a failed health check
func (rbm *RemoteCompilerMonitor) recordFailure(reason string) {
	rbm.health.ConsecutiveFails++
	rbm.health.LastCheck = time.Now().Format(time.RFC3339)
	rbm.health.LastError = reason
	rbm.health.ResponseTime = 0

	if rbm.health.ConsecutiveFails >= rbm.maxConsecutive {
		rbm.health.IsHealthy = false
		rbm.logger.WithFields(logrus.Fields{
			"url":               rbm.health.URL,
			"consecutive_fails": rbm.health.ConsecutiveFails,
			"reason":            reason,
		}).Warn("Remote compiler marked as unhealthy")
	} else {
		rbm.logger.WithFields(logrus.Fields{
			"consecutive_fails": rbm.health.ConsecutiveFails,
			"reason":            reason,
		}).Debug("Remote compiler health check failed")
	}
}

// GetHealth returns the current health status
func (rbm *RemoteCompilerMonitor) GetHealth() RemoteCompilerHealth {
	rbm.mu.RLock()
	defer rbm.mu.RUnlock()
	return *rbm.health
}

// IsHealthy returns whether the compiler is considered healthy
func (rbm *RemoteCompilerMonitor) IsHealthy() bool {
	rbm.mu.RLock()
	defer rbm.mu.RUnlock()
	return rbm.health.IsHealthy
}

// UpTime returns how long the compiler has been up (if it's healthy)
func (rbm *RemoteCompilerMonitor) UpTime() time.Duration {
	rbm.mu.RLock()
	defer rbm.mu.RUnlock()

	if rbm.health.IsHealthy && rbm.health.UpSince != "" {
		upSinceTime, err := time.Parse(time.RFC3339, rbm.health.UpSince)
		if err == nil {
			return time.Since(upSinceTime)
		}
	}
	return 0
}
