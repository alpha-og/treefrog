# Treefrog Logging Guide

Treefrog includes comprehensive logging for both backend (Go) and frontend (React) to help with development and debugging.

## Backend (Go) Logging

### Configuration

Configure backend logging via environment variables:

```bash
LOG_LEVEL=DEBUG LOG_FORMAT=text make dev
```

**Environment Variables:**

- `LOG_LEVEL`: Set log level (default: `INFO`)
  - `DEBUG`: Verbose logging for development
  - `INFO`: General information
  - `WARN`: Warnings only
  - `ERROR`: Errors only

- `LOG_FORMAT`: Output format (default: `text`)
  - `text`: Human-readable colored output for development
  - `json`: Structured JSON for production/parsing

### Quick Commands

```bash
# Full debug logging
make dev-debug

# Info level
make dev-info

# Warnings and errors only
make dev-warn

# Errors only
make dev-error

# Custom configuration
LOG_LEVEL=INFO LOG_FORMAT=json make dev
```

### What Gets Logged

- **Project Operations**: Loading, setting, validation
- **File Operations**: Read, write, create, delete (with paths and sizes)
- **Build Triggers**: Build start, options, progress
- **Remote Builder API**: Upload status, requests, responses
- **Git Operations**: Commits, pushes, pulls, status changes
- **Errors**: Full error context with stack traces

## Frontend (React) Logging

### Configuration

Configure frontend logging via environment variable:

```bash
VITE_LOG_LEVEL=debug make dev
```

**Environment Variables:**

- `VITE_LOG_LEVEL`: Set log level (default: `debug` in dev, `error` in production)
  - `debug`: All logs including component lifecycle
  - `info`: Info and above
  - `warn`: Warnings and errors
  - `error`: Errors only
  - `silent`: No logging

### Runtime Control

Once the app is running, use the browser DevTools console to control logging:

```javascript
// Change log level at runtime
window.__LOG_CONFIG.setLevel('debug')  // or 'info', 'warn', 'error', 'silent'

// Get current level
window.__LOG_CONFIG.getLevel()
```

Log level changes are persisted to localStorage and will persist across page reloads.

### What Gets Logged

- **Component Lifecycle**: Mount/unmount in development
- **State Changes**: Store updates via Zustand
- **API Calls**: Requests and responses to backend
- **WebSocket Events**: Connection, reconnection, build status updates
- **Project Management**: Project selection, loading
- **Navigation**: Route changes
- **Errors**: Caught exceptions and error boundaries

## Log Format

### Backend (Go)

**Text Format:**
```
[2024-02-08 14:23:45] [INFO] ProjectService: Project successfully set to: /Users/user/projects/thesis
[2024-02-08 14:23:46] [DEBUG] FileService: ReadFile called for: main.tex
[2024-02-08 14:23:46] [DEBUG] FileService: Successfully read file main.tex (2048 bytes)
```

**JSON Format:**
```json
{
  "time": "2024-02-08T14:23:45Z",
  "level": "info",
  "msg": "Project successfully set",
  "root": "/Users/user/projects/thesis"
}
```

### Frontend (React)

```
[14:23:45] [INFO] ProjectService: Project loaded: /Users/user/projects/thesis
[14:23:46] [DEBUG] WebSocket: Connected to Wails runtime EventsOn
[14:23:47] [INFO] API: GET /project completed {status: 200}
```

## Best Practices

### Development

1. Start with `make dev-debug` to see all logs
2. If too verbose, switch to `make dev-info` or `make dev-warn`
3. Use browser console to fine-tune frontend logging

### Debugging Specific Issues

**Build not triggering?**
```bash
make dev-debug
# Look for "TriggerBuild called" logs in backend
# Look for "Received build status event" logs in frontend
```

**File operations failing?**
```bash
make dev-debug
# Look for "ReadFile called" or "WriteFile called" logs
# Check for "SafePath failed" error messages
```

**WebSocket/API issues?**
```bash
VITE_LOG_LEVEL=debug make dev
# Look for WebSocket connection logs
# Check API request/response logs
```

### Production

- Set `LOG_LEVEL=ERROR` to only log errors
- Use `LOG_FORMAT=json` for easier parsing/monitoring
- Frontend defaults to `error` level (only logs errors)

## Implementation Details

### Backend Logger (logger.go)

- Uses `github.com/sirupsen/logrus`
- Colored terminal output in text mode
- Structured JSON output for parsing
- Global logger instance available as `Logger`

**Usage in Go:**
```go
Logger.Infof("Project loaded: %s", projectPath)
Logger.Debugf("File operation: %s (%d bytes)", filename, fileSize)
Logger.Errorf("Build failed: %v", err)
```

### Frontend Logger (utils/logger.ts)

- Custom implementation with namespace support
- localStorage persistence for log level
- Runtime configuration via `window.__LOG_CONFIG`
- Development-only debug logs (automatically disabled in production)

**Usage in React:**
```typescript
const log = createLogger("ComponentName")
log.info("Component mounted")
log.debug("State updated", { newState })
log.error("Operation failed", error)
```

## Troubleshooting

**No logs appearing?**
1. Check you're in development mode (not production build)
2. Verify environment variable is set correctly
3. Check LOG_LEVEL is not set to a higher level than expected

**Too many logs?**
1. Increase LOG_LEVEL (DEBUG → INFO → WARN → ERROR)
2. Use namespace-based filtering if needed
3. Set VITE_LOG_LEVEL to a higher level on frontend

**Logs not persisting between runs?**
1. Frontend log level is saved to localStorage automatically
2. Backend requires environment variable on each run
3. Use Makefile targets (e.g., `make dev-info`) for convenience
