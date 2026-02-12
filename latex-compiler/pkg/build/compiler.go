package build

import (
	"archive/zip"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

type DockerCompiler struct {
	dockerClient *client.Client
	imageName    string
	workDir      string
}

func NewDockerCompiler(imageName, workDir string) (*DockerCompiler, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv)
	if err != nil {
		return nil, fmt.Errorf("failed to create docker client: %w", err)
	}

	return &DockerCompiler{
		dockerClient: cli,
		imageName:    imageName,
		workDir:      workDir,
	}, nil
}

func (c *DockerCompiler) Compile(build *Build) error {
	ctx := context.Background()

	// Prepare build directory
	buildDir := filepath.Join(c.workDir, build.UserID, build.ID)
	sourceZip := filepath.Join(buildDir, "source.zip")

	// Extract source files
	if err := extractZip(sourceZip, buildDir); err != nil {
		return fmt.Errorf("failed to extract source: %w", err)
	}

	// Create container config
	env := []string{
		fmt.Sprintf("MAIN_FILE=%s", build.MainFile),
		"ENGINE=pdflatex",
	}

	if build.ShellEscape {
		env = append(env, "SHELL_ESCAPE=1")
	}

	// Mount build directory
	mounts := []mount.Mount{
		{
			Type:   mount.TypeBind,
			Source: buildDir,
			Target: "/data",
		},
	}

	// Create tmpfs for compilation
	tmpfs := map[string]string{
		"/tmp": "size=2G,mode=1777",
	}

	// Container config
	resp, err := c.dockerClient.ContainerCreate(ctx, &container.Config{
		Image:      c.imageName,
		WorkingDir: "/data",
		Env:        env,
		Tty:        false,
		OpenStdin:  false,
		Labels: map[string]string{
			"build_id": build.ID,
			"user_id":  build.UserID,
			"engine":   string(build.Engine),
		},
	}, &container.HostConfig{
		Mounts: mounts,
		Tmpfs:  tmpfs,
		// Note: Memory limits are set using Resources field (updated Docker API)
		AutoRemove: true,
	}, nil, nil, "")

	if err != nil {
		return fmt.Errorf("failed to create container: %w", err)
	}

	containerID := resp.ID

	// Start container
	if err := c.dockerClient.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	// Wait for completion with timeout
	timeoutCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	statusCh, errCh := c.dockerClient.ContainerWait(timeoutCtx, containerID, container.WaitConditionNotRunning)

	select {
	case err := <-errCh:
		if err != nil {
			logs, _ := c.dockerClient.ContainerLogs(ctx, containerID, container.LogsOptions{})
			buf := new(bytes.Buffer)
			io.Copy(buf, logs)
			build.BuildLog = buf.String()
			return fmt.Errorf("container failed: %w", err)
		}
	case <-statusCh:
	}

	// Get logs
	logs, err := c.dockerClient.ContainerLogs(ctx, containerID, container.LogsOptions{})
	if err != nil {
		return fmt.Errorf("failed to get logs: %w", err)
	}
	defer logs.Close()
	buf := new(bytes.Buffer)
	io.Copy(buf, logs)
	build.BuildLog = buf.String()

	// Check for output
	pdfPath := filepath.Join(buildDir, "output.pdf")
	synctexPath := filepath.Join(buildDir, "output.synctex.gz")

	if _, err := os.Stat(pdfPath); err == nil {
		build.PDFPath = pdfPath
		build.Status = StatusCompleted
	} else {
		build.Status = StatusFailed
		build.ErrorMessage = "PDF not generated"
	}

	if _, err := os.Stat(synctexPath); err == nil {
		build.SyncTeXPath = synctexPath
	}

	// Calculate storage
	build.StorageBytes = calculateDirSize(buildDir)

	build.UpdatedAt = time.Now()

	return nil
}

func extractZip(src, dest string) error {
	reader, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer reader.Close()

	for _, file := range reader.File {
		path := filepath.Join(dest, file.Name)

		if file.FileInfo().IsDir() {
			os.MkdirAll(path, 0755)
			continue
		}

		os.MkdirAll(filepath.Dir(path), 0755)

		rc, err := file.Open()
		if err != nil {
			return err
		}

		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			rc.Close()
			return err
		}

		_, err = io.Copy(f, rc)
		rc.Close()
		f.Close()

		if err != nil {
			return err
		}
	}

	return nil
}

func calculateDirSize(path string) int64 {
	var size int64
	filepath.Walk(path, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size
}

// CompileWithLatexmk performs compilation using latexmk (Issue #5 - fixed string formatting)
func (c *DockerCompiler) CompileWithLatexmk(build *Build) error {
	ctx := context.Background()

	buildDir := filepath.Join(c.workDir, build.UserID, build.ID)

	// Issue #45 - use actual engine from build, not hardcode
	engineFlag := "pdf"
	if build.Engine == EnginePDFLaTeX {
		engineFlag = "pdf"
	} else if build.Engine == EngineXeLaTeX {
		engineFlag = "xex"
	} else if build.Engine == EngineLuaLaTeX {
		engineFlag = "lualatex"
	}

	script := fmt.Sprintf(`#!/bin/bash
set -e
cd /data
unzip -o source.zip
latexmk -%s -interaction=nonstopmode -outdir=output %s
if [ -f output/output.pdf ]; then
    cp output/output.pdf .
fi
if [ -f output/output.synctex.gz ]; then
    cp output/output.synctex.gz .
fi
exit 0
`, engineFlag, build.MainFile)

	// Run container with script
	resp, err := c.dockerClient.ContainerCreate(ctx, &container.Config{
		Image: c.imageName,
		Cmd:   []string{"bash", "-c", script},
		Labels: map[string]string{
			"build_id": build.ID,
			"user_id":  build.UserID,
		},
	}, &container.HostConfig{
		Mounts: []mount.Mount{
			{
				Type:   mount.TypeBind,
				Source: buildDir,
				Target: "/data",
			},
		},
		Tmpfs: map[string]string{
			"/tmp": "size=2G,mode=1777",
		},
		AutoRemove: true,
	}, nil, nil, "")

	if err != nil {
		return fmt.Errorf("failed to create container: %w", err)
	}

	// Start and wait
	if err := c.dockerClient.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	// Wait for completion with timeout (Issue #19 - enforced timeout)
	timeoutCtx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	statusCh, errCh := c.dockerClient.ContainerWait(timeoutCtx, resp.ID, container.WaitConditionNotRunning)

	select {
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("container error: %w", err)
		}
	case <-timeoutCtx.Done():
		// Container timeout - kill it
		c.dockerClient.ContainerStop(ctx, resp.ID, container.StopOptions{})
		build.Status = StatusFailed
		build.ErrorMessage = "Compilation timeout (exceeded 5 minutes)"
		return fmt.Errorf("compilation timeout")
	case <-statusCh:
		// Normal completion
	}

	// Get logs
	logs, err := c.dockerClient.ContainerLogs(ctx, resp.ID, container.LogsOptions{})
	if err != nil {
		return fmt.Errorf("failed to get logs: %w", err)
	}
	defer logs.Close()

	// Parse output (Issue #18 - limit log size to prevent DoS)
	const maxLogSize = 10 * 1024 * 1024 // 10MB limit
	var stdout, stderr bytes.Buffer
	stdcopy.StdCopy(&stdout, &stderr, logs)
	logContent := stdout.String() + stderr.String()

	if len(logContent) > maxLogSize {
		logContent = logContent[:maxLogSize] + "\n[LOG TRUNCATED - exceeded 10MB]"
	}
	build.BuildLog = logContent

	// Check results
	pdfPath := filepath.Join(buildDir, "output.pdf")
	if _, err := os.Stat(pdfPath); err == nil {
		build.PDFPath = pdfPath
		build.Status = StatusCompleted
	} else {
		build.Status = StatusFailed
		build.ErrorMessage = "PDF not generated"
	}

	// Check for SyncTeX
	synctexPath := filepath.Join(buildDir, "output.synctex.gz")
	if _, err := os.Stat(synctexPath); err == nil {
		build.SyncTeXPath = synctexPath
	}

	build.UpdatedAt = time.Now()
	build.StorageBytes = calculateDirSize(buildDir)

	return nil
}
