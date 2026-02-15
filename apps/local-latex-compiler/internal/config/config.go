package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server  ServerConfig
	Build   BuildConfig
	Cleanup CleanupConfig
}

type ServerConfig struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
}

type BuildConfig struct {
	WorkDir     string
	MaxFileSize int64
	Timeout     time.Duration
}

type CleanupConfig struct {
	Enabled  bool
	Interval time.Duration
	TTL      time.Duration
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:            getEnvOrDefault("PORT", "8080"),
			ReadTimeout:     getDurationEnv("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:    getDurationEnv("SERVER_WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:     getDurationEnv("SERVER_IDLE_TIMEOUT", 60*time.Second),
			ShutdownTimeout: getDurationEnv("SERVER_SHUTDOWN_TIMEOUT", 30*time.Second),
		},
		Build: BuildConfig{
			WorkDir:     getEnvOrDefault("COMPILER_WORKDIR", "/tmp/treefrog-builds"),
			MaxFileSize: int64(getIntEnv("BUILD_MAX_FILE_SIZE", 100*1024*1024)),
			Timeout:     getDurationEnv("BUILD_TIMEOUT", 5*time.Minute),
		},
		Cleanup: CleanupConfig{
			Enabled:  getBoolEnv("CLEANUP_ENABLED", true),
			Interval: getDurationEnv("CLEANUP_INTERVAL", time.Hour),
			TTL:      getDurationEnv("CLEANUP_TTL", 24*time.Hour),
		},
	}
}

func getEnvOrDefault(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getIntEnv(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}

func getBoolEnv(key string, defaultVal bool) bool {
	if val := os.Getenv(key); val != "" {
		if b, err := strconv.ParseBool(val); err == nil {
			return b
		}
	}
	return defaultVal
}

func getDurationEnv(key string, defaultVal time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return defaultVal
}
