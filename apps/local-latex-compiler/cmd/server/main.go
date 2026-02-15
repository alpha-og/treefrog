package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/alpha-og/treefrog/apps/local-latex-compiler/internal/cleanup"
	"github.com/alpha-og/treefrog/apps/local-latex-compiler/internal/config"
	"github.com/alpha-og/treefrog/apps/local-latex-compiler/internal/storage"
	"github.com/alpha-og/treefrog/packages/go/build"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/sirupsen/logrus"
)

var logger = logrus.New()

func main() {
	cfg := config.Load()

	logger.SetLevel(logrus.InfoLevel)
	logger.SetFormatter(&logrus.JSONFormatter{})

	logger.WithFields(logrus.Fields{
		"port":    cfg.Server.Port,
		"workDir": cfg.Build.WorkDir,
	}).Info("Local LaTeX Compiler starting")

	store, err := storage.NewStore(cfg.Build.WorkDir)
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize storage")
	}

	compiler, err := build.NewDockerCompiler("treefrog-local-latex-compiler:latest", cfg.Build.WorkDir)
	if err != nil {
		logger.WithError(err).Fatal("Failed to initialize Docker compiler")
	}
	defer compiler.Close()

	var cleanupEngine *cleanup.Engine
	if cfg.Cleanup.Enabled {
		cleanupEngine = cleanup.NewEngine(store, cfg.Cleanup.Interval, cfg.Cleanup.TTL)
		cleanupEngine.Start()
		defer cleanupEngine.Stop()
	}

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.AllowAll().Handler)

	r.Get("/health", HealthHandler())
	r.Post("/api/build", CreateBuildHandler(store, compiler))
	r.Get("/api/build/{id}", GetBuildHandler(store))
	r.Get("/api/build/{id}/status", GetStatusHandler(store))
	r.Get("/api/build/{id}/pdf", ServePDFHandler(store))
	r.Get("/api/build/{id}/log", ServeLogHandler(store))
	r.Get("/api/build/{id}/synctex", ServeSyncTeXHandler(store))
	r.Get("/api/build/{id}/synctex/view", SyncTeXViewHandler(store))
	r.Get("/api/build/{id}/synctex/edit", SyncTeXEditHandler(store))

	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	go func() {
		logger.WithField("addr", srv.Addr).Info("Server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.WithError(err).Fatal("Server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutdown signal received")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.WithError(err).Error("Server shutdown error")
	}

	logger.Info("Server stopped")
}
