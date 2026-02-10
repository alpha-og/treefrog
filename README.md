# Treefrog

A native LaTeX editor with remote compilation support.

## Overview

Treefrog is a desktop application that provides:
- **Monaco Editor** - LaTeX editing with syntax highlighting
- **Live PDF Preview** - SyncTeX support for source↔PDF navigation
- **Git Integration** - Version control and repository management
- **Remote Compilation** - Offload LaTeX builds to a remote compiler service
- **Local Docker Renderer** - Optional bundled Docker container for local LaTeX compilation
- **Project Management** - File browser and LaTeX project support

## Quick Start

### Prerequisites
- **Go** 1.21+ (for building)
- **Node.js** 15+ and **pnpm** (for frontend)
- **Wails CLI**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- **Compiler API Token** - Get from your remote compiler service

### Development

```bash
# Start development server (hot reload enabled)
make dev

# Check Wails setup
make doctor
```

The app will open at a local dev server. Set your Compiler URL and Token in Settings.

### Build for Distribution

```bash
# Build for current platform
make build

# Build for all platforms (macOS, Windows, Linux)
make build-all
```

Built app will be in `wails/build/bin/`

## Usage

1. **Launch** the application
2. **Settings** → Configure:
   - **Compiler Settings**: Enter your remote Compiler URL and API Token (optional)
   - **Renderer Settings**: Configure local Docker renderer (optional)
3. **File** → **Open Project** → Select your LaTeX project folder
4. **Edit** `.tex` files in the editor
5. **Build** → Compile and view PDF in real-time

### Local Docker Renderer

The app supports an optional bundled Docker container for local LaTeX compilation:

**Prerequisites:**
- Docker installed on your system ([Download Docker](https://www.docker.com/products/docker-desktop))

**Setup:**
1. Go to **Settings** → **Renderer Settings**
2. Click **Start Renderer** to launch the Docker container
3. Configure port if needed (default: 8080)
4. Enable **Auto-start** to automatically start the renderer when the app launches

**Features:**
- One-click start/stop/restart operations
- Port configuration with automatic conflict detection
- Real-time status monitoring
- Live logs viewer
- Auto-start option for convenience
- Automatic shutdown when app closes

## Configuration

Settings are stored at:
- **macOS**: `~/Library/Application Support/treefrog/config.json`
- **Linux**: `~/.config/treefrog/config.json`
- **Windows**: `%APPDATA%/treefrog/config.json`

### Compiler Settings (Optional)
- **Compiler URL**: Remote LaTeX compiler endpoint
- **Compiler Token**: API token for authentication

### Renderer Settings (Optional)
- **Port**: Container port (default: 8080, range: 1024-65535)
- **Auto-start**: Automatically start renderer on app launch
- **Status**: Current renderer state (Running/Stopped/Building/Error)

## Project Structure

```
treefrog/
├── frontend/           # React UI code
│   ├── src/components/ # UI components
│   │   └── RendererSettings.tsx  # Docker renderer controls
│   ├── src/pages/      # Page components
│   │   └── Settings.tsx          # Premium settings page
│   ├── src/hooks/      # React hooks
│   ├── src/services/   # Go binding layer
│   │   └── rendererService.ts    # Renderer API service
│   └── src/stores/     # State management
├── wails/              # Desktop app (Wails v2)
│   ├── app.go          # Config and state
│   ├── bindings.go     # Go bindings (exported to frontend)
│   ├── docker.go       # Docker renderer lifecycle management
│   ├── docker_config.go # Docker configuration and validators
│   ├── menu.go         # Native menu bar
│   └── main.go         # Entry point
├── latex-compiler/     # LaTeX compilation service
│   └── Dockerfile      # Docker build
├── Makefile            # Build commands
└── README.md           # This file
```

## Build System

When you click "Build", the app:

1. Zips your project with compilation options (engine, shell-escape, etc.)
2. Uploads to remote compiler via HTTP
3. Polls `/build/{id}/status` every 2 seconds
4. Downloads PDF from `/build/{id}/artifacts/pdf` on success
5. Displays PDF in the viewer with live updates

Key technical details:
- PDF is transferred as base64-encoded string (Wails binary safety)
- HTTP header: `X-Compiler-Token` for authentication
- Build status values: `running`, `success`, `error`
- PDF is validated before display (checks `%PDF` magic bytes)

## Development

### Commands

```bash
make dev              # Start dev server with hot reload
make build            # Build for current platform
make build-all        # Build for macOS, Windows, Linux
make compiler          # Start remote compiler (Docker)
make stop             # Stop Docker services
make doctor           # Check Wails setup
```

### Wails Dev Server

When running `make dev`:
- Frontend auto-reloads on code changes
- Go code requires restart to reload
- Open browser to dev server URL shown in terminal

### Building Remote Builder

```bash
# Start the builder service (requires Docker)
make compiler

# Or manually: 
cd latex-compiler
docker build -t treefrog-compiler .
docker run -p 9000:9000 treefrog-compiler
```

## Features

- **Monaco Editor**: Full LaTeX syntax highlighting and autocompletion
- **Live PDF Viewer**: Click in PDF to jump to source code (SyncTeX)
- **File Browser**: Native file explorer for your project
- **Git Integration**: View file status, commit, push, pull
- **Auto-Save**: Builds trigger automatically on file changes
- **Shell Escape**: Optional shell execution in LaTeX builds
- **Multiple Engines**: Support for pdflatex, xelatex, lualatex
- **Local Docker Renderer**: Optional bundled LaTeX compilation environment
  - One-click start/stop with health checks
  - Automatic port conflict detection
  - Real-time status monitoring
  - Auto-start on app launch (configurable)

## Troubleshooting

### App won't start
```bash
make doctor           # Check dependencies
pnpm install          # Reinstall frontend deps
cd wails && wails build  # Rebuild Go binary
```

### Build fails
- Verify Compiler URL is accessible (if using remote compiler)
- Check API Token is correct
- Ensure main `.tex` file is selected
- Enable shell-escape if document needs it
- Check remote compiler logs

### Docker Renderer issues

**Renderer won't start:**
- Ensure Docker is installed and running
- Check if port is available (Settings → Renderer → change port)
- View renderer logs in Settings for error details
- Try rebuilding the image: Click "Build Renderer" in Settings

**Port already in use:**
- Change the port number in Settings (1024-65535)
- Or stop the service using that port and try again

**Docker not installed:**
- Download [Docker Desktop](https://www.docker.com/products/docker-desktop) for your OS
- Restart the app after installing Docker

### PDF doesn't display
- Verify remote compiler successfully compiled document
- Check `.log` file from remote build
- Ensure PDF is valid (not empty)
- Try rebuilding the project

## License

MIT

