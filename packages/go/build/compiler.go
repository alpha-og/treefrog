package build

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
)

// Compiler is the interface for LaTeX compilers
type Compiler interface {
	Compile(build *Build) error
	Close() error
}

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

func (c *DockerCompiler) Close() error {
	if c.dockerClient != nil {
		return c.dockerClient.Close()
	}
	return nil
}

func (c *DockerCompiler) Compile(build *Build) error {
	ctx := context.Background()

	buildDir := filepath.Join(c.workDir, build.UserID, build.ID)

	engineFlag := "pdf"
	if build.Engine == EnginePDFLaTeX {
		engineFlag = "pdf"
	} else if build.Engine == EngineXeLaTeX {
		engineFlag = "xelatex"
	} else if build.Engine == EngineLuaLaTeX {
		engineFlag = "lualatex"
	}

	shellEscapeFlag := ""
	if build.ShellEscape {
		shellEscapeFlag = "-shell-escape "
	}

	script := fmt.Sprintf(`#!/bin/bash
set -e
cd /data
unzip -o source.zip
latexmk -%s %s-interaction=nonstopmode -outdir=output %s
if [ -f output/output.pdf ]; then
    cp output/output.pdf .
fi
if [ -f output/output.synctex.gz ]; then
    cp output/output.synctex.gz .
fi
exit 0
`, engineFlag, shellEscapeFlag, build.MainFile)

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
			"/tmp": fmt.Sprintf("size=%dm,mode=1777", ContainerTmpfsSizeMB),
		},
		AutoRemove: true,
		Resources: container.Resources{
			Memory:     ContainerMemoryMB * 1024 * 1024,
			MemorySwap: ContainerMemoryMB * 1024 * 1024,
			CPUQuota:   ContainerCPUQuota,
			CPUShares:  ContainerCPUShares,
			PidsLimit:  &[]int64{ContainerPidsLimit}[0],
		},
		NetworkMode: "none",
	}, nil, nil, "")

	if err != nil {
		return fmt.Errorf("failed to create container: %w", err)
	}

	if err := c.dockerClient.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	timeoutCtx, cancel := context.WithTimeout(ctx, MaxBuildTimeout)
	defer cancel()

	statusCh, errCh := c.dockerClient.ContainerWait(timeoutCtx, resp.ID, container.WaitConditionNotRunning)

	select {
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("container error: %w", err)
		}
	case <-timeoutCtx.Done():
		stopCtx, stopCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer stopCancel()

		if err := c.dockerClient.ContainerStop(stopCtx, resp.ID, container.StopOptions{}); err != nil {
			c.dockerClient.ContainerRemove(stopCtx, resp.ID, container.RemoveOptions{Force: true})
		}
		build.Status = StatusFailed
		build.ErrorMessage = "Compilation timeout (exceeded 10 minutes)"
		return fmt.Errorf("compilation timeout")
	case <-statusCh:
	}

	logs, err := c.dockerClient.ContainerLogs(ctx, resp.ID, container.LogsOptions{})
	if err != nil {
		return fmt.Errorf("failed to get logs: %w", err)
	}
	defer logs.Close()

	var stdout, stderr bytes.Buffer
	stdcopy.StdCopy(&stdout, &stderr, logs)
	logContent := stdout.String() + stderr.String()

	if len(logContent) > MaxLogSize {
		logContent = logContent[:MaxLogSize] + "\n[LOG TRUNCATED - exceeded 10MB]"
	}
	build.BuildLog = logContent

	pdfPath := filepath.Join(buildDir, "output.pdf")
	if _, err := os.Stat(pdfPath); err == nil {
		build.PDFPath = pdfPath
		build.Status = StatusCompleted
	} else {
		build.Status = StatusFailed
		build.ErrorMessage = "PDF not generated"
	}

	synctexPath := filepath.Join(buildDir, "output.synctex.gz")
	if _, err := os.Stat(synctexPath); err == nil {
		build.SyncTeXPath = synctexPath
	}

	build.UpdatedAt = time.Now()
	build.StorageBytes = CalculateDirSize(buildDir)

	return nil
}
