# Treefrog Release Workflow Guide

## Quick Start: Creating a Release

### Step 1: Tag the Commit
```bash
git tag v1.0.0
git push origin v1.0.0
```

That's it! The GitHub Actions workflow will automatically:
- Build for all platforms (macOS, Linux, Windows) in parallel
- Create platform-specific installers
- Generate a GitHub Release with all binaries

### Step 2: Monitor the Build
1. Go to your GitHub repository
2. Click the **Actions** tab
3. Watch the "Build and Release" workflow run
4. Builds typically complete in 20-30 minutes

### Step 3: Download Releases
1. Go to **Releases** tab
2. Find your newly created release (e.g., v1.0.0)
3. Download the binaries:
   - `treefrog-macos-universal.dmg` - macOS (Intel + Apple Silicon)
   - `treefrog-linux-x86_64.tar.gz` - Linux
   - `treefrog-windows-x64.zip` - Windows

---

## Workflow Details

### Platform Builds
| Platform | File | Install |
|----------|------|---------|
| **macOS** | `treefrog-macos-universal.dmg` | Double-click → drag to Applications |
| **Linux** | `treefrog-linux-x86_64.tar.gz` | `tar -xzf` → `./treefrog` |
| **Windows** | `treefrog-windows-x64.zip` | Unzip → `treefrog.exe` |

### Build Features
- ✅ **Parallel builds** - All platforms build simultaneously
- ✅ **Resilient** - One platform failing doesn't block others
- ✅ **Auto-release** - GitHub Release created automatically
- ✅ **Release notes** - Auto-generated from git commits
- ✅ **Ubuntu 24.04 compatible** - Detects and installs correct webkit packages
- ✅ **Memory managed** - 4GB allocated to prevent Node.js OOM errors

### Triggers
The workflow runs when:
1. A version tag is pushed (e.g., `git tag v1.0.0 && git push origin v1.0.0`)
2. Manually triggered from GitHub Actions UI

---

## Troubleshooting

### Build Failed on Linux
**Check**: Ubuntu 24.04 webkit2gtk compatibility
**Solution**: The workflow auto-detects and handles this. No manual action needed.

### Build Failed on macOS
**Check**: Go or Wails CLI installation
**Solution**: Check the build logs for specific error. Usually a temporary issue; retry the tag push.

### Windows Build Failed
**Check**: 7z availability (should be pre-installed)
**Solution**: This is rare on Windows runners. Check logs for specific error.

### Release Not Created
**Check**: Tag format must start with `v` (e.g., `v1.0.0`)
**Solution**: If tags don't match the pattern `v*`, release won't be created. Retry with correct tag.

---

## Best Practices

1. **Use semantic versioning**: `v1.0.0`, `v2.3.4`, etc.
2. **Test before tagging**: Ensure tests pass before pushing a release tag
3. **Update CHANGELOG**: Add notes about changes before tagging
4. **Keep tags clean**: Don't delete/recreate tags after pushing

---

## What's New (Latest Optimization)

- **Single macOS binary** - Now builds `darwin/universal` instead of separate Intel/ARM
- **Better memory handling** - 4GB allocated to Node.js for large builds
- **Resilient builds** - If one platform fails, others still complete
- **Ubuntu 24.04 support** - Automatically detects and installs correct webkit packages
- **Git submodules** - Proper support for nested repos

---

## Commands Reference

### Create a Release
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Create a Pre-release
```bash
git tag v1.0.0-beta
git push origin v1.0.0-beta
```

### List All Tags
```bash
git tag -l
```

### Delete a Local Tag
```bash
git tag -d v1.0.0
```

### Delete a Remote Tag
```bash
git push origin --delete v1.0.0
```

---

## Support

For workflow issues, check:
- `.github/workflows/build-release.yml` - Workflow configuration
- GitHub Actions logs - Detailed build output
- `GITHUB_ACTIONS_SETUP.md` - Detailed workflow documentation
