# Homebrew Tap Setup

This document explains how to set up the `homebrew-tap` repository for distributing Treefrog via Homebrew.

## Repository Setup

Create a new repository: `treefrog/homebrew-tap`

### Repository Structure

```
homebrew-tap/
├── README.md
├── Casks/
│   └── treefrog.rb
└── Formula/
    └── treefrog.rb
```

## macOS Cask (Casks/treefrog.rb)

The cask installs the pre-built DMG for macOS:

```ruby
cask "treefrog" do
  version "1.0.0"
  sha256 "CHECKSUM_FROM_RELEASE"

  url "https://github.com/alpha-og/treefrog/releases/download/v#{version}/treefrog-macos-universal.dmg"
  name "Treefrog"
  desc "A native LaTeX editor with remote compilation support and local Docker rendering"
  homepage "https://github.com/alpha-og/treefrog"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: ">= :catalina"

  app "treefrog.app"

  zap trash: [
    "~/Library/Application Support/com.treefrog.app",
    "~/Library/Caches/com.treefrog.app",
    "~/Library/HTTPStorages/com.treefrog.app",
    "~/Library/Preferences/com.treefrog.app.plist",
    "~/Library/Saved Application State/com.treefrog.app.savedState",
  ]

  caveats do
    requires_rosetta
  end
end
```

## Linux Formula (Formula/treefrog.rb)

The formula installs the pre-built binary for Linux:

```ruby
class Treefrog < Formula
  desc "A native LaTeX editor with remote compilation support and local Docker rendering"
  homepage "https://github.com/alpha-og/treefrog"
  version "1.0.0"
  license "MIT"

  on_macos do
    on_intel do
      url "https://github.com/alpha-og/treefrog/releases/download/v#{version}/treefrog-macos-universal.dmg"
      sha256 "CHECKSUM_FROM_RELEASE"
    end
    on_arm do
      url "https://github.com/alpha-og/treefrog/releases/download/v#{version}/treefrog-macos-universal.dmg"
      sha256 "CHECKSUM_FROM_RELEASE"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/alpha-og/treefrog/releases/download/v#{version}/treefrog-linux-x86_64.tar.gz"
      sha256 "CHECKSUM_FROM_RELEASE"
    end
    on_arm do
      url "https://github.com/alpha-og/treefrog/releases/download/v#{version}/treefrog-linux-arm64.tar.gz"
      sha256 "CHECKSUM_FROM_RELEASE"
    end
  end

  depends_on "gtk3"
  depends_on "webkit2gtk" if OS.linux?

  def install
    if OS.mac?
      prefix.install "treefrog.app"
      bin.install_symlink prefix/"treefrog.app/Contents/MacOS/treefrog"
    else
      bin.install "treefrog"
    end
  end

  test do
    assert_match "treefrog version", shell_output("#{bin}/treefrog --version", 1)
  end
end
```

## README for the Tap Repository

```markdown
# treefrog/homebrew-tap

Homebrew tap for [Treefrog](https://github.com/alpha-og/treefrog) - A native LaTeX editor.

## Installation

```bash
brew install treefrog/tap/treefrog
```

Or:

```bash
brew tap treefrog/tap
brew install treefrog
```

## Requirements

- macOS 10.15 (Catalina) or later
- Linux with GTK3 and WebKit2GTK

## Documentation

See [github.com/alpha-og/treefrog](https://github.com/alpha-og/treefrog) for more information.
```

## Updating the Tap

When a new version is released:

1. Update the `version` in both files
2. Download the new release files
3. Calculate SHA256 checksums:
   ```bash
   shasum -a 256 treefrog-macos-universal.dmg
   sha256sum treefrog-linux-x86_64.tar.gz
   ```
4. Update the `sha256` values
5. Commit and push to the tap repository

## Automation (Optional)

Create a GitHub workflow in the tap repository to auto-update:

```yaml
# .github/workflows/update.yml
name: Update Formula

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Get latest release
        id: release
        run: |
          VERSION=$(curl -s https://api.github.com/repos/alpha-og/treefrog/releases/latest | jq -r .tag_name)
          echo "version=${VERSION#v}" >> $GITHUB_OUTPUT
      
      - name: Update Cask
        run: |
          VERSION="${{ steps.release.outputs.version }}"
          # Download and calculate checksums, update files...
          
      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v5
        with:
          title: "Update to v${{ steps.release.outputs.version }}"
          branch: "update-${{ steps.release.outputs.version }}"
```

## Testing Locally

Before committing:

```bash
# Audit the cask
brew audit --cask Casks/treefrog.rb

# Audit the formula
brew audit --formula Formula/treefrog.rb

# Test install locally
brew install --cask Casks/treefrog.rb
brew install --formula Formula/treefrog.rb
```
