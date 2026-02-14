# Backend Logging

Logging in the Wails backend is configured via environment variables.

## Configuration

Set environment variables to control logging behavior:

```bash
LOG_LEVEL=DEBUG LOG_FORMAT=text make dev
```

### Environment Variables

`LOG_LEVEL` - Control verbosity (default: `INFO`)

- `DEBUG` - Verbose output for development
- `INFO` - General information
- `WARN` - Warnings only
- `ERROR` - Errors only

`LOG_FORMAT` - Output format (default: `text`)

- `text` - Human-readable colored output
- `json` - Structured JSON format

### Make Targets

Quick command shortcuts:

```bash
make dev-debug    # LOG_LEVEL=DEBUG
make dev-info     # LOG_LEVEL=INFO
make dev-warn     # LOG_LEVEL=WARN
make dev-error    # LOG_LEVEL=ERROR
```

## Implementation

Backend logging uses `github.com/sirupsen/logrus` (logger.go).

### Usage

```go
Logger.Infof("Message: %s", value)
Logger.Debugf("Debug info: %v", data)
Logger.Errorf("Error occurred: %v", err)
```

## Log Output

Text format (development):

```
[2024-02-08 14:23:45] [INFO] ProjectService: Project successfully set to: /Users/user/projects/thesis
[2024-02-08 14:23:46] [DEBUG] FileService: ReadFile called for: main.tex
[2024-02-08 14:23:46] [ERROR] Build failed: compilation error
```

JSON format (production):

```json
{
  "time": "2024-02-08T14:23:45Z",
  "level": "info",
  "msg": "Project successfully set",
  "root": "/Users/user/projects/thesis"
}
```

## Development Best Practices

Start with DEBUG level during development:

```bash
make dev-debug
```

Reduce verbosity as needed:

```bash
make dev-info      # Less output
make dev-warn      # Only warnings and errors
```
