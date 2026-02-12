package errors

import "fmt"

// ErrorCode defines error types for API responses
type ErrorCode string

const (
	ErrInvalidInput      ErrorCode = "invalid_input"
	ErrNotFound          ErrorCode = "not_found"
	ErrUnauthorized      ErrorCode = "unauthorized"
	ErrForbidden         ErrorCode = "forbidden"
	ErrConflict          ErrorCode = "conflict"
	ErrRateLimited       ErrorCode = "rate_limited"
	ErrServerError       ErrorCode = "server_error"
	ErrLimitExceeded     ErrorCode = "limit_exceeded"
	ErrCompilationFailed ErrorCode = "compilation_failed"
	ErrStorageExceeded   ErrorCode = "storage_exceeded"
	ErrDiskSpaceExceeded ErrorCode = "disk_space_exceeded"
)

// AppError is a structured application error
type AppError struct {
	Code       ErrorCode `json:"code"`
	Message    string    `json:"message"`
	Details    string    `json:"details,omitempty"`
	StatusCode int       `json:"-"`
}

func (e *AppError) Error() string {
	return fmt.Sprintf("[%s] %s: %s", e.Code, e.Message, e.Details)
}

// NewAppError creates a new application error
func NewAppError(code ErrorCode, message string, details string, statusCode int) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		Details:    details,
		StatusCode: statusCode,
	}
}

// Common error constructors
func InvalidInput(message string) *AppError {
	return NewAppError(ErrInvalidInput, message, "", 400)
}

func NotFound(resource string) *AppError {
	return NewAppError(ErrNotFound, fmt.Sprintf("%s not found", resource), "", 404)
}

func Unauthorized() *AppError {
	return NewAppError(ErrUnauthorized, "Authentication required", "", 401)
}

func Forbidden() *AppError {
	return NewAppError(ErrForbidden, "Access denied", "", 403)
}

func RateLimited() *AppError {
	return NewAppError(ErrRateLimited, "Rate limit exceeded", "", 429)
}

func LimitExceeded(resource string) *AppError {
	return NewAppError(ErrLimitExceeded, fmt.Sprintf("%s limit exceeded", resource), "", 403)
}

func ServerError(details string) *AppError {
	return NewAppError(ErrServerError, "Internal server error", details, 500)
}
