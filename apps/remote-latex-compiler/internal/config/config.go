package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server  ServerConfig
	Build   BuildConfig
	Storage StorageConfig
	Cleanup CleanupConfig
	Rate    RateConfig
	Billing BillingConfig
}

type ServerConfig struct {
	Port            string
	ReadTimeout     time.Duration
	WriteTimeout    time.Duration
	IdleTimeout     time.Duration
	ShutdownTimeout time.Duration
}

type BuildConfig struct {
	MaxFileSize    int64
	MaxLogSize     int64
	MaxMainFileLen int
	DefaultTimeout time.Duration
	MaxTimeout     time.Duration
	MinTimeout     time.Duration
	DefaultWorkers int
	WorkDir        string
	ImageName      string
}

type StorageConfig struct {
	BuildTTL      time.Duration
	GracePeriod   time.Duration
	DiskWarning   int
	DiskCritical  int
	DiskEmergency int
}

type CleanupConfig struct {
	Interval time.Duration
	TTL      time.Duration
}

type RateConfig struct {
	RedisURL string
}

type BillingConfig struct {
	RazorpayKeyID         string
	RazorpayKeySecret     string
	RazorpayWebhookSecret string
	PlanFree              string
	PlanPro               string
	PlanEnterprise        string
}

func Load() *Config {
	return &Config{
		Server: ServerConfig{
			Port:            getEnvOrDefault("SERVER_PORT", "9000"),
			ReadTimeout:     getDurationEnv("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:    getDurationEnv("SERVER_WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:     getDurationEnv("SERVER_IDLE_TIMEOUT", 60*time.Second),
			ShutdownTimeout: getDurationEnv("SERVER_SHUTDOWN_TIMEOUT", 30*time.Second),
		},
		Build: BuildConfig{
			MaxFileSize:    getInt64Env("BUILD_MAX_FILE_SIZE", 100*1024*1024),
			MaxLogSize:     getInt64Env("BUILD_MAX_LOG_SIZE", 10*1024*1024),
			MaxMainFileLen: getIntEnv("BUILD_MAX_MAIN_FILE_LEN", 256),
			DefaultTimeout: getDurationEnv("BUILD_DEFAULT_TIMEOUT", 5*time.Minute),
			MaxTimeout:     getDurationEnv("BUILD_MAX_TIMEOUT", 10*time.Minute),
			MinTimeout:     getDurationEnv("BUILD_MIN_TIMEOUT", 30*time.Second),
			DefaultWorkers: getIntEnv("BUILD_WORKERS", 4),
			WorkDir:        getEnvOrDefault("COMPILER_WORKDIR", "/tmp/treefrog-builds"),
			ImageName:      getEnvOrDefault("COMPILER_IMAGE", "treefrog-local-latex-compiler:latest"),
		},
		Storage: StorageConfig{
			BuildTTL:      getDurationEnv("STORAGE_BUILD_TTL", 24*time.Hour),
			GracePeriod:   getDurationEnv("STORAGE_GRACE_PERIOD", time.Hour),
			DiskWarning:   getIntEnv("STORAGE_DISK_WARNING", 80),
			DiskCritical:  getIntEnv("STORAGE_DISK_CRITICAL", 90),
			DiskEmergency: getIntEnv("STORAGE_DISK_EMERGENCY", 95),
		},
		Cleanup: CleanupConfig{
			Interval: getDurationEnv("CLEANUP_INTERVAL", time.Hour),
			TTL:      getDurationEnv("CLEANUP_TTL", 24*time.Hour),
		},
		Rate: RateConfig{
			RedisURL: getEnvOrDefault("REDIS_URL", "redis://localhost:6379"),
		},
		Billing: BillingConfig{
			RazorpayKeyID:         os.Getenv("RAZORPAY_KEY_ID"),
			RazorpayKeySecret:     os.Getenv("RAZORPAY_KEY_SECRET"),
			RazorpayWebhookSecret: os.Getenv("RAZORPAY_WEBHOOK_SECRET"),
			PlanFree:              os.Getenv("RAZORPAY_PLAN_FREE"),
			PlanPro:               os.Getenv("RAZORPAY_PLAN_PRO"),
			PlanEnterprise:        os.Getenv("RAZORPAY_PLAN_ENTERPRISE"),
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

func getInt64Env(key string, defaultVal int64) int64 {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.ParseInt(val, 10, 64); err == nil {
			return i
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
