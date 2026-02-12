# GitHub Configuration and Workflows

This directory contains GitHub-specific configuration, including CI/CD workflows and related documentation.

## Contents

- `workflows/` - GitHub Actions workflow definitions
- `GITHUB_ACTIONS_SETUP.md` - CI/CD workflow documentation
- `RELEASE_WORKFLOW.md` - Release process and automation

## Workflows

### Build and Release Workflow

Automatically builds and releases Treefrog for macOS, Linux, and Windows when a version tag is pushed.

Triggered by:
- Pushing a version tag (e.g., `git tag v1.0.0 && git push origin v1.0.0`)
- Manual trigger from GitHub Actions UI

Builds:
- macOS (Intel and Apple Silicon universal binary)
- Linux x86_64
- Windows x64

Output:
- DMG installer (macOS)
- TAR.GZ archive (Linux)
- ZIP archive (Windows)
- GitHub Release with all binaries

## Quick Start: Create a Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will automatically build and create a GitHub Release.

## Documentation

- [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md) - Detailed workflow configuration and troubleshooting
- [Release Workflow](RELEASE_WORKFLOW.md) - Release process, best practices, and command reference

## Directory Structure

```
.github/
├── workflows/               # GitHub Actions workflows
│   └── build-release.yml   # Build and release workflow
├── docs/                    # Documentation
│   ├── GITHUB_ACTIONS_SETUP.md
│   └── RELEASE_WORKFLOW.md
└── README.md               # This file (if exists)
```
