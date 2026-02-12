package main

import (
	"sync"
	"time"

	"github.com/sirupsen/logrus"
)

// CompilationMetrics tracks compilation statistics
type CompilationMetrics struct {
	TotalAttempts      int64   `json:"totalAttempts"`
	SuccessfulCompiles int64   `json:"successfulCompiles"`
	FailedCompiles     int64   `json:"failedCompiles"`
	TotalDuration      int64   `json:"totalDuration"`   // milliseconds
	AverageDuration    int64   `json:"averageDuration"` // milliseconds
	MinDuration        int64   `json:"minDuration"`     // milliseconds
	MaxDuration        int64   `json:"maxDuration"`     // milliseconds
	SuccessRate        float64 `json:"successRate"`
	LastAttempt        string  `json:"lastAttempt"` // RFC3339 timestamp
	LastSuccess        string  `json:"lastSuccess"` // RFC3339 timestamp
	LastFailure        string  `json:"lastFailure"` // RFC3339 timestamp
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
			MinDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
		},
	}
}

// RecordAttempt records a compilation attempt
func (mc *MetricsCollector) RecordAttempt(success bool, duration time.Duration) {
	mc.mu.Lock()
	defer mc.mu.Unlock()

	durationMs := duration.Milliseconds()
	mc.metrics.TotalAttempts++
	mc.metrics.LastAttempt = time.Now().Format(time.RFC3339)

	if success {
		mc.metrics.SuccessfulCompiles++
		mc.metrics.LastSuccess = time.Now().Format(time.RFC3339)
	} else {
		mc.metrics.FailedCompiles++
		mc.metrics.LastFailure = time.Now().Format(time.RFC3339)
	}

	mc.metrics.TotalDuration += durationMs

	// Update min/max durations
	if durationMs < mc.metrics.MinDuration {
		mc.metrics.MinDuration = durationMs
	}
	if durationMs > mc.metrics.MaxDuration {
		mc.metrics.MaxDuration = durationMs
	}

	// Update averages
	mc.updateAverages()

	mc.logger.WithFields(logrus.Fields{
		"success":        success,
		"duration_ms":    durationMs,
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

	mc.metrics.AverageDuration = mc.metrics.TotalDuration / mc.metrics.TotalAttempts

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
		MinDuration: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
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
		"avg_duration_ms":      mc.metrics.AverageDuration,
		"min_duration_ms":      mc.metrics.MinDuration,
		"max_duration_ms":      mc.metrics.MaxDuration,
	}).Info("Compilation metrics summary")
}
