# Treefrog

A local-first LaTeX editor with remote compilation, inspired by Overleaf.

## Overview

Treefrog provides a web-based LaTeX editing experience with:
- **Monaco Editor** with LaTeX syntax highlighting
- **PDF preview** with SyncTeX support
- **Git integration** for version control
- **Remote compilation** via a builder service
- **Local file system** access for your projects

## Architecture

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

### Components

| Component | Purpose | Deployment | Status |
|-----------|---------|------------|--------|
| `web/` | React frontend with editor and PDF viewer | Hosted (cloud) | Available online |
| `remote-builder/` | Go service that compiles LaTeX with TeX Live | Hosted (cloud) | Requires API key |
| `local-server/` | Go service that connects your filesystem to the web UI | **Local only** | You run this |

## Prerequisites

- **Node.js** and **pnpm** (for frontend development)
- **Go** 1.21+ (for running local-server)
- **Docker** (for running remote-builder locally during development)

## Quick Start

### 1. Run the Local Server

The local server **must run on your machine** to provide filesystem access:

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

### Run All Services Locally

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

#### Local Server

```bash
export PROJECT_ROOT=/path/to/project
export BUILDER_URL=http://localhost:9000
export BUILDER_TOKEN=devtoken
make local
```

#### Frontend

```bash
make web
```

Runs on `http://localhost:5173` with hot reload.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PROJECT_ROOT` | Yes | Path to your LaTeX project folder |
| `BUILDER_URL` | Yes | URL of the remote builder service |
| `BUILDER_TOKEN` | Yes | API token for the builder authentication |
| `PORT` | No | Local server port (default: 8080) |

### Web UI Settings

The web UI stores configuration in browser localStorage:

- **API URL** (`treefrog-api-url`): Your local server URL (default: `/api`)
- **Builder URL** (`treefrog-builder-url`): Remote builder endpoint
- **Builder Token** (`treefrog-builder-token`): Authentication token

## Project Structure

```
treefrog/
├── local-server/          # Go API server for local filesystem
│   ├── main.go
│   └── treefrog-server    # Compiled binary
├── remote-builder/        # Go API for remote LaTeX compilation
│   ├── main.go
│   └── Dockerfile
├── web/                   # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # React hooks
│   │   ├── services/      # API clients
│   │   └── stores/        # State management (Zustand)
│   └── package.json
├── scripts/               # Helper scripts
│   ├── start-local.sh
│   ├── start-builder.sh
│   └── start-web.sh
├── Makefile               # Convenient commands
└── docker-compose.yml     # Docker setup for remote-builder
```

## API Endpoints

### Local Server (`http://localhost:8080`)

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

## Features

- **Editor**: Monaco Editor with LaTeX support, syntax highlighting, and autocompletion
- **PDF Viewer**: Built-in PDF viewer with zoom and SyncTeX integration
- **File Explorer**: Browse and manage your project files
- **Git Integration**: View file status and sync with remote repositories
- **Build System**: Remote compilation with TeX Live, shell-escape support
- **SyncTeX**: Click in PDF to jump to source, or vice versa

## Troubleshooting

### Local Server Connection Failed
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
