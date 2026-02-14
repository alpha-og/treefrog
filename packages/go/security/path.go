package security

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func HasPathTraversal(filename string) bool {
	if strings.Contains(filename, "..") {
		return true
	}
	if strings.Contains(filename, "/") || strings.Contains(filename, "\\") {
		return true
	}
	if strings.Contains(filename, "\x00") {
		return true
	}
	decoded := strings.ReplaceAll(filename, "%2e", ".")
	decoded = strings.ReplaceAll(decoded, "%2E", ".")
	decoded = strings.ReplaceAll(decoded, "%2f", "/")
	decoded = strings.ReplaceAll(decoded, "%2F", "/")
	decoded = strings.ReplaceAll(decoded, "%5c", "\\")
	decoded = strings.ReplaceAll(decoded, "%5C", "\\")
	if strings.Contains(decoded, "..") || strings.Contains(decoded, "/") || strings.Contains(decoded, "\\") {
		return true
	}
	return false
}

func SafePath(base, rel string) (string, error) {
	if HasPathTraversal(rel) {
		return "", fmt.Errorf("path traversal detected in %q", rel)
	}

	root := filepath.Clean(base)
	abs := filepath.Join(root, rel)
	abs = filepath.Clean(abs)

	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return "", fmt.Errorf("failed to resolve root path: %w", err)
	}

	absResolved, err := filepath.Abs(abs)
	if err != nil {
		return "", fmt.Errorf("failed to resolve absolute path: %w", err)
	}

	if !strings.HasPrefix(absResolved, rootAbs+string(os.PathSeparator)) && absResolved != rootAbs {
		return "", fmt.Errorf("path outside project root")
	}

	return abs, nil
}

func ValidateFilePath(baseDir, filePath string) error {
	cleanPath := filepath.Clean(filePath)
	cleanBase := filepath.Clean(baseDir)

	if !strings.HasPrefix(cleanPath, cleanBase+string(os.PathSeparator)) && cleanPath != cleanBase {
		return fmt.Errorf("invalid file path '%s': potential path traversal attack", filePath)
	}
	return nil
}
