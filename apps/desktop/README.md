# Treefrog Desktop Application (Wails)

This directory contains the desktop application built with Wails, a framework for creating desktop applications with Go and web technologies.

## Overview

The Wails application provides:

- Native desktop UI using React and TypeScript
- Go backend for system integration and API communication
- Docker renderer lifecycle management
- Git operations integration
- Remote compiler communication

## Development

Start development server with hot reload:

```bash
make dev
```

## Building

Build for the current platform:

```bash
make build
```

Build for all platforms (macOS, Windows, Linux):

```bash
make build-all
```

Built binaries are in `build/bin/`

## Architecture

- `main.go` - Application entry point
- `app.go` - Application configuration and state
- `bindings.go` - Go to frontend bindings
- `docker.go` - Docker lifecycle management
- `docker_config.go` - Docker configuration validation
- `menu.go` - Native menu bar
- `logger.go` - Logging configuration
- `frontend/` - React application

## Documentation

- [Backend Logging](LOGGING.md) - Backend logging configuration
- [Wails Framework](https://wails.io/docs/gettingstarted/installation) - Official Wails documentation

## Project Structure

```
wails/
├── frontend/               # React + TypeScript frontend
├── app.go                 # Application state
├── bindings.go            # Go bindings
├── docker.go              # Docker management
├── docker_config.go       # Docker config
├── menu.go                # Menu bar
├── main.go                # Entry point
├── logger.go              # Logging
├── docs/                  # Documentation
└── README.md             # This file
```
