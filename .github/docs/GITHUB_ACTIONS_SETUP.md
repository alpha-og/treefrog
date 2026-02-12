# GitHub Actions Workflow Configuration

Automated multi-platform build and release workflow for Treefrog.

## Overview

The GitHub Actions workflow (`.github/workflows/build-release.yml`) performs:

- Multi-platform builds for macOS, Linux, and Windows
- Platform-specific installer creation
- Automatic GitHub Release generation

## Workflow Triggers

The workflow executes when:

- A version tag is pushed (format: `v*`, e.g., `v1.0.0`)
- Manual trigger via GitHub Actions UI (workflow_dispatch)

Manual triggers build but do not create releases. Release creation requires a version tag.

## Build Process

### Build Matrix

Each platform builds only its native target:

| Runner | Targets |
|--------|---------|
| macOS | darwin/amd64, darwin/arm64 |
| Linux | linux/amd64 |
| Windows | windows/amd64 |

### Build Steps

For each matrix entry:

1. Repository checkout
2. Dependency setup:
   - Go 1.23
   - Node.js 20
   - pnpm (latest)
   - Platform-specific tools (GTK on Linux, Edge on Windows)
3. Wails CLI installation
4. Frontend build: `pnpm install && pnpm build`
5. Frontend distribution copy to Wails
6. Treefrog compilation: `wails build -platform <target>`
7. Installer creation:
   - macOS: `.dmg` via `hdiutil`
   - Linux: `.tar.gz` via `tar`
   - Windows: `.zip` via `7z`
8. Artifact upload for release job

### Release Job

Upon completion of all build jobs:

1. Artifact download from build jobs
2. Directory structure normalization
3. GitHub Release creation with:
   - Auto-generated release notes from commit history
   - All platform binaries attached
   - Latest release designation

## Artifacts

### macOS

- Filename: `treefrog-macos-universal.dmg`
- Format: Disk image
- Installation: Mount image, drag `Treefrog.app` to Applications
- Compatibility: Universal binary (Intel and Apple Silicon)

### Linux

- Filename: `treefrog-linux-x86_64.tar.gz`
- Format: Compressed tar archive
- Installation: `tar -xzf treefrog-linux-x86_64.tar.gz && ./treefrog`
- Requirements: GTK 3.0+

### Windows

- Filename: `treefrog-windows-x64.zip`
- Format: ZIP archive
- Installation: Unzip and execute `treefrog.exe`
- Requirements: Windows 7+, bundled MSVC runtime

## Usage

### Create Release via Tag

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow automatically:
- Builds all platforms in parallel
- Creates GitHub Release when all builds complete
- Attaches all binaries

### Manual Workflow Trigger

1. Navigate to GitHub repository Actions tab
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

Note: Manual triggers build only; releases require version tag push.

### Monitor Build

1. Navigate to GitHub repository Actions tab
2. Click the workflow run
3. Expand "build" to view platform progress
4. Review logs for any failures

## Tag Format Requirements

Tags must match the pattern `v*` for release creation:

Valid formats:
- `v1.0.0`
- `v2.3.4`
- `v1.0.0-beta`

Invalid formats (will not trigger release):
- `1.0.0`
- `release-1.0.0`
- `v1.0`

## Configuration

Workflow configuration: `.github/workflows/build-release.yml`

Environment variables: None. GitHub-provided `GITHUB_TOKEN` used for release creation.

## Security

- Executables are unsigned
- No code signing certificates configured
- `GITHUB_TOKEN` uses default workflow permissions

Code signing, notarization, and installer certificates can be added via GitHub Secrets if required.

## Troubleshooting

### macOS Build Failure

- Verify Go and Wails CLI installation in workflow logs
- Unsigned app may show warnings on first launch (expected)

### Linux Build Failure

- Verify GTK 3.0+ availability in workflow logs
- Check Ubuntu runner internet access

### Windows Build Failure

- Verify 7z availability (usually pre-installed)
- Check PowerShell path handling in workflow logs

### Release Not Created

Verify tag format matches `v*` pattern. Release job only executes for valid version tags.

### Artifacts Not Attached

Check release job logs for artifact download errors.

## Future Enhancements

Potential improvements:

- Code signing (Apple Developer, Windows Authenticode certificates via GitHub Secrets)
- NSIS installer support (Windows)
- macOS notarization for Gatekeeper
- Build artifact caching (Go modules, pnpm)
- Custom changelog generation from CHANGELOG.md

## Related Documentation

- [Release Workflow](RELEASE_WORKFLOW.md) - Release creation and best practices
- Project repository: [Treefrog](https://github.com)
