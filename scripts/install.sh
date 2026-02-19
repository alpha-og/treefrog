#!/bin/bash
#
# Treefrog Installer Script
# https://github.com/alpha-og/treefrog
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/install.sh | bash -s -- --version v1.0.0
#   curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/install.sh | bash -s -- --prefix /usr/local
#

set -e

REPO="alpha-og/treefrog"
INSTALL_SCRIPT_VERSION="1.0.0"
DEFAULT_PREFIX="/usr/local"
BINARY_NAME="treefrog"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

print_banner() {
    echo -e "${BOLD}${BLUE}"
    echo "  _______            _     _______             _ "
    echo " |__   __|          | |   |__   __|           | |"
    echo "    | | ___  _ __ __| |      | |_ __ __ _  ___| |"
    echo "    | |/ _ \| '__/ _\` |      | | '__/ _\` |/ _ \\ |"
    echo "    | | (_) | | | (_| |      | | | | (_| |  __/ |"
    echo "    |_|\___/|_|  \__,_|      |_|_|  \__, |\___|_|"
    echo "                                     __/ |     "
    echo "                                    |___/      "
    echo -e "${NC}"
    echo -e "  LaTeX compilation made easy"
    echo ""
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "Treefrog Installer v${INSTALL_SCRIPT_VERSION}"
    echo ""
    echo "Usage: install.sh [options]"
    echo ""
    echo "Options:"
    echo "  --version VERSION    Install specific version (e.g., v1.0.0)"
    echo "  --prefix PATH        Install directory (default: /usr/local)"
    echo "  --no-checksum        Skip checksum verification"
    echo "  --force              Force reinstall if already installed"
    echo "  --uninstall          Remove treefrog from system"
    echo "  --dry-run            Show what would be done without making changes"
    echo "  --help               Show this help message"
    echo "  --version-only       Show installer version and exit"
    echo ""
    echo "Examples:"
    echo "  install.sh                           # Install latest version"
    echo "  install.sh --version v1.0.0          # Install specific version"
    echo "  install.sh --prefix ~/.local         # Install to custom location"
    echo "  install.sh --uninstall               # Uninstall treefrog"
    echo ""
}

detect_os() {
    local os
    case "$(uname -s)" in
        Darwin*)
            os="macos"
            ;;
        Linux*)
            if grep -qi microsoft /proc/version 2>/dev/null; then
                os="windows-wsl"
            else
                os="linux"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            os="windows"
            ;;
        *)
            print_error "Unsupported operating system: $(uname -s)"
            exit 1
            ;;
    esac
    echo "$os"
}

detect_arch() {
    local arch
    case "$(uname -m)" in
        x86_64|amd64)
            arch="x86_64"
            ;;
        arm64|aarch64)
            arch="arm64"
            ;;
        *)
            print_error "Unsupported architecture: $(uname -m)"
            exit 1
            ;;
    esac
    echo "$arch"
}

get_latest_version() {
    local version
    version=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
    if [ -z "$version" ]; then
        print_error "Failed to fetch latest version from GitHub"
        exit 1
    fi
    echo "$version"
}

get_download_url() {
    local version="$1"
    local os="$2"
    local arch="$3"
    
    local base_url="https://github.com/${REPO}/releases/download/${version}"
    local file
    
    case "$os" in
        macos)
            file="treefrog-macos-universal.dmg"
            ;;
        linux)
            file="treefrog-linux-${arch}.tar.gz"
            ;;
        windows-wsl)
            print_warning "WSL detected. Installing Linux binary..."
            file="treefrog-linux-${arch}.tar.gz"
            ;;
        windows)
            file="treefrog-windows-x64.zip"
            ;;
    esac
    
    echo "${base_url}/${file}"
}

get_checksum_url() {
    local version="$1"
    echo "https://github.com/${REPO}/releases/download/${version}/checksums.txt"
}

download_file() {
    local url="$1"
    local output="$2"
    
    print_info "Downloading: $url"
    
    if command -v curl &>/dev/null; then
        curl -fsSL "$url" -o "$output"
    elif command -v wget &>/dev/null; then
        wget -q "$url" -O "$output"
    else
        print_error "Neither curl nor wget is available"
        exit 1
    fi
}

verify_checksum() {
    local file="$1"
    local checksum_file="$2"
    local filename
    filename=$(basename "$file")
    
    if [ ! -f "$checksum_file" ]; then
        print_warning "Checksum file not found, skipping verification"
        return 0
    fi
    
    local expected_checksum
    expected_checksum=$(grep "$filename" "$checksum_file" | awk '{print $1}')
    
    if [ -z "$expected_checksum" ]; then
        print_warning "Checksum for $filename not found in checksum file"
        return 0
    fi
    
    local actual_checksum
    if command -v sha256sum &>/dev/null; then
        actual_checksum=$(sha256sum "$file" | awk '{print $1}')
    elif command -v shasum &>/dev/null; then
        actual_checksum=$(shasum -a 256 "$file" | awk '{print $1}')
    else
        print_warning "No SHA256 tool available, skipping verification"
        return 0
    fi
    
    if [ "$actual_checksum" != "$expected_checksum" ]; then
        print_error "Checksum verification failed!"
        print_error "Expected: $expected_checksum"
        print_error "Actual:   $actual_checksum"
        exit 1
    fi
    
    print_success "Checksum verified"
}

install_macos() {
    local dmg_file="$1"
    local prefix="$2"
    
    print_info "Mounting DMG..."
    local mount_point
    mount_point=$(hdiutil attach "$dmg_file" -readonly -nobrowse -mountpoint /Volumes/treefrog-install 2>&1 | grep "/Volumes/treefrog-install" | awk '{print $NF}')
    
    if [ -z "$mount_point" ]; then
        print_error "Failed to mount DMG"
        exit 1
    fi
    
    local app_path="${mount_point}/treefrog.app"
    local target_path="${prefix}/Applications/treefrog.app"
    
    print_info "Installing to ${prefix}/Applications..."
    
    if [ -d "$target_path" ] && [ "$FORCE" != "true" ]; then
        print_warning "treefrog.app already exists at $target_path"
        print_info "Use --force to reinstall"
        hdiutil detach "$mount_point" -quiet
        exit 0
    fi
    
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY-RUN] Would copy $app_path to ${prefix}/Applications/"
    else
        [ -d "$target_path" ] && rm -rf "$target_path"
        mkdir -p "${prefix}/Applications"
        cp -R "$app_path" "${prefix}/Applications/"
    fi
    
    print_info "Unmounting DMG..."
    hdiutil detach "$mount_point" -quiet
    
    local bin_path="${prefix}/bin/treefrog"
    local app_executable="${prefix}/Applications/treefrog.app/Contents/MacOS/treefrog"
    
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY-RUN] Would create symlink: $bin_path -> $app_executable"
    else
        mkdir -p "${prefix}/bin"
        ln -sf "$app_executable" "$bin_path"
    fi
    
    print_success "Installed treefrog to ${prefix}/Applications/treefrog.app"
    print_success "Created symlink: ${prefix}/bin/treefrog"
}

install_linux() {
    local tarball="$1"
    local prefix="$2"
    
    print_info "Extracting tarball..."
    
    local temp_dir
    temp_dir=$(mktemp -d)
    tar -xzf "$tarball" -C "$temp_dir"
    
    local binary="${temp_dir}/treefrog"
    
    if [ ! -f "$binary" ]; then
        print_error "Binary not found in tarball"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    local target="${prefix}/bin/treefrog"
    
    if [ -f "$target" ] && [ "$FORCE" != "true" ]; then
        print_warning "treefrog already installed at $target"
        print_info "Use --force to reinstall"
        rm -rf "$temp_dir"
        exit 0
    fi
    
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY-RUN] Would install binary to $target"
    else
        mkdir -p "${prefix}/bin"
        install -m 755 "$binary" "$target"
    fi
    
    rm -rf "$temp_dir"
    
    print_success "Installed treefrog to $target"
}

install_windows_wsl() {
    print_info "Installing for WSL..."
    install_linux "$1" "$2"
}

install_windows() {
    local zipfile="$1"
    local prefix="$2"
    
    print_info "Extracting ZIP..."
    
    local temp_dir
    temp_dir=$(mktemp -d)
    
    if command -v unzip &>/dev/null; then
        unzip -q "$zipfile" -d "$temp_dir"
    else
        print_error "unzip command not available"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    local binary="${temp_dir}/treefrog.exe"
    
    if [ ! -f "$binary" ]; then
        print_error "Binary not found in ZIP"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    local target="${prefix}/bin/treefrog.exe"
    
    if [ -f "$target" ] && [ "$FORCE" != "true" ]; then
        print_warning "treefrog already installed at $target"
        print_info "Use --force to reinstall"
        rm -rf "$temp_dir"
        exit 0
    fi
    
    if [ "$DRY_RUN" = "true" ]; then
        print_info "[DRY-RUN] Would install binary to $target"
    else
        mkdir -p "${prefix}/bin"
        install -m 755 "$binary" "$target"
    fi
    
    rm -rf "$temp_dir"
    
    print_success "Installed treefrog to $target"
}

uninstall() {
    local prefix="$1"
    local os="$2"
    
    print_info "Uninstalling treefrog..."
    
    case "$os" in
        macos)
            local app_path="${prefix}/Applications/treefrog.app"
            local bin_path="${prefix}/bin/treefrog"
            
            if [ -d "$app_path" ]; then
                if [ "$DRY_RUN" = "true" ]; then
                    print_info "[DRY-RUN] Would remove $app_path"
                else
                    rm -rf "$app_path"
                    print_success "Removed $app_path"
                fi
            fi
            
            if [ -L "$bin_path" ]; then
                if [ "$DRY_RUN" = "true" ]; then
                    print_info "[DRY-RUN] Would remove $bin_path"
                else
                    rm -f "$bin_path"
                    print_success "Removed $bin_path"
                fi
            fi
            ;;
        linux|windows-wsl)
            local bin_path="${prefix}/bin/treefrog"
            if [ -f "$bin_path" ]; then
                if [ "$DRY_RUN" = "true" ]; then
                    print_info "[DRY-RUN] Would remove $bin_path"
                else
                    rm -f "$bin_path"
                    print_success "Removed $bin_path"
                fi
            fi
            ;;
        windows)
            local bin_path="${prefix}/bin/treefrog.exe"
            if [ -f "$bin_path" ]; then
                if [ "$DRY_RUN" = "true" ]; then
                    print_info "[DRY-RUN] Would remove $bin_path"
                else
                    rm -f "$bin_path"
                    print_success "Removed $bin_path"
                fi
            fi
            ;;
    esac
    
    print_success "Treefrog has been uninstalled"
}

check_permissions() {
    local prefix="$1"
    
    if [ ! -d "$prefix" ]; then
        if [ "$DRY_RUN" = "true" ]; then
            print_info "[DRY-RUN] Would create directory $prefix"
            return
        fi
        mkdir -p "$prefix"
    fi
    
    if [ ! -w "$prefix" ]; then
        print_error "No write permission to $prefix"
        print_info "Try: sudo $0 $*"
        exit 1
    fi
}

main() {
    local VERSION=""
    local PREFIX="$DEFAULT_PREFIX"
    local NO_CHECKSUM="false"
    local FORCE="false"
    local UNINSTALL="false"
    local DRY_RUN="false"
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --version)
                VERSION="$2"
                shift 2
                ;;
            --prefix)
                PREFIX="$2"
                shift 2
                ;;
            --no-checksum)
                NO_CHECKSUM="true"
                shift
                ;;
            --force)
                FORCE="true"
                shift
                ;;
            --uninstall)
                UNINSTALL="true"
                shift
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            --version-only)
                echo "treefrog-installer v${INSTALL_SCRIPT_VERSION}"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    print_banner
    
    local OS
    OS=$(detect_os)
    
    local ARCH
    ARCH=$(detect_arch)
    
    print_info "Detected OS: $OS"
    print_info "Detected Architecture: $ARCH"
    
    if [ "$UNINSTALL" = "true" ]; then
        check_permissions "$PREFIX"
        uninstall "$PREFIX" "$OS"
        exit 0
    fi
    
    if [ -z "$VERSION" ]; then
        print_info "Fetching latest version..."
        VERSION=$(get_latest_version)
    fi
    
    print_info "Installing treefrog $VERSION"
    print_info "Install prefix: $PREFIX"
    
    check_permissions "$PREFIX"
    
    local DOWNLOAD_URL
    DOWNLOAD_URL=$(get_download_url "$VERSION" "$OS" "$ARCH")
    
    local TEMP_DIR
    TEMP_DIR=$(mktemp -d)
    local DOWNLOAD_FILE="${TEMP_DIR}/$(basename "$DOWNLOAD_URL")"
    local CHECKSUM_FILE="${TEMP_DIR}/checksums.txt"
    
    trap 'rm -rf "$TEMP_DIR"' EXIT
    
    download_file "$DOWNLOAD_URL" "$DOWNLOAD_FILE"
    
    if [ "$NO_CHECKSUM" != "true" ]; then
        download_file "$(get_checksum_url "$VERSION")" "$CHECKSUM_FILE" 2>/dev/null || true
        verify_checksum "$DOWNLOAD_FILE" "$CHECKSUM_FILE"
    fi
    
    case "$OS" in
        macos)
            install_macos "$DOWNLOAD_FILE" "$PREFIX"
            ;;
        linux)
            install_linux "$DOWNLOAD_FILE" "$PREFIX"
            ;;
        windows-wsl)
            install_windows_wsl "$DOWNLOAD_FILE" "$PREFIX"
            ;;
        windows)
            install_windows "$DOWNLOAD_FILE" "$PREFIX"
            ;;
    esac
    
    echo ""
    print_success "Installation complete!"
    echo ""
    echo "To get started:"
    echo "  ${PREFIX}/bin/treefrog"
    echo ""
    echo "Add to PATH (add to your shell config):"
    echo "  export PATH=\"${PREFIX}/bin:\$PATH\""
    echo ""
}

main "$@"