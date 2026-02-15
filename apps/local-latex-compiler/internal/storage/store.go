package storage

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/alpha-og/treefrog/packages/go/build"
)

type Store struct {
	workDir string
	mu      sync.RWMutex
	builds  map[string]*build.Build
}

func NewStore(workDir string) (*Store, error) {
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create work directory: %w", err)
	}

	s := &Store{
		workDir: workDir,
		builds:  make(map[string]*build.Build),
	}

	if err := s.recover(); err != nil {
		return nil, fmt.Errorf("failed to recover builds: %w", err)
	}

	return s, nil
}

func (s *Store) recover() error {
	entries, err := os.ReadDir(s.workDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		buildID := entry.Name()
		metaPath := filepath.Join(s.workDir, buildID, "build.json")

		data, err := os.ReadFile(metaPath)
		if err != nil {
			continue
		}

		var b build.Build
		if err := json.Unmarshal(data, &b); err != nil {
			continue
		}

		s.builds[buildID] = &b
	}

	return nil
}

func (s *Store) Create(id string, opts build.BuildOptions) (*build.Build, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	buildDir := filepath.Join(s.workDir, id)
	if err := os.MkdirAll(buildDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create build directory: %w", err)
	}

	b := &build.Build{
		ID:        id,
		Status:    build.StatusPending,
		Engine:    opts.Engine,
		MainFile:  opts.MainFile,
		DirPath:   buildDir,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	if err := s.save(b); err != nil {
		return nil, err
	}

	s.builds[id] = b
	return b, nil
}

func (s *Store) Get(id string) (*build.Build, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	b, ok := s.builds[id]
	if !ok {
		return nil, fmt.Errorf("build not found: %s", id)
	}

	return b, nil
}

func (s *Store) Update(b *build.Build) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	b.UpdatedAt = time.Now()
	if err := s.save(b); err != nil {
		return err
	}

	s.builds[b.ID] = b
	return nil
}

func (s *Store) save(b *build.Build) error {
	metaPath := filepath.Join(b.DirPath, "build.json")
	data, err := json.MarshalIndent(b, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal build: %w", err)
	}

	if err := os.WriteFile(metaPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write build metadata: %w", err)
	}

	return nil
}

func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	b, ok := s.builds[id]
	if !ok {
		return nil
	}

	buildDir := b.DirPath
	if err := os.RemoveAll(buildDir); err != nil {
		return fmt.Errorf("failed to remove build directory: %w", err)
	}

	delete(s.builds, id)
	return nil
}

func (s *Store) List() []*build.Build {
	s.mu.RLock()
	defer s.mu.RUnlock()

	builds := make([]*build.Build, 0, len(s.builds))
	for _, b := range s.builds {
		builds = append(builds, b)
	}
	return builds
}

func (s *Store) ListExpired() []*build.Build {
	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now()
	var expired []*build.Build
	for _, b := range s.builds {
		if !b.ExpiresAt.IsZero() && now.After(b.ExpiresAt) {
			expired = append(expired, b)
		}
	}
	return expired
}

func (s *Store) GetWorkDir() string {
	return s.workDir
}
