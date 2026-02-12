# Frontend Logging

Frontend logging is configured via environment variables and can be controlled at runtime.

## Configuration

Set environment variable to control verbosity:

```bash
VITE_LOG_LEVEL=debug make dev
```

### Environment Variables

`VITE_LOG_LEVEL` - Control verbosity (default: `debug` in dev, `error` in production)

- `debug` - All logs including component lifecycle
- `info` - Info level and above
- `warn` - Warnings and errors
- `error` - Errors only
- `silent` - No logging

## Runtime Control

After application starts, use browser DevTools console to adjust logging:

```javascript
// Change log level
window.__LOG_CONFIG.setLevel('debug')    // or 'info', 'warn', 'error', 'silent'

// Get current level
window.__LOG_CONFIG.getLevel()
```

Log level changes persist to localStorage across page reloads.

## Implementation

Frontend logger is in `src/utils/logger.ts`.

### Usage

```typescript
import { createLogger } from '@/utils/logger'

const log = createLogger('ComponentName')
log.debug('Debug message', { data })
log.info('Info message')
log.warn('Warning message')
log.error('Error message', error)
```

## Log Output Format

```
[14:23:45] [DEBUG] ComponentName: Debug message
[14:23:46] [INFO] ServiceName: Operation completed
[14:23:47] [WARN] UtilName: Warning condition
[14:23:48] [ERROR] HandlerName: Error occurred
```

Color coding in browser console:
- DEBUG: Violet
- INFO: Cyan
- WARN: Amber
- ERROR: Red

## Development Best Practices

Start with DEBUG level for full visibility:

```bash
VITE_LOG_LEVEL=debug make dev
```

Use browser console for runtime adjustment:

```javascript
window.__LOG_CONFIG.setLevel('warn')    // Reduce noise
window.__LOG_CONFIG.setLevel('debug')   // Increase detail
```

## Production

Debug logs are automatically excluded in production builds. Frontend defaults to error-only logging.
