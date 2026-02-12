# Release Workflow

Automated build and release process for distributing Treefrog across platforms.

## Process

### Create Release

Tag the commit and push to trigger the workflow:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow automatically:
- Builds for macOS, Linux, and Windows in parallel
- Creates platform-specific installers
- Generates a GitHub Release with all binaries

### Monitor Build

1. Navigate to GitHub repository Actions tab
2. Select "Build and Release" workflow
3. Builds complete in approximately 20-30 minutes

### Download Release

1. Navigate to repository Releases tab
2. Locate the release version
3. Download binaries:
   - `treefrog-macos-universal.dmg` - macOS (Intel and Apple Silicon)
   - `treefrog-linux-x86_64.tar.gz` - Linux
   - `treefrog-windows-x64.zip` - Windows

## Build Output

| Platform | Filename | Format |
|----------|----------|--------|
| macOS | `treefrog-macos-universal.dmg` | Disk image |
| Linux | `treefrog-linux-x86_64.tar.gz` | Compressed archive |
| Windows | `treefrog-windows-x64.zip` | ZIP archive |

## Workflow Configuration

### Triggers

The workflow executes when:
- A version tag is pushed (format: `v*`)
- Manual trigger from GitHub Actions interface

### Build Characteristics

- Parallel platform builds
- Independent platform compilation (failures do not block other platforms)
- Automatic GitHub Release creation
- Auto-generated release notes from commit history
- Memory allocation: 4GB (prevents Node.js out-of-memory errors)
- Ubuntu 24.04 webkit2gtk compatibility detection

### Supported Platforms

- macOS: Universal binary (Intel and Apple Silicon)
- Linux: x86_64
- Windows: x64

## Tag Format

Tags must follow semantic versioning with `v` prefix:

```bash
# Valid
git tag v1.0.0
git tag v2.1.3
git tag v1.0.0-beta

# Invalid (will not trigger release)
git tag 1.0.0
git tag release-1.0.0
```

## Best Practices

1. Use semantic versioning (`v1.0.0`, `v2.3.4`)
2. Verify tests pass before tagging
3. Update CHANGELOG before creating release
4. Avoid deleting or recreating tags after push

## Commands Reference

### Create Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Create Pre-release

```bash
git tag v1.0.0-beta
git push origin v1.0.0-beta
```

### List Tags

```bash
git tag -l
```

### Delete Local Tag

```bash
git tag -d v1.0.0
```

### Delete Remote Tag

```bash
git push origin --delete v1.0.0
```

## Troubleshooting

### Linux Build Failure

Verify Ubuntu 24.04 webkit2gtk compatibility. The workflow auto-detects and installs correct packages.

### macOS Build Failure

Check build logs for specific errors. Typically temporary; retry the tag push.

### Windows Build Failure

7z should be pre-installed on Windows runners. Verify error in build logs.

### Release Not Created

Verify tag format matches pattern `v*` (e.g., `v1.0.0`). Tags not matching this pattern will not trigger release creation.

## Configuration

Configuration file: `.github/workflows/build-release.yml`

For detailed workflow configuration, see [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md).
