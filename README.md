# Treefrog

A native LaTeX editor with remote compilation support and local Docker rendering.

## Overview

Treefrog is a desktop application providing a complete LaTeX editing and compilation environment:

- **Monaco Editor** - Syntax highlighting and LaTeX autocompletion
- **Live PDF Preview** - Real-time PDF viewer with SyncTeX support (click to navigate)
- **Git Integration** - Version control operations within the editor
- **Remote Compilation** - Offload builds to a remote compiler service
- **Local Docker Renderer** - Optional bundled LaTeX compilation environment
- **Project Management** - File browser and multi-file project support

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 15+ and pnpm
- Wails CLI: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- Compiler API Token (optional, for remote compilation)
- Docker (optional, for local rendering)

### Development

```bash
make dev              # Start development server with hot reload
make doctor           # Verify Wails setup
```

The application opens at the local dev server URL. Configure Compiler URL and Token in Settings if using remote compilation.

### Build for Distribution

```bash
make build            # Build for current platform
make build-all        # Build for macOS, Windows, Linux
```

Built binaries are in `wails/build/bin/`

## Usage

1. Launch the application
2. Configure settings (optional):
   - Compiler Settings: Remote compiler URL and API token
   - Renderer Settings: Local Docker renderer port and auto-start
3. Open project folder via File menu
4. Edit `.tex` files in the editor
5. Build to compile and view PDF

### Local Docker Renderer

Local LaTeX compilation via Docker container:

**Setup:**

1. Go to Settings → Renderer Settings
2. Click Start Renderer to launch Docker container
3. Configure port if needed (default: 8080)
4. Enable Auto-start to launch on application startup

**Features:**

- Start/stop/restart container management
- Port configuration with conflict detection
- Real-time status monitoring
- Integrated log viewer
- Automatic shutdown on application exit

**Requirements:**

- Docker installed and running

## Configuration

Settings are stored at:

- macOS: `~/Library/Application Support/treefrog/config.json`
- Linux: `~/.config/treefrog/config.json`
- Windows: `%APPDATA%/treefrog/config.json`

### Compiler Settings (Optional)

- **Compiler URL** - Remote LaTeX compiler endpoint
- **Compiler Token** - API authentication token

### Renderer Settings (Optional)

- **Port** - Container port (default: 8080, range: 1024-65535)
- **Auto-start** - Launch renderer on application startup
- **Status** - Current container state (Running/Stopped/Building/Error)

## Project Structure

```
treefrog/
├── frontend/                 # React UI application
│   ├── src/components/      # UI components
│   ├── src/pages/           # Page layouts
│   ├── src/hooks/           # React hooks
│   ├── src/services/        # Go binding layer
│   └── src/stores/          # State management
├── wails/                    # Desktop application (Wails v2)
│   ├── app.go               # Application configuration
│   ├── bindings.go          # Go to frontend bindings
│   ├── docker.go            # Docker lifecycle management
│   ├── docker_config.go     # Docker configuration
│   ├── menu.go              # Native menu bar
│   └── main.go              # Application entry point
├── latex-compiler/          # LaTeX compilation service
│   ├── cmd/server/          # Compiler server code
│   ├── pkg/                 # Compiler packages
│   └── Dockerfile           # Container image
├── .github/docs/            # GitHub Actions documentation
├── Makefile                 # Build targets
└── README.md                # This file
```

## Build System

Remote compilation flow:

1. Project is zipped with compilation options (engine, shell-escape, etc.)
2. Archive uploaded to remote compiler via HTTP
3. Status polled every 2 seconds via `/build/{id}/status`
4. PDF downloaded from `/build/{id}/artifacts/pdf` on success
5. PDF displayed in viewer

Technical details:

- PDF transferred as base64-encoded string for binary safety
- Authentication via `X-Compiler-Token` HTTP header
- Build status values: `running`, `success`, `error`
- PDF validated before display using magic bytes

## Development

### Make Commands

```bash
make dev              # Start dev server with hot reload
make build            # Build for current platform
make build-all        # Build for macOS, Windows, Linux
make compiler         # Start remote compiler service
make stop             # Stop Docker services
make doctor           # Check Wails setup
```

### Wails Development

- Frontend auto-reloads on code changes
- Go code changes require manual restart
- Dev server URL displayed in terminal output

### Compiler Service

Start remote compiler for local development:

```bash
make compiler

# Or manually:
cd latex-compiler
docker build -t treefrog-compiler .
docker run -p 9000:9000 treefrog-compiler
```

## Features

- Monaco Editor with LaTeX syntax highlighting
- Live PDF viewer with SyncTeX support
- Native file browser
- Git integration (status, commit, push, pull)
- Automatic build triggers on file changes
- Shell escape option for LaTeX builds
- Multiple TeX engines: pdflatex, xelatex, lualatex
- Local Docker rendering:
  - Container health checks
  - Automatic port conflict detection
  - Real-time status monitoring
  - Configurable auto-start

## Documentation

- [Docker Compiler Optimization](latex-compiler/docs/DOCKER_OPTIMIZATION.md) - Build process, resource management, memory constraints
- [Backend Logging](wails/LOGGING.md) - Backend logging configuration
- [Frontend Logging](frontend/LOGGING.md) - Frontend logging configuration
- [GitHub Actions Setup](.github/docs/GITHUB_ACTIONS_SETUP.md) - CI/CD workflow documentation
- [Release Workflow](.github/docs/RELEASE_WORKFLOW.md) - Release process and automation

## Troubleshooting

### Application fails to start

```bash
make doctor           # Verify dependencies
pnpm install          # Reinstall frontend dependencies
cd wails && wails build  # Rebuild binary
```

### Build compilation fails

- Verify Compiler URL is accessible (if using remote compiler)
- Validate API token in Settings
- Ensure main `.tex` file is selected
- Enable shell-escape if required by document
- Check remote compiler logs for error details

### Docker Renderer issues

**Renderer fails to start:**

- Verify Docker is installed and running
- Check port availability via Settings (change port if needed)
- Review error logs in Settings → Renderer Settings
- Rebuild Docker image via Settings → Build Renderer button

**Port already in use:**

- Change port number in Settings (range: 1024-65535)
- Stop service using the port and retry

**Docker not installed:**

- Download [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Restart application after installation

### PDF fails to display

- Verify remote compiler successfully compiled document
- Check build `.log` file for compilation errors
- Validate PDF file is not empty
- Rebuild project

## License

MIT
