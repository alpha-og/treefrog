package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// latex-local is a thin wrapper that runs the LaTeX compiler in a Docker container
// Usage: latex-local <project-directory>

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: latex-local <project-directory>")
		fmt.Println("Runs latexmk in a Docker container on the specified project")
		os.Exit(1)
	}

	projectDir := os.Args[1]
	absPath, err := filepath.Abs(projectDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error resolving path: %v\n", err)
		os.Exit(1)
	}

	// Check if directory exists
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "Directory not found: %s\n", absPath)
		os.Exit(1)
	}

	// Run container with project mounted
	cmd := exec.Command("docker", "run", "--rm",
		"-v", fmt.Sprintf("%s:/project", absPath),
		"-w", "/project",
		"treefrog-renderer:latest",
		"latexmk", "-pdf", "-interaction=nonstopmode", "main.tex")

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Compilation failed: %v\n", err)
		os.Exit(1)
	}
}
