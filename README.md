# Treefrog

A native LaTeX editor with remote compilation support.

## Overview

Treefrog is a desktop application that provides:
- **Monaco Editor** - LaTeX editing with syntax highlighting
- **Live PDF Preview** - SyncTeX support for source↔PDF navigation
- **Git Integration** - Version control and repository management
- **Remote Compilation** - Offload LaTeX builds to a remote builder service
- **Project Management** - File browser and LaTeX project support

## Quick Start

### Prerequisites
- **Go** 1.21+ (for building)
- **Node.js** 15+ and **pnpm** (for frontend)
- **Wails CLI**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
- **Builder API Token** - Get from your remote builder service

### Development

```bash
# Start development server (hot reload enabled)
make dev

# Check Wails setup
make doctor
```

The app will open at a local dev server. Set your Builder URL and Token in Settings.

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
2. **Settings** → Enter your Builder URL and API Token
3. **File** → **Open Project** → Select your LaTeX project folder
4. **Edit** `.tex` files in the editor
5. **Build** → Compile and view PDF in real-time

## Configuration

Settings are stored at:
- **macOS**: `~/Library/Application Support/treefrog/config.json`
- **Linux**: `~/.config/treefrog/config.json`
- **Windows**: `%APPDATA%/treefrog/config.json`

Required settings:
- **Builder URL**: Remote LaTeX compiler endpoint
- **Builder Token**: API token for authentication

## Project Structure

```
treefrog/
├── frontend/           # React UI code
│   ├── src/components/ # UI components
│   ├── src/hooks/      # React hooks
│   ├── src/services/   # Go binding layer
│   └── src/stores/     # State management
├── wails/              # Desktop app (Wails v2)
│   ├── app.go          # Config and state
│   ├── bindings.go     # Go bindings (exported to frontend)
│   ├── menu.go         # Native menu bar
│   └── main.go         # Entry point
├── remote-builder/     # LaTeX compilation service
│   └── Dockerfile      # Docker build
├── Makefile            # Build commands
└── README.md           # This file
```

## Build System

When you click "Build", the app:

1. Zips your project with compilation options (engine, shell-escape, etc.)
2. Uploads to remote builder via HTTP
3. Polls `/build/{id}/status` every 2 seconds
4. Downloads PDF from `/build/{id}/artifacts/pdf` on success
5. Displays PDF in the viewer with live updates

Key technical details:
- PDF is transferred as base64-encoded string (Wails binary safety)
- HTTP header: `X-Builder-Token` for authentication
- Build status values: `running`, `success`, `error`
- PDF is validated before display (checks `%PDF` magic bytes)

## Development

### Commands

```bash
make dev              # Start dev server with hot reload
make build            # Build for current platform
make build-all        # Build for macOS, Windows, Linux
make builder          # Start remote builder (Docker)
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
make builder

# Or manually: 
cd remote-builder
docker build -t treefrog-builder .
docker run -p 9000:9000 treefrog-builder
```

## Features

- **Monaco Editor**: Full LaTeX syntax highlighting and autocompletion
- **Live PDF Viewer**: Click in PDF to jump to source code (SyncTeX)
- **File Browser**: Native file explorer for your project
- **Git Integration**: View file status, commit, push, pull
- **Auto-Save**: Builds trigger automatically on file changes
- **Shell Escape**: Optional shell execution in LaTeX builds
- **Multiple Engines**: Support for pdflatex, xelatex, lualatex

## Troubleshooting

### App won't start
```bash
make doctor           # Check dependencies
pnpm install          # Reinstall frontend deps
cd wails && wails build  # Rebuild Go binary
```

### Build fails
- Verify Builder URL is accessible
- Check API Token is correct
- Ensure main `.tex` file is selected
- Enable shell-escape if document needs it
- Check remote builder logs

### PDF doesn't display
- Verify remote builder successfully compiled document
- Check `.log` file from remote build
- Ensure PDF is valid (not empty)
- Try rebuilding the project

## License

MIT

