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
	FileMenu.AddText("&Open Project...", keys.CmdOrCtrl("o"), func(cd *menu.CallbackData) {
		a.OpenProjectDialog()
	})
	FileMenu.AddSeparator()
	FileMenu.AddText("&Export PDF...", keys.Combo("e", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		a.ExportPDF()
	})
	FileMenu.AddText("Export &Source...", keys.Combo("s", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		a.ExportSource()
	})
	FileMenu.AddSeparator()
	FileMenu.AddText("E&xit", keys.CmdOrCtrl("q"), func(cd *menu.CallbackData) {
		runtime2.Quit(a.ctx)
	})

	// Build Menu
	BuildMenu := AppMenu.AddSubmenu("Build")
	BuildMenu.AddText("&Build", keys.CmdOrCtrl("b"), func(cd *menu.CallbackData) {
		// Trigger build - we'll emit an event that the frontend listens for
		runtime2.EventsEmit(a.ctx, "menu-build", nil)
	})
	BuildMenu.AddSeparator()
	BuildMenu.AddText("View Build &Log", keys.Combo("l", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-build-log", nil)
	})

	// Git Menu
	GitMenu := AppMenu.AddSubmenu("Git")
	GitMenu.AddText("&Commit...", keys.Combo("c", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-git-commit", nil)
	})
	GitMenu.AddText("&Push", keys.Combo("p", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-git-push", nil)
	})
	GitMenu.AddText("P&ull", keys.Combo("l", keys.CmdOrCtrlKey, keys.ShiftKey), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-git-pull", nil)
	})

	// View Menu
	ViewMenu := AppMenu.AddSubmenu("View")
	ViewMenu.AddText("Toggle &Sidebar", keys.CmdOrCtrl("1"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-toggle-sidebar", nil)
	})
	ViewMenu.AddText("Toggle &Preview", keys.CmdOrCtrl("2"), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-toggle-preview", nil)
	})
	ViewMenu.AddSeparator()
	ViewMenu.AddText("&Settings...", keys.CmdOrCtrl(","), func(cd *menu.CallbackData) {
		runtime2.EventsEmit(a.ctx, "menu-settings", nil)
	})

	// macOS Edit menu for standard shortcuts
	if runtime.GOOS == "darwin" {
		AppMenu.Append(menu.EditMenu())
	}

	return AppMenu
}
