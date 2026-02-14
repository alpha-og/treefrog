package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/alpha-og/treefrog/apps/compiler/internal/auth"
	"github.com/alpha-og/treefrog/apps/compiler/internal/build"
	"github.com/alpha-og/treefrog/packages/go/security"
	"github.com/alpha-og/treefrog/packages/go/synctex"
	"github.com/go-chi/chi/v5"
	"github.com/sirupsen/logrus"
)

var synctexLog = logrus.WithField("component", "handlers/synctex")

func SyncTeXViewHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		buildRecord, err := buildStore.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		if buildRecord.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		if buildRecord.SyncTeXPath == "" {
			http.Error(w, "SyncTeX not available for this build", http.StatusNotFound)
			return
		}

		file := r.URL.Query().Get("file")
		lineStr := r.URL.Query().Get("line")
		colStr := r.URL.Query().Get("col")

		if file == "" || lineStr == "" {
			http.Error(w, "file and line parameters required", http.StatusBadRequest)
			return
		}

		if security.HasPathTraversal(file) {
			http.Error(w, "Invalid file path", http.StatusBadRequest)
			return
		}

		line, err := strconv.Atoi(lineStr)
		if err != nil || line < 1 {
			http.Error(w, "Invalid line number (must be >= 1)", http.StatusBadRequest)
			return
		}

		col := 0
		if colStr != "" {
			col, err = strconv.Atoi(colStr)
			if err != nil || col < 0 {
				http.Error(w, "Invalid column number", http.StatusBadRequest)
				return
			}
		}

		data, err := synctex.GetCachedSyncTeX(buildRecord.SyncTeXPath)
		if err != nil {
			synctexLog.WithError(err).Error("Failed to parse synctex file")
			http.Error(w, "Failed to parse SyncTeX data", http.StatusInternalServerError)
			return
		}

		result, err := data.ForwardSearch(file, line, col)
		if err != nil {
			synctexLog.WithError(err).WithFields(logrus.Fields{
				"file": file,
				"line": line,
				"col":  col,
			}).Debug("Forward search failed")
			http.Error(w, fmt.Sprintf("Forward search failed: %v", err), http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}

func SyncTeXEditHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		buildID := chi.URLParam(r, "id")
		if buildID == "" {
			http.Error(w, "Build ID required", http.StatusBadRequest)
			return
		}

		userID, ok := auth.GetUserID(r)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		buildStore := build.NewStoreWithDB(dbInstance)
		buildRecord, err := buildStore.Get(buildID)
		if err != nil {
			http.Error(w, "Build not found", http.StatusNotFound)
			return
		}

		if buildRecord.UserID != userID {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}

		if buildRecord.SyncTeXPath == "" {
			http.Error(w, "SyncTeX not available for this build", http.StatusNotFound)
			return
		}

		pageStr := r.URL.Query().Get("page")
		xStr := r.URL.Query().Get("x")
		yStr := r.URL.Query().Get("y")

		if pageStr == "" || xStr == "" || yStr == "" {
			http.Error(w, "page, x, and y parameters required", http.StatusBadRequest)
			return
		}

		page, err := strconv.Atoi(pageStr)
		if err != nil || page < 1 {
			http.Error(w, "Invalid page number (must be >= 1)", http.StatusBadRequest)
			return
		}

		x, err := strconv.ParseFloat(xStr, 64)
		if err != nil || x < 0 {
			http.Error(w, "Invalid x coordinate (must be >= 0)", http.StatusBadRequest)
			return
		}

		y, err := strconv.ParseFloat(yStr, 64)
		if err != nil || y < 0 {
			http.Error(w, "Invalid y coordinate (must be >= 0)", http.StatusBadRequest)
			return
		}

		data, err := synctex.GetCachedSyncTeX(buildRecord.SyncTeXPath)
		if err != nil {
			synctexLog.WithError(err).Error("Failed to parse synctex file")
			http.Error(w, "Failed to parse SyncTeX data", http.StatusInternalServerError)
			return
		}

		result, err := data.ReverseSearch(page, x, y)
		if err != nil {
			synctexLog.WithError(err).WithFields(logrus.Fields{
				"page": page,
				"x":    x,
				"y":    y,
			}).Debug("Reverse search failed")
			http.Error(w, fmt.Sprintf("Reverse search failed: %v", err), http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
	}
}
