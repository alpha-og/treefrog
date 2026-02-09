package synctex

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

// ViewResult holds forward search results (tex -> pdf)
type ViewResult struct {
	Page int     `json:"page"`
	X    float64 `json:"x"`
	Y    float64 `json:"y"`
	File string  `json:"file"`
	Line int     `json:"line"`
}

// EditResult holds reverse search results (pdf -> tex)
type EditResult struct {
	File string `json:"file"`
	Line int    `json:"line"`
	Col  int    `json:"col"`
}

// isValidFilename validates that a filename contains only safe characters
func isValidFilename(filename string) bool {
	// Allow alphanumeric, dots, hyphens, underscores, and forward slashes
	// Reject null bytes, control characters, and shell metacharacters
	validPattern := regexp.MustCompile(`^[a-zA-Z0-9._/-]+$`)
	return validPattern.MatchString(filename) &&
		!strings.Contains(filename, "..") &&
		len(filename) < 256
}

// validatePath validates that a path is safe and doesn't contain traversal attempts
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

// ForwardSearch performs SyncTeX view (tex to pdf coordinates)
func ForwardSearch(workDir, pdfPath string, line int, file string, col int) (*ViewResult, error) {
	if col == 0 {
		col = 1
	}

	// Validate inputs to prevent command injection
	if !isValidFilename(file) {
		return nil, fmt.Errorf("invalid filename: %s", file)
	}
	if err := validatePath(pdfPath); err != nil {
		return nil, fmt.Errorf("invalid pdf path: %w", err)
	}
	if err := validatePath(workDir); err != nil {
		return nil, fmt.Errorf("invalid work directory: %w", err)
	}

	input := fmt.Sprintf("%d:%d:%s", line, col, file)
	cmd := exec.Command("synctex", "view", "-i", input, "-o", pdfPath)
	cmd.Dir = workDir

	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("synctex view failed: %w\n%s", err, out)
	}

	return ParseView(string(out))
}

// ReverseSearch performs SyncTeX edit (pdf coordinates to tex)
func ReverseSearch(workDir, pdfPath string, page int, x, y float64) (*EditResult, error) {
	// Validate inputs to prevent command injection
	if err := validatePath(pdfPath); err != nil {
		return nil, fmt.Errorf("invalid pdf path: %w", err)
	}
	if err := validatePath(workDir); err != nil {
		return nil, fmt.Errorf("invalid work directory: %w", err)
	}

	input := fmt.Sprintf("%d:%.2f:%.2f:%s", page, x, y, pdfPath)
	cmd := exec.Command("synctex", "edit", "-o", input)
	cmd.Dir = workDir

	out, err := cmd.CombinedOutput()
	if err != nil {
		return nil, fmt.Errorf("synctex edit failed: %w\n%s", err, out)
	}

	return ParseEdit(string(out))
}

// ParseView parses synctex view output
func ParseView(out string) (*ViewResult, error) {
	view := &ViewResult{}
	lines := strings.Split(out, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "Page:") {
			fmt.Sscanf(strings.TrimPrefix(line, "Page:"), "%d", &view.Page)
		}
		if strings.HasPrefix(line, "x:") {
			fmt.Sscanf(strings.TrimPrefix(line, "x:"), "%f", &view.X)
		}
		if strings.HasPrefix(line, "y:") {
			fmt.Sscanf(strings.TrimPrefix(line, "y:"), "%f", &view.Y)
		}
		if strings.HasPrefix(line, "Input:") {
			view.File = strings.TrimSpace(strings.TrimPrefix(line, "Input:"))
		}
		if strings.HasPrefix(line, "Line:") {
			fmt.Sscanf(strings.TrimPrefix(line, "Line:"), "%d", &view.Line)
		}
	}

	if view.Page == 0 {
		return nil, fmt.Errorf("missing page in synctex output")
	}

	return view, nil
}

// ParseEdit parses synctex edit output
func ParseEdit(out string) (*EditResult, error) {
	edit := &EditResult{}
	lines := strings.Split(out, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "Input:") {
			edit.File = strings.TrimSpace(strings.TrimPrefix(line, "Input:"))
		}
		if strings.HasPrefix(line, "Line:") {
			fmt.Sscanf(strings.TrimPrefix(line, "Line:"), "%d", &edit.Line)
		}
		if strings.HasPrefix(line, "Column:") {
			fmt.Sscanf(strings.TrimPrefix(line, "Column:"), "%d", &edit.Col)
		}
	}

	if edit.File == "" || edit.Line == 0 {
		return nil, fmt.Errorf("missing edit info in synctex output")
	}

	return edit, nil
}

// MakeRelative converts an absolute path to relative from base directory
func MakeRelative(baseDir, absPath string) string {
	if filepath.IsAbs(absPath) {
		if rel, err := filepath.Rel(baseDir, absPath); err == nil {
			return rel
		}
	}
	return absPath
}
