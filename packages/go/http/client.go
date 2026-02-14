package http

import (
	"net/http"
	"time"
)

var (
	DefaultTimeout = 30 * time.Second
	ShortTimeout   = 10 * time.Second
	QuickTimeout   = 2 * time.Second
	HealthTimeout  = 1 * time.Second
)

func NewHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
	}
}

func NewDefaultHTTPClient() *http.Client {
	return NewHTTPClient(DefaultTimeout)
}

func NewQuickHTTPClient() *http.Client {
	return NewHTTPClient(QuickTimeout)
}
