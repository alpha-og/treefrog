#!/bin/bash
#
# Treefrog Uninstaller Script
# https://github.com/alpha-og/treefrog
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/alpha-og/treefrog/main/scripts/uninstall.sh | bash
#   ./uninstall.sh --prefix /usr/local
#

set -e

DEFAULT_PREFIX="/usr/local"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo "Treefrog Uninstaller"
    echo ""
    echo "Usage: uninstall.sh [options]"
    echo ""
    echo "Options:"
    echo "  --prefix PATH   Uninstall from directory (default: /usr/local)"
    echo "  --help           Show this help message"
    echo ""
}

detect_os() {
    case "$(uname -s)" in
        Darwin*)
            echo "macos"
            ;;
        Linux*)
            if grep -qi microsoft /proc/version 2>/dev/null; then
                echo "windows-wsl"
            else
                echo "linux"
            fi
            ;;
        CYGWIN*|MINGW*|MSYS*)
            echo "windows"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

uninstall_macos() {
    local prefix="$1"
    local app_path="${prefix}/Applications/treefrog.app"
    local bin_path="${prefix}/bin/treefrog"
    local removed=false
    
    if [ -d "$app_path" ]; then
        rm -rf "$app_path"
        print_success "Removed $app_path"
        removed=true
    fi
    
    if [ -L "$bin_path" ] || [ -f "$bin_path" ]; then
        rm -f "$bin_path"
        print_success "Removed $bin_path"
        removed=true
    fi
    
    if [ "$removed" = "false" ]; then
        print_warning "Treefrog not found in $prefix"
    fi
}

uninstall_linux() {
    local prefix="$1"
    local bin_path="${prefix}/bin/treefrog"
    
    if [ -f "$bin_path" ]; then
        rm -f "$bin_path"
        print_success "Removed $bin_path"
    else
        print_warning "Treefrog not found in $bin_path"
    fi
}

uninstall_windows_wsl() {
    uninstall_linux "$1"
}

uninstall_windows() {
    local prefix="$1"
    local bin_path="${prefix}/bin/treefrog.exe"
    
    if [ -f "$bin_path" ]; then
        rm -f "$bin_path"
        print_success "Removed $bin_path"
    else
        print_warning "Treefrog not found in $bin_path"
    fi
}

main() {
    local PREFIX="$DEFAULT_PREFIX"
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --prefix)
                PREFIX="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    local OS
    OS=$(detect_os)
    
    print_info "Uninstalling treefrog from $PREFIX..."
    
    if [ ! -w "$PREFIX" ] 2>/dev/null; then
        print_error "No write permission to $PREFIX"
        print_info "Try: sudo $0 $*"
        exit 1
    fi
    
    case "$OS" in
        macos)
            uninstall_macos "$PREFIX"
            ;;
        linux)
            uninstall_linux "$PREFIX"
            ;;
        windows-wsl)
            uninstall_windows_wsl "$PREFIX"
            ;;
        windows)
            uninstall_windows "$PREFIX"
            ;;
        *)
            print_error "Unsupported operating system"
            exit 1
            ;;
    esac
    
    print_success "Uninstallation complete"
}

main "$@"