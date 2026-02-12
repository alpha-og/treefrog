# LaTeX Compiler Service

This directory contains the remote LaTeX compilation service that can be deployed as a Docker container.

## Overview

The LaTeX compiler is a Go-based HTTP service that provides:

- Remote LaTeX document compilation
- Full TeX Live installation with all packages
- Multiple TeX engines: pdflatex, xelatex, lualatex
- Build status tracking and artifact management
- API token-based authentication

## Building

Build the Docker image:

```bash
docker build -t treefrog-compiler:latest -f cmd/server/Dockerfile .
```

## Running

Start the compiler service:

```bash
docker run -p 9000:9000 treefrog-compiler:latest
```

The service is available at `http://localhost:9000`

## API Endpoints

- `POST /compile` - Submit a document for compilation
- `GET /build/{id}/status` - Check compilation status
- `GET /build/{id}/artifacts/pdf` - Download compiled PDF

## Authentication

Include API token via HTTP header:

```
X-Compiler-Token: your-token-here
```

## Documentation

- [Docker Build Optimization](docs/DOCKER_OPTIMIZATION.md) - Build process, resource management, memory constraints

## Directory Structure

```
latex-compiler/
├── cmd/server/              # Compiler server application
│   └── Dockerfile          # Container image definition
├── pkg/                    # Shared packages
├── docs/                   # Documentation
└── README.md              # This file
```
