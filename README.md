# Treefrog

A local-first LaTeX editor with remote compilation, inspired by Overleaf.

## Overview

Treefrog provides a LaTeX editing experience with:
- **Monaco Editor** with LaTeX syntax highlighting
- **PDF preview** with SyncTeX support
- **Git integration** for version control
- **Remote compilation** via a builder service
- **Local file system** access for your projects

**Two ways to use Treefrog:**
1. **Web Version** - Access via browser, requires local server for filesystem
2. **Desktop App** - Native application, no setup required

## Architecture

### Web Version
```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│     Web UI      │──────▶  Local Server    │──────▶  Remote Builder │
│  (Hosted/Cloud) │      │  (Local)         │      │  (Hosted)       │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                               │
                               ▼
                         ┌──────────────────┐
                         │  Your Filesystem │
                         └──────────────────┘
```

### Desktop App (Wails)
```
┌─────────────────────────────────────┐
│  Treefrog Desktop App               │
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

### Components

| Component | Purpose | Deployment | Status |
|-----------|---------|------------|--------|
| `frontend/` | Shared React frontend code | Both web & desktop | Shared codebase |
| `web/` | Web-specific Vite config | Hosted (cloud) | Available online |
| `wails/` | Desktop app (Go + Wails) | Local binary | Build yourself |
| `remote-builder/` | Go service for LaTeX compilation | Hosted (cloud) | Requires API key |
| `local-server/` | Go HTTP API for filesystem | Local only | For web users |

## Quick Start - Desktop App (Recommended)

The desktop app is the easiest way to use Treefrog - no local server needed!

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

## Quick Start - Web Version

### 1. Run the Local Server

The local server must run on your machine to provide filesystem access:

```bash
# Set your project root directory (where your LaTeX files are)
export PROJECT_ROOT=/path/to/your/latex/project

# Set the builder URL and token (get from your hosted instance)
export BUILDER_URL=https://builder.treefrog.example.com
export BUILDER_TOKEN=your-api-token

# Run the server
make local
```

The local server starts on `http://localhost:8080`.

### 2. Configure the Web UI

1. Open the hosted web UI (e.g., `https://treefrog.example.com`)
2. Go to **Settings** (gear icon)
3. Set **Local Server URL** to `http://localhost:8080`
4. Set **Builder URL** and **Builder Token** (if not using the defaults)

### 3. Start Editing

- Select your project folder in the file explorer
- Edit `.tex` files in the Monaco editor
- Press **Build** to compile
- View the PDF output with SyncTeX navigation

## Development

### Desktop App Development

```bash
# Run in development mode with hot reload
cd wails && wails dev

# Check Wails setup
make wails-doctor

# Build for all platforms
make wails-build-all
```

### Web Development

```bash
# Set environment variables
export PROJECT_ROOT=/path/to/latex/project
export BUILDER_TOKEN=devtoken

# Start all services (builder + local server + web)
make dev
```

Access the app at `http://localhost:5173`

### Individual Components

#### Remote Builder (Docker)

```bash
export BUILDER_TOKEN=devtoken
make builder
```

Runs on `http://localhost:9000` with TeX Live + `latexmk`.

#### Local Server (for web users)

```bash
export PROJECT_ROOT=/path/to/project
export BUILDER_URL=http://localhost:9000
export BUILDER_TOKEN=devtoken
make local
```

#### Frontend (web)

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

### Web Version Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PROJECT_ROOT` | Yes | Path to your LaTeX project folder |
| `BUILDER_URL` | Yes | URL of the remote builder service |
| `BUILDER_TOKEN` | Yes | API token for the builder authentication |
| `PORT` | No | Local server port (default: 8080) |

### Shared Settings (Both Versions)

- **Builder URL**: Remote LaTeX compiler endpoint
- **Builder Token**: Authentication token for builder access

## Project Structure

```
treefrog/
├── frontend/                # Shared React frontend code
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks
│   │   ├── services/       # API clients (web + wails)
│   │   ├── stores/         # State management (Zustand)
│   │   └── utils/env.ts    # Environment detection
│   └── package.json
├── web/                     # Web-specific config
│   └── vite.config.ts      # Points to ../frontend
├── wails/                   # Desktop app (Wails v2.11)
│   ├── app.go              # App struct and config
│   ├── bindings.go         # Go bindings for frontend
│   ├── menu.go             # Native menu bar
│   ├── main.go             # Entry point
│   └── wails.json          # Wails configuration
├── local-server/            # Go HTTP API (for web users)
│   └── main.go
├── remote-builder/          # Go API for LaTeX compilation
│   ├── main.go
│   └── Dockerfile
├── scripts/                 # Helper scripts
├── Makefile                 # Build commands
└── docker-compose.yml       # Docker setup
```

## Shared Frontend Code

The frontend code in `frontend/` is shared between web and desktop:

- **Environment Detection**: `utils/env.ts` checks if running in Wails
- **Dual API Layer**: Services work with both HTTP (web) and Go bindings (desktop)
- **Conditional UI**: Components adapt based on environment (e.g., hide local URL in desktop)

Example:
```typescript
// services/projectService.ts
export const getProject = () => {
  if (isWails()) {
    return window.go.main.App.GetProject();
  }
  return GET("/project");
};
```

## API Endpoints

### Local Server (`http://localhost:8080`) - Web Only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/project` | Get project structure |
| GET | `/api/files` | List files |
| GET | `/api/files/:path` | Read file content |
| PUT | `/api/files/:path` | Save file |
| POST | `/api/build` | Trigger build |
| GET | `/api/build/status` | Get build status |
| GET | `/api/build/output` | Download PDF |
| WS | `/ws` | Real-time updates |

### Wails Go Bindings - Desktop Only

All bindings are available via `window.go.main.App`:
- `GetProject()`, `SetProject()`, `OpenProjectDialog()`
- `ListFiles()`, `ReadFile()`, `WriteFile()`, etc.
- `TriggerBuild()`, `GetBuildStatus()`
- `GitStatus()`, `GitCommit()`, `GitPush()`, `GitPull()`
- `SyncTeXView()`, `SyncTeXEdit()`

## Features

- **Editor**: Monaco Editor with LaTeX support, syntax highlighting, and autocompletion
- **PDF Viewer**: Built-in PDF viewer with zoom and SyncTeX integration
- **File Explorer**: Browse and manage your project files
- **Git Integration**: View file status and sync with remote repositories
- **Build System**: Remote compilation with TeX Live, shell-escape support
- **SyncTeX**: Click in PDF to jump to source, or vice versa
- **Native Menu Bar** (Desktop): File, Build, Git, View menus with keyboard shortcuts
- **Project Persistence** (Desktop): Automatically remembers last opened project

## Troubleshooting

### Desktop App Won't Start
- Check Wails CLI is installed: `wails version`
- Run doctor to check dependencies: `make wails-doctor`
- Ensure frontend dependencies are installed: `cd frontend && pnpm install`

### Web: Local Server Connection Failed
- Verify the local server is running: `curl http://localhost:8080/api/project`
- Check browser console for CORS errors
- Ensure the correct URL is set in web UI settings

### Build Failed
- Verify `BUILDER_TOKEN` is correct
- Check that your main `.tex` file is selected
- Enable shell-escape in build options if needed

### Changes Not Syncing
- Ensure `PROJECT_ROOT` points to the correct directory
- Check file permissions in your project folder
- Refresh the file explorer in the web UI

## License

MIT
