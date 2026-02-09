package main

import (
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// CompilationMetrics tracks compilation statistics
type CompilationMetrics struct {
	TotalAttempts      int64         `json:"totalAttempts"`
	SuccessfulCompiles int64         `json:"successfulCompiles"`
	FailedCompiles     int64         `json:"failedCompiles"`
	TotalDuration      time.Duration `json:"totalDuration"`
	AverageDuration    time.Duration `json:"averageDuration"`
	MinDuration        time.Duration `json:"minDuration"`
	MaxDuration        time.Duration `json:"maxDuration"`
	SuccessRate        float64       `json:"successRate"`
	LastAttempt        time.Time     `json:"lastAttempt"`
	LastSuccess        time.Time     `json:"lastSuccess"`
	LastFailure        time.Time     `json:"lastFailure"`
}

// MetricsCollector collects and aggregates metrics
type MetricsCollector struct {
	logger  *logrus.Logger
	metrics *CompilationMetrics
	mu      sync.RWMutex
}

// NewMetricsCollector creates a new metrics collector
func NewMetricsCollector(logger *logrus.Logger) *MetricsCollector {
	return &MetricsCollector{
		logger: logger,
		metrics: &CompilationMetrics{
			MinDuration: 24 * time.Hour, // Initialize to large value
		},
	}
}

// RecordAttempt records a compilation attempt
func (mc *MetricsCollector) RecordAttempt(success bool, duration time.Duration) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.metrics.TotalAttempts++
	mc.metrics.LastAttempt = time.Now()

	if success {
		mc.metrics.SuccessfulCompiles++
		mc.metrics.LastSuccess = time.Now()
	} else {
		mc.metrics.FailedCompiles++
		mc.metrics.LastFailure = time.Now()
	}

	mc.metrics.TotalDuration += duration

	// Update min/max durations
	if duration < mc.metrics.MinDuration {
		mc.metrics.MinDuration = duration
	}
	if duration > mc.metrics.MaxDuration {
		mc.metrics.MaxDuration = duration
	}

	// Update averages
	mc.updateAverages()

	mc.logger.WithFields(logrus.Fields{
		"success":        success,
		"duration_ms":    duration.Milliseconds(),
		"total_attempts": mc.metrics.TotalAttempts,
		"success_rate":   mc.metrics.SuccessRate,
	}).Debug("Compilation recorded")
}

// updateAverages recalculates average and success rate
func (mc *MetricsCollector) updateAverages() {
	if mc.metrics.TotalAttempts == 0 {
		mc.metrics.AverageDuration = 0
		mc.metrics.SuccessRate = 0
		return
	}

	mc.metrics.AverageDuration = time.Duration(
		int64(mc.metrics.TotalDuration) / mc.metrics.TotalAttempts,
	)

	mc.metrics.SuccessRate = float64(mc.metrics.SuccessfulCompiles) /
		float64(mc.metrics.TotalAttempts) * 100
}

// GetMetrics returns a copy of current metrics
func (mc *MetricsCollector) GetMetrics() CompilationMetrics {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	metrics := *mc.metrics
	// Set MinDuration to 0 if it's still the initial large value
	if metrics.TotalAttempts == 0 {
		metrics.MinDuration = 0
	}
	return metrics
}

// Reset clears all metrics
func (mc *MetricsCollector) Reset() {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	mc.metrics = &CompilationMetrics{
		MinDuration: 24 * time.Hour,
	}
	mc.logger.Info("Metrics reset")
}

// LogSummary logs a summary of metrics
func (mc *MetricsCollector) LogSummary() {
	mc.mu.RLock()
	defer mc.mu.RUnlock()

	if mc.metrics.TotalAttempts == 0 {
		mc.logger.Info("No compilation metrics recorded yet")
		return
	}

	mc.logger.WithFields(logrus.Fields{
		"total_attempts":       mc.metrics.TotalAttempts,
		"successful":           mc.metrics.SuccessfulCompiles,
		"failed":               mc.metrics.FailedCompiles,
		"success_rate_percent": mc.metrics.SuccessRate,
		"avg_duration_ms":      mc.metrics.AverageDuration.Milliseconds(),
		"min_duration_ms":      mc.metrics.MinDuration.Milliseconds(),
		"max_duration_ms":      mc.metrics.MaxDuration.Milliseconds(),
	}).Info("Compilation metrics summary")
}
