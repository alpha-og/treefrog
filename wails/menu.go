package main

import (
	"runtime"

	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	runtime2 "github.com/wailsapp/wails/v2/pkg/runtime"
)

// menu creates the application menu
func (a *App) menu() *menu.Menu {
	AppMenu := menu.NewMenu()

	// macOS needs AppMenu first
	if runtime.GOOS == "darwin" {
		AppMenu.Append(menu.AppMenu())
	}

	// File Menu
	FileMenu := AppMenu.AddSubmenu("File")
	FileMenu.AddText("Open Project", keys.CmdOrCtrl("o"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-open-project", nil)
	})
	FileMenu.AddSeparator()
	FileMenu.AddText("Go to Home", keys.CmdOrCtrl("h"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-go-home", nil)
	})
	FileMenu.AddSeparator()
	FileMenu.AddText("Exit", keys.CmdOrCtrl("q"), func(cd *menu.CallbackData) {
		runtime2.Quit(a.ctx)
	})

	// Build Menu
	BuildMenu := AppMenu.AddSubmenu("Build")
	BuildMenu.AddText("Build Document", keys.CmdOrCtrl("b"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-build", nil)
	})
	BuildMenu.AddSeparator()
	BuildMenu.AddText("Stop Build", keys.CmdOrCtrl("k"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-stop-build", nil)
	})

	// View Menu
	ViewMenu := AppMenu.AddSubmenu("View")
	ViewMenu.AddText("Toggle Sidebar", keys.CmdOrCtrl("1"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-toggle-sidebar", nil)
	})
	ViewMenu.AddText("Toggle Editor", keys.CmdOrCtrl("2"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-toggle-editor", nil)
	})
	ViewMenu.AddText("Toggle Preview", keys.CmdOrCtrl("3"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-toggle-preview", nil)
	})
	ViewMenu.AddSeparator()
	ViewMenu.AddText("Zoom In", keys.CmdOrCtrl("="), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-zoom-in", nil)
	})
	ViewMenu.AddText("Zoom Out", keys.CmdOrCtrl("-"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-zoom-out", nil)
	})
	ViewMenu.AddText("Reset Zoom", keys.CmdOrCtrl("0"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-zoom-reset", nil)
	})
	ViewMenu.AddSeparator()
	ViewMenu.AddText("Toggle Theme", keys.Combo("t", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-toggle-theme", nil)
	})

	// Git Menu
	GitMenu := AppMenu.AddSubmenu("Git")
	GitMenu.AddText("Commit Changes", keys.Combo("k", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-git-commit", nil)
	})
	GitMenu.AddText("Push Changes", keys.Combo("p", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-git-push", nil)
	})
	GitMenu.AddText("Pull Changes", keys.Combo("l", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-git-pull", nil)
	})
	GitMenu.AddSeparator()
	GitMenu.AddText("Refresh Status", keys.CmdOrCtrl("r"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-git-refresh", nil)
	})

	// Edit Menu (for Windows/Linux)
	if runtime.GOOS != "darwin" {
		EditMenu := AppMenu.AddSubmenu("Edit")
		EditMenu.AddText("Undo", keys.CmdOrCtrl("z"), func(cd *menu.CallbackData) {
			runtime2.EventsEmit(a.ctx, "menu-undo", nil)
		})
		EditMenu.AddText("Redo", keys.Combo("z", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
			runtime2.EventsEmit(a.ctx, "menu-redo", nil)
		})
		EditMenu.AddSeparator()
		EditMenu.AddText("Cut", keys.CmdOrCtrl("x"), func(cd *menu.CallbackData) {
			runtime2.EventsEmit(a.ctx, "menu-cut", nil)
		})
		EditMenu.AddText("Copy", keys.CmdOrCtrl("c"), func(cd *menu.CallbackData) {
			runtime2.EventsEmit(a.ctx, "menu-copy", nil)
		})
		EditMenu.AddText("Paste", keys.CmdOrCtrl("v"), func(cd *menu.CallbackData) {
			runtime2.EventsEmit(a.ctx, "menu-paste", nil)
		})
	} else {
		AppMenu.Append(menu.EditMenu())
	}

	// Help Menu
	HelpMenu := AppMenu.AddSubmenu("Help")
	HelpMenu.AddText("About Treefrog", nil, func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-about", nil)
	})
	HelpMenu.AddText("Documentation", nil, func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-docs", nil)
	})
	HelpMenu.AddText("Keyboard Shortcuts", keys.CmdOrCtrl("?"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-shortcuts", nil)
	})

	return AppMenu
}
