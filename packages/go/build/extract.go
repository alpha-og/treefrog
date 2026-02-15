package build

import (
	"archive/zip"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func ExtractZip(src, dest string) error {
	reader, err := zip.OpenReader(src)
	if err != nil {
		return fmt.Errorf("failed to open zip: %w", err)
	}
	defer reader.Close()

	destCleaned := filepath.Clean(dest)

	for _, file := range reader.File {
		path := filepath.Join(dest, file.Name)
		pathCleaned := filepath.Clean(path)

		if !strings.HasPrefix(pathCleaned, destCleaned+string(os.PathSeparator)) && pathCleaned != destCleaned {
			return fmt.Errorf("invalid file path '%s': potential path traversal attack", file.Name)
		}

		if file.FileInfo().IsDir() {
			if err := os.MkdirAll(pathCleaned, 0755); err != nil {
				return fmt.Errorf("failed to create directory: %w", err)
			}
			continue
		}

		if err := os.MkdirAll(filepath.Dir(pathCleaned), 0755); err != nil {
			return fmt.Errorf("failed to create parent directory: %w", err)
		}

		rc, err := file.Open()
		if err != nil {
			return fmt.Errorf("failed to open zip entry: %w", err)
		}

		f, err := os.OpenFile(pathCleaned, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil {
			rc.Close()
			return fmt.Errorf("failed to create file: %w", err)
		}

		_, err = io.Copy(f, rc)
		rc.Close()
		closeErr := f.Close()

		if err != nil {
			return fmt.Errorf("failed to write file: %w", err)
		}
		if closeErr != nil {
			return fmt.Errorf("failed to close file: %w", closeErr)
		}
	}

	return nil
}

func CalculateDirSize(path string) int64 {
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
