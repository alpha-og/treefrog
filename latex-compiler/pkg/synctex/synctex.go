package synctex

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

type ViewResult struct {
	Page int     `json:"page"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	File string  `json:"file"`
	Line int     `json:"line"`
}

type EditResult struct {
	File string `json:"file"`
	Line int    `json:"line"`
	Col  int    `json:"col"`
}

func isValidFilename(filename string) bool {
	validPattern := regexp.MustCompile(`^[a-zA-Z0-9._/-]+$`)
	return validPattern.MatchString(filename) &&
		!strings.Contains(filename, "..") &&
		len(filename) < 256
}

func validatePath(path string) error {
	cleanPath := filepath.Clean(path)
	if strings.Contains(cleanPath, "..") {
		return fmt.Errorf("path traversal detected")
	}
	if strings.ContainsAny(cleanPath, "\x00\r\n") {
		return fmt.Errorf("invalid characters in path")
	}
	return nil
}

func MakeRelative(baseDir, absPath string) string {
	if filepath.IsAbs(absPath) {
		if rel, err := filepath.Rel(baseDir, absPath); err == nil {
			return rel
		}
	}
	return absPath
}
