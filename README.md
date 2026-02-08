# Treefrog

A local-first LaTeX editor with remote compilation, inspired by Overleaf.

## Overview

Treefrog provides a LaTeX editing experience with:
- **Monaco Editor** with LaTeX syntax highlighting
- **PDF preview** with SyncTeX support
- **Git integration** for version control
- **Remote compilation** via a builder service
- **Local file system** access for your projects

## Architecture

```
┌─────────────────────────────────────┐
│  Treefrog Desktop App (Wails)       │
│  ┌───────────────────────────────┐  │
│  │  Native Window                │  │
│  │  - Direct filesystem access   │  │
│  │  - Native menu bar            │  │
│  │  - No browser needed          │  │
│  └───────────────────────────────┘  │
└──────────────┬──────────────────────┘
               │ HTTP/WebSocket
               ▼
      ┌──────────────────┐
      │  Remote Builder  │ (LaTeX compilation)
      └──────────────────┘
```

## Quick Start

### Prerequisites
- **Go** 1.21+ (for building)
- **Node.js** 15+ and **pnpm** (for frontend)
- **Wails CLI**: `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

### Build & Run

```bash
# Development mode (hot reload)
make wails-dev

# Build for current platform
make wails-build

# The built app will be in wails/build/bin/
```

### Usage
1. Launch the app
2. Go to **Settings** → Set your **Builder URL** and **Builder Token**
3. Select **File** → **Open Project** to choose your LaTeX project
4. Start editing!

## Development

### Desktop App Development

```bash
# Run in development mode with hot reload
make wails-dev

# Check Wails setup
make wails-doctor

# Build for all platforms
make wails-build-all
```

### Individual Components

#### Remote Builder (Docker)

```bash
export BUILDER_TOKEN=devtoken
make builder
```

Runs on `http://localhost:9000` with TeX Live + `latexmk`.

#### Frontend

```bash
make web
```

Runs on `http://localhost:5173` with hot reload.

## Configuration

### Desktop App

Settings are stored in:
- **macOS**: `~/Library/Application Support/treefrog/config.json`
- **Linux**: `~/.config/treefrog/config.json`
- **Windows**: `%APPDATA%/treefrog/config.json`

### Shared Settings

- **Builder URL**: Remote LaTeX compiler endpoint
- **Builder Token**: Authentication token for builder access

## Project Structure

```
treefrog/
├── frontend/                # React frontend code
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── services/       # API clients (web + wails)
│   │   ├── stores/         # State management (Zustand)
│   │   └── utils/env.ts    # Environment detection
│   └── package.json
├── wails/                   # Desktop app (Wails v2.11)
│   ├── app.go              # App struct and config
│   ├── bindings.go         # Go bindings for frontend
│   ├── menu.go             # Native menu bar
│   ├── main.go             # Entry point
│   └── wails.json          # Wails configuration
├── remote-builder/          # Go API for LaTeX compilation
│   ├── main.go
│   └── Dockerfile
├── scripts/                 # Helper scripts
├── Makefile                 # Build commands
└── docker-compose.yml       # Docker setup
```

## Features

- **Editor**: Monaco Editor with LaTeX support, syntax highlighting, and autocompletion
- **PDF Viewer**: Built-in PDF viewer with zoom and SyncTeX integration
- **File Explorer**: Browse and manage your project files
- **Git Integration**: View file status and sync with remote repositories
- **Build System**: Remote compilation with TeX Live, shell-escape support
- **SyncTeX**: Click in PDF to jump to source, or vice versa
- **Native Menu Bar**: File, Build, Git, View menus with keyboard shortcuts
- **Project Persistence**: Automatically remembers last opened project

## Build Flow

The Treefrog build process orchestrates LaTeX compilation between the desktop app and a remote builder service:

### Build Flow Diagram

```
User clicks "Build"
    ↓
TriggerBuild() called
    ↓
Project zipped locally
    ↓
Zip uploaded to Remote Builder with build options
    ├─ mainFile (e.g., "main.tex")
    ├─ engine (pdflatex, xelatex, etc.)
    └─ shellEscape (true/false)
    ↓
Remote Builder returns Build ID
    ↓
Poll /build/{id}/status every 2 seconds
    ├─ Status: "running"
    ├─ Status: "success" → Download PDF
    └─ Status: "error" → Show error
    ↓
On Success: Download PDF from /build/{id}/artifacts/pdf
    ↓
Save PDF to cache (last.pdf)
    ↓
Emit "build-status" event to frontend
    ↓
Frontend updates pdfKey → usePDFUrl reloads PDF
    ↓
PDF displayed in viewer
```

### Key Technical Details

**Backend (Go - Wails)**:
- `TriggerBuild()`: Initiates build, sets initial status
- `uploadBuild()`: Creates multipart form with zip file + build options
- `pollBuildStatus()`: Polls remote builder status every 2 seconds
- `downloadPDF()`: Fetches PDF from builder, validates it
- `GetPDFContent()`: Returns PDF as base64-encoded string (for binary safety with Wails)

**Frontend (React)**:
- `useBuild()`: Manages build state and prevents duplicate requests
- `useWebSocket()`: Listens for "build-status" Wails events
- `usePDFUrl()`: Decodes base64 PDF, creates blob URL
- `PreviewPane`: Displays build status and PDF viewer

### Important Implementation Notes

1. **PDF Transfer**: PDF content is transferred as base64-encoded string because Wails' automatic type conversion doesn't safely handle raw binary data. The frontend decodes it back to binary before creating the blob.

2. **HTTP Headers**: Remote builder expects `X-Builder-Token` header (not `Authorization`), and build options must be sent as form field `"options"` (JSON) with file field `"file"`.

3. **Status Polling**: Polls every 2 seconds until build completes or times out. Status values: `running`, `success`, `error`

4. **PDF Validation**: Downloaded PDF is validated by checking:
   - File is not empty (>0 bytes)
   - Header starts with `%PDF` magic bytes

5. **Error Handling**: Build errors are captured and emitted to frontend with error message for user display.

## Troubleshooting

### Desktop App Won't Start
- Check Wails CLI is installed: `wails version`
- Run doctor to check dependencies: `make wails-doctor`
- Ensure frontend dependencies are installed: `cd frontend && pnpm install`

### Build Failed
- Verify `BUILDER_TOKEN` is correct
- Check that your main `.tex` file is selected
- Enable shell-escape in build options if needed
- Check remote builder is accessible at your `BUILDER_URL`

### PDF Shows "Invalid PDF structure" Error
- Ensure the remote builder is successfully generating PDFs
- Check that shell-escape is enabled if your document needs it
- Verify the main file is set to your entry point (usually `main.tex`)
- Check remote builder logs for compilation errors

## License

MIT
