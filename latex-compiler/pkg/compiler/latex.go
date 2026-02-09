package compiler

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Engine represents LaTeX compilation engines
type Engine string

const (
	PDFLaTeX Engine = "pdflatex"
	XeLaTeX  Engine = "xelatex"
	LuaLaTeX Engine = "lualatex"
)

// CompileOptions holds compilation settings
type CompileOptions struct {
	WorkDir     string
	MainFile    string
	Engine      Engine
	ShellEscape bool
	BuildDir    string // For TEXINPUTS
}

// Compile runs latexmk to compile LaTeX to PDF
func Compile(ctx context.Context, opts CompileOptions) ([]byte, error) {
	mainFile := filepath.Clean(opts.MainFile)
	if strings.HasPrefix(mainFile, "..") || filepath.IsAbs(mainFile) {
		return nil, fmt.Errorf("invalid main file path")
	}

	workingDir := opts.WorkDir
	if dir := filepath.Dir(mainFile); dir != "." {
		workingDir = filepath.Join(opts.WorkDir, dir)
		mainFile = filepath.Base(mainFile)
	}

	args := []string{"-interaction=nonstopmode", "-synctex=1"}

	switch opts.Engine {
	case XeLaTeX:
		args = append(args, "-xelatex")
	case LuaLaTeX:
		args = append(args, "-lualatex")
	default:
		args = append(args, "-pdf")
	}

	if opts.ShellEscape {
		args = append(args, "-shell-escape")
	} else {
		args = append(args, "-no-shell-escape")
	}

	args = append(args, mainFile)

	cmd := exec.CommandContext(ctx, "latexmk", args...)
	cmd.Dir = workingDir

	// Set LaTeX search paths
	if opts.BuildDir != "" {
		texInputs := fmt.Sprintf(".:%s//:", opts.BuildDir)
		cmd.Env = append(os.Environ(),
			"TEXINPUTS="+texInputs,
			"BIBINPUTS="+texInputs,
			"BSTINPUTS="+texInputs,
		)
	}

	return cmd.CombinedOutput()
}

// GetPDFPath returns the expected PDF output path for a .tex file
func GetPDFPath(texPath string) string {
	base := filepath.Base(texPath)
	ext := filepath.Ext(base)
	return base[:len(base)-len(ext)] + ".pdf"
}
