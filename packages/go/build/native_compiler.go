package build

import (
	"bytes"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// NativeCompiler compiles LaTeX directly on the filesystem (no Docker)
type NativeCompiler struct {
	workDir string
}

// NewNativeCompiler creates a new native compiler
func NewNativeCompiler(workDir string) (*NativeCompiler, error) {
	return &NativeCompiler{
		workDir: workDir,
	}, nil
}

// Close is a no-op for native compiler
func (c *NativeCompiler) Close() error {
	return nil
}

// Compile runs latexmk directly on the filesystem
func (c *NativeCompiler) Compile(build *Build) error {
	buildDir := filepath.Join(c.workDir, build.UserID, build.ID)

	// Ensure build directory exists
	if err := os.MkdirAll(buildDir, 0755); err != nil {
		return fmt.Errorf("failed to create build directory: %w", err)
	}

	// Unzip source files
	unzipCmd := exec.Command("unzip", "-o", filepath.Join(buildDir, "source.zip"), "-d", buildDir)
	if output, err := unzipCmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to unzip source: %w\n%s", err, string(output))
	}

	// Determine engine flag
	engineFlag := "-pdf"
	switch build.Engine {
	case EngineXeLaTeX:
		engineFlag = "-xelatex"
	case EngineLuaLaTeX:
		engineFlag = "-lualatex"
	}

	// Determine working directory for latexmk
	// If main file is in a subdirectory, run from there so relative includes work
	mainFileDir := buildDir
	mainFileName := build.MainFile
	if strings.Contains(build.MainFile, "/") {
		mainFileDir = filepath.Join(buildDir, filepath.Dir(build.MainFile))
		mainFileName = filepath.Base(build.MainFile)
	}

	// Build latexmk args
	outputDir := filepath.Join(buildDir, "output")
	args := []string{
		engineFlag,
		"-interaction=nonstopmode",
		"-synctex=1",
		"-outdir=" + outputDir,
	}

	if build.ShellEscape {
		args = append(args, "-shell-escape")
	}

	args = append(args, mainFileName)

	// Run latexmk from the main file's directory
	cmd := exec.Command("latexmk", args...)
	cmd.Dir = mainFileDir

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	logContent := stdout.String() + stderr.String()

	if len(logContent) > MaxLogSize {
		logContent = logContent[:MaxLogSize] + "\n[LOG TRUNCATED - exceeded 10MB]"
	}
	build.BuildLog = logContent

	if err != nil {
		build.Status = StatusFailed
		build.ErrorMessage = fmt.Sprintf("Compilation failed: %v", err)
		build.UpdatedAt = time.Now()
		return fmt.Errorf("compilation failed: %w", err)
	}

	// Check for output PDF - use main file name without extension
	mainBase := strings.TrimSuffix(mainFileName, filepath.Ext(mainFileName))
	pdfPath := filepath.Join(outputDir, mainBase+".pdf")
	if _, err := os.Stat(pdfPath); err != nil {
		// Fallback: try output.pdf
		pdfPath = filepath.Join(buildDir, "output", "output.pdf")
	}
	if _, err := os.Stat(pdfPath); err == nil {
		// Copy to build dir root for consistency
		destPath := filepath.Join(buildDir, "output.pdf")
		if err := copyFile(pdfPath, destPath); err == nil {
			build.PDFPath = destPath
		} else {
			build.PDFPath = pdfPath
		}
		build.Status = StatusCompleted
	} else {
		build.Status = StatusFailed
		build.ErrorMessage = "PDF not generated"
	}

	// Check for SyncTeX - use main file name without extension
	synctexPath := filepath.Join(outputDir, mainBase+".synctex.gz")
	log.Printf("Looking for SyncTeX at: %s", synctexPath)
	if _, err := os.Stat(synctexPath); err != nil {
		// Fallback: try output.synctex.gz
		synctexPath = filepath.Join(outputDir, "output.synctex.gz")
		log.Printf("Fallback: looking for SyncTeX at: %s", synctexPath)
	}
	if _, err := os.Stat(synctexPath); err == nil {
		destPath := filepath.Join(buildDir, "output.synctex.gz")
		if err := copyFile(synctexPath, destPath); err == nil {
			build.SyncTeXPath = destPath
			log.Printf("SyncTeX copied to: %s", destPath)
		} else {
			build.SyncTeXPath = synctexPath
			log.Printf("SyncTeX using original path: %s", synctexPath)
		}
	} else {
		log.Printf("SyncTeX not found: %v", err)
	}

	build.UpdatedAt = time.Now()
	build.StorageBytes = CalculateDirSize(buildDir)

	return nil
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}
