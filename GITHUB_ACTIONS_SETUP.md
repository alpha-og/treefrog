# GitHub Actions Build & Release Setup

This guide explains how the GitHub Actions workflow builds and releases Treefrog for macOS, Linux, and Windows.

## Workflow Overview

The workflow file (`.github/workflows/build-release.yml`) handles:

1. **Multi-platform builds** - Builds native binaries for:
   - macOS x86_64 (Intel)
   - macOS ARM64 (Apple Silicon)
   - Linux x86_64
   - Windows x64

2. **Packaging** - Creates platform-specific installers:
   - macOS: `.dmg` files
   - Linux: `.tar.gz` files
   - Windows: `.zip` files

3. **Release creation** - Automatically creates a GitHub Release with all binaries attached

## How It Works

### Triggers

The workflow runs when:
- **A version tag is pushed** (e.g., `git tag v1.0.0 && git push origin v1.0.0`)
- **Manually triggered** via GitHub Actions UI (`workflow_dispatch`)

### Build Strategy

Each platform builds **only its native target** in CI:
- `macos-latest` builds both `darwin/amd64` and `darwin/arm64`
- `ubuntu-latest` builds `linux/amd64`
- `windows-latest` builds `windows/amd64`

This is more efficient than the local `make build-all` which builds all targets on every OS.

### Build Process

For each matrix entry:

1. **Checkout code** - Clone the repository
2. **Setup dependencies**:
   - Go 1.23
   - Node.js 20
   - pnpm (latest)
   - Platform-specific tools (GTK on Linux, Edge on Windows)
3. **Install Wails CLI** - `go install github.com/wailsapp/wails/v2/cmd/wails@latest`
4. **Build frontend** - `pnpm install && pnpm build` in `/frontend`
5. **Copy frontend dist** - Bundle React UI with Wails
6. **Build Treefrog** - `wails build -platform <target>`
7. **Create installer**:
   - macOS: `hdiutil` creates `.dmg` files
   - Linux: `tar` creates `.tar.gz` file
   - Windows: `7z` creates `.zip` file
8. **Upload artifacts** - Temporary storage for the release job

### Release Job

After all builds complete:
1. Downloads all artifacts from build jobs
2. Flattens the directory structure
3. Creates a GitHub Release with:
   - Auto-generated release notes from commits
   - All binaries attached
   - Published as "Latest Release"

## Usage

### Creating a Release

```bash
# Tag the current commit with a version
git tag v1.0.0

# Push the tag to GitHub
git push origin v1.0.0
```

The workflow will:
- Build on all platforms simultaneously
- Create a GitHub Release when all builds complete
- Attach binaries to the release

### Manual Trigger

Go to:
1. **GitHub repository** → **Actions** tab
2. Click **"Build and Release"** workflow
3. Click **"Run workflow"** button
4. Select branch and click **"Run workflow"**

This will run the build but **won't create a release** (only tag pushes trigger releases).

### Monitoring Builds

1. Go to **Actions** tab in your GitHub repository
2. Click the workflow run
3. Expand "build" to see each platform's progress
4. Check logs if any step fails

## Artifact Details

### macOS

- **File**: `treefrog-macos-x86_64.dmg` and `treefrog-macos-arm64.dmg`
- **Format**: Disk Image (.dmg)
- **Install**: Double-click to mount, drag `Treefrog.app` to Applications
- **Arch**: Universal support for Intel and Apple Silicon Macs

### Linux

- **File**: `treefrog-linux-x86_64.tar.gz`
- **Format**: Gzip compressed tar archive
- **Install**: `tar -xzf treefrog-linux-x86_64.tar.gz && ./treefrog`
- **Dependencies**: GTK 3.0+ (usually pre-installed on Linux desktops)

### Windows

- **File**: `treefrog-windows-x64.zip`
- **Format**: ZIP archive
- **Install**: Unzip and run `treefrog.exe`
- **Dependencies**: Windows 7+ (bundled MSVC runtime)

## Troubleshooting

### Build fails on macOS

- **Issue**: "Wails not found"
  - **Fix**: The workflow installs Wails via `go install`. If it fails, check Go setup step.

- **Issue**: Code signing error
  - **Note**: No code signing is configured currently. App runs fine locally/in CI, but may show warnings on first launch.

### Build fails on Linux

- **Issue**: "libgtk-3-dev not found"
  - **Fix**: The workflow installs it via `apt-get`. Check Ubuntu runner has internet access.

- **Issue**: Binaries fail on different Linux distros
  - **Note**: Built on Ubuntu. May need additional glibc version management for older distributions.

### Build fails on Windows

- **Issue**: "7z not found"
  - **Fix**: GitHub's Windows runners usually have 7z. If missing, the workflow will fail - update to latest Windows runner.

- **Issue**: Path separators in PowerShell
  - **Note**: Workflow uses `shell: powershell` where needed to handle Windows paths.

### Release not created

- **Issue**: Builds succeeded but release wasn't created
  - **Cause**: Release job only runs when a tag is pushed (`if: startsWith(github.ref, 'refs/tags/v')`)
  - **Fix**: Ensure you pushed a version tag (e.g., `git tag v1.0.0 && git push origin v1.0.0`)

### Artifacts not attached to release

- **Issue**: Release created but no files
  - **Cause**: Artifact upload/download failed
  - **Fix**: Check "release" job logs for artifact download errors

## Environment Variables

The workflow uses no custom environment variables. GitHub-provided secrets are:
- `GITHUB_TOKEN` - Automatically provided for release creation

## Security Notes

- **No code signing**: Executables are not signed. Add keys to GitHub Secrets if needed later.
- **No signing certificates**: Windows and macOS can add certificates to `secrets` if required.
- **Token scope**: Uses default `GITHUB_TOKEN` with standard workflow permissions.

## Future Improvements

Possible enhancements:

1. **Code Signing**:
   ```bash
   # Add Apple Developer certificate to GitHub Secrets
   # Add Windows Authenticode certificate to GitHub Secrets
   ```

2. **NSIS Installer (Windows)**:
   - Current: ZIP files
   - Could add: `.exe` installers with uninstall support

3. **Notarization (macOS)**:
   - Current: Unsigned app
   - Could add: Apple notarization for Gatekeeper bypass

4. **Build Caching**:
   - Current: Fresh builds each time
   - Could add: `actions/cache` for Go modules and pnpm cache

5. **Changelog Generation**:
   - Current: Auto-generated from commits
   - Could add: CHANGELOG.md parsing for custom notes

## Support

- **Workflow issues**: Check `.github/workflows/build-release.yml`
- **Build issues**: See README.md
- **Wails issues**: Visit https://wails.io/docs/gettingstarted/firstproject
