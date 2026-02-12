package main

import (
	"embed"
	"os"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	// Check for protocol URL in command line args (Windows/Linux)
	args := os.Args[1:]
	if len(args) > 0 {
		for _, arg := range args {
			if strings.HasPrefix(arg, "treefrog://") {
				go app.handleCustomProtocol(arg)
			}
		}
	}

	err := wails.Run(&options.App{
		Title:     "Treefrog",
		Width:     1400,
		Height:    900,
		MinWidth:  800,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Menu:             app.menu(),
		Bind: []interface{}{
			app,
		},
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: false,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            false,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
			Appearance:           mac.DefaultAppearance,
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
			OnUrlOpen: func(url string) {
				app.handleCustomProtocol(url)
			},
		},
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId:               "treefrog-app-8f4e2a1b-c9d3-4e7f-a5b6-8c2d1e9f0a3b",
			OnSecondInstanceLaunch: app.onSecondInstanceLaunch,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

// handleCustomProtocol processes treefrog:// URLs
func (a *App) handleCustomProtocol(url string) {
	Logger.WithField("url", url).Info("Custom protocol URL received")

	if strings.HasPrefix(url, "treefrog://auth/callback") {
		if err := a.HandleAuthCallback(url); err != nil {
			Logger.WithError(err).Error("Failed to handle auth callback")
		}
		return
	}

	Logger.WithField("url", url).Warn("Unknown custom protocol URL")
}

// onSecondInstanceLaunch handles when a second instance is launched with args
func (a *App) onSecondInstanceLaunch(secondInstanceData options.SecondInstanceData) {
	Logger.WithField("args", secondInstanceData.Args).Info("Second instance launched")

	for _, arg := range secondInstanceData.Args {
		if strings.HasPrefix(arg, "treefrog://") {
			a.handleCustomProtocol(arg)
		}
	}
}
