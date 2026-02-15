package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

const (
	defaultImage   = "treefrog-local-latex-compiler:latest"
	defaultEngine  = "pdflatex"
	defaultTimeout = 5 * time.Minute
	version        = "1.0.0"
)

func main() {
	var (
		inputFile   = flag.String("input", "main.tex", "Main LaTeX file to compile")
		engine      = flag.String("engine", defaultEngine, "LaTeX engine: pdflatex, xelatex, lualatex")
		image       = flag.String("image", defaultImage, "Docker image to use")
		timeout     = flag.Duration("timeout", defaultTimeout, "Compilation timeout")
		showVersion = flag.Bool("version", false, "Show version information")
		help        = flag.Bool("help", false, "Show help")
	)
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "latex-local - Compile LaTeX documents in Docker\n\n")
		fmt.Fprintf(os.Stderr, "Usage: latex-local [options] <project-directory>\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		flag.PrintDefaults()
	}
	flag.Parse()

	if *showVersion {
		fmt.Printf("latex-local version %s\n", version)
		os.Exit(0)
	}

	if *help {
		flag.Usage()
		os.Exit(0)
	}

	if flag.NArg() < 1 {
		flag.Usage()
		os.Exit(1)
	}

	projectDir := flag.Arg(0)

	if err := validateEngine(*engine); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	absPath, err := filepath.Abs(projectDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error resolving path: %v\n", err)
		os.Exit(1)
	}

	if err := validatePath(absPath); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	if err := checkDockerAvailable(); err != nil {
		fmt.Fprintf(os.Stderr, "Docker not available: %v\n", err)
		fmt.Fprintf(os.Stderr, "Please ensure Docker is installed and running.\n")
		os.Exit(1)
	}

	inputPath := filepath.Join(absPath, *inputFile)
	if _, err := os.Stat(inputPath); os.IsNotExist(err) {
		fmt.Fprintf(os.Stderr, "Input file not found: %s\n", inputPath)
		os.Exit(1)
	}

	if err := runCompilation(absPath, *inputFile, *engine, *image, *timeout); err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			os.Exit(exitErr.ExitCode())
		}
		fmt.Fprintf(os.Stderr, "Compilation failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\nCompilation successful!")
}

func validateEngine(engine string) error {
	validEngines := map[string]bool{
		"pdflatex": true,
		"xelatex":  true,
		"lualatex": true,
	}
	engine = strings.ToLower(engine)
	if !validEngines[engine] {
		return fmt.Errorf("invalid engine '%s'. Must be one of: pdflatex, xelatex, lualatex", engine)
	}
	return nil
}

func validatePath(path string) error {
	evaluated, err := filepath.EvalSymlinks(path)
	if err != nil {
		return fmt.Errorf("cannot evaluate path: %w", err)
	}

	cleanPath := filepath.Clean(evaluated)
	if strings.Contains(cleanPath, "..") {
		return fmt.Errorf("invalid path: path traversal detected")
	}

	info, err := os.Stat(cleanPath)
	if err != nil {
		return fmt.Errorf("cannot access path: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("path is not a directory: %s", cleanPath)
	}

	return nil
}

func checkDockerAvailable() error {
	cmd := exec.Command("docker", "version")
	cmd.Stdout = nil
	cmd.Stderr = nil
	return cmd.Run()
}

func runCompilation(projectDir, inputFile, engine, image string, timeout time.Duration) error {
	args := []string{
		"run", "--rm",
		"-v", fmt.Sprintf("%s:/project", projectDir),
		"-w", "/project",
		"--memory=2g",
		"--cpus=2",
		fmt.Sprintf("--timeout=%d", int(timeout.Seconds())),
		image,
		"latexmk", "-pdf", "-interaction=nonstopmode",
		fmt.Sprintf("-pdflatex=%s", engine),
		inputFile,
	}

	cmd := exec.Command("docker", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	fmt.Printf("Compiling %s with %s...\n", inputFile, engine)
	return cmd.Run()
}
