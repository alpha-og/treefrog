import { useState } from "react";
import { Zap, Settings, Sun, Moon, Home, FileText, Eye, Sidebar as SidebarIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import SettingsModal from "./SettingsModal";

interface ToolbarProps {
  projectRoot: string;
  onOpenProject: () => void;
  onBuild: () => void;
  engine: string;
  onEngineChange: (engine: string) => void;
  shell: boolean;
  onShellChange: (shell: boolean) => void;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onTogglePane: (pane: "sidebar" | "editor" | "preview") => void;
  panesVisible: { sidebar: boolean; editor: boolean; preview: boolean };
  configSynced?: boolean;
}

export default function Toolbar({
  projectRoot,
  onOpenProject,
  onBuild,
  engine,
  onEngineChange,
  shell,
  onShellChange,
  theme,
  onThemeToggle,
  onTogglePane,
  panesVisible,
  configSynced,
}: ToolbarProps) {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);

  return (
    <>
      {/* Main Toolbar */}
      <header className="bg-base-100 border-b border-base-content/10 px-6 py-3 flex items-center justify-between gap-8">
        {/* Left: Logo and Home */}
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg hover:bg-base-200 transition-colors"
            onClick={() => navigate({ to: "/" })}
            title="Go to home"
          >
            <Home size={20} className="text-primary" />
          </button>
          <span className="text-sm font-semibold text-base-content/80">Treefrog</span>
        </div>

        {/* Center: Primary Build Action */}
        <div className="flex-1 flex items-center justify-center">
          <button
            className="btn btn-primary gap-2 shadow-md hover:shadow-lg transition-all"
            onClick={onBuild}
            title="Build document"
          >
            <Zap size={18} />
            Build
          </button>
        </div>

        {/* Right: Controls and Settings */}
        <div className="flex items-center gap-3">
          {/* Build Settings */}
          <div className="relative">
            <button
              className={`p-2 rounded-lg transition-colors ${
                showBuildMenu ? "bg-base-200" : "hover:bg-base-200"
              }`}
              onClick={() => setShowBuildMenu(!showBuildMenu)}
              title="Build settings"
            >
              <Zap size={18} className="text-base-content/60" />
            </button>

            {/* Build Menu Popover */}
            {showBuildMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-base-100 border border-base-content/10 rounded-xl shadow-xl z-50">
                {/* Engine Selection */}
                <div className="p-4 border-b border-base-content/5">
                  <h3 className="text-xs font-semibold text-base-content/70 mb-3 uppercase tracking-wide">
                    LaTeX Engine
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {["pdflatex", "xelatex", "lualatex"].map((eng) => (
                      <button
                        key={eng}
                        onClick={() => {
                          onEngineChange(eng);
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                          engine === eng
                            ? "bg-primary text-primary-content shadow-md"
                            : "bg-base-200 text-base-content/70 hover:bg-base-300"
                        }`}
                      >
                        {eng}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shell Escape Option */}
                <div className="p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shell}
                      onChange={(e) => onShellChange(e.target.checked)}
                      className="checkbox checkbox-sm checkbox-primary"
                    />
                    <span className="text-sm font-medium">Enable shell-escape</span>
                  </label>
                </div>

                {/* Close on blur */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowBuildMenu(false)}
                />
              </div>
            )}
          </div>

          {/* View Settings */}
          <div className="relative">
            <button
              className={`p-2 rounded-lg transition-colors ${
                showViewMenu ? "bg-base-200" : "hover:bg-base-200"
              }`}
              onClick={() => setShowViewMenu(!showViewMenu)}
              title="View options"
            >
              <Eye size={18} className="text-base-content/60" />
            </button>

            {/* View Menu Popover */}
            {showViewMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-base-100 border border-base-content/10 rounded-xl shadow-xl z-50">
                <div className="p-4">
                  <h3 className="text-xs font-semibold text-base-content/70 mb-3 uppercase tracking-wide">
                    Panes
                  </h3>
                  <div className="space-y-2">
                    {/* Sidebar Toggle */}
                    <button
                      onClick={() => {
                        onTogglePane("sidebar");
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        panesVisible.sidebar
                          ? "bg-primary/20 text-primary"
                          : "bg-base-200 text-base-content/70 hover:bg-base-300"
                      }`}
                    >
                      <SidebarIcon size={16} />
                      <span className="text-sm font-medium flex-1 text-left">Sidebar</span>
                      {panesVisible.sidebar && (
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                      )}
                    </button>

                    {/* Editor Toggle */}
                    <button
                      onClick={() => {
                        onTogglePane("editor");
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        panesVisible.editor
                          ? "bg-primary/20 text-primary"
                          : "bg-base-200 text-base-content/70 hover:bg-base-300"
                      }`}
                    >
                      <FileText size={16} />
                      <span className="text-sm font-medium flex-1 text-left">Editor</span>
                      {panesVisible.editor && (
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                      )}
                    </button>

                    {/* Preview Toggle */}
                    <button
                      onClick={() => {
                        onTogglePane("preview");
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                        panesVisible.preview
                          ? "bg-primary/20 text-primary"
                          : "bg-base-200 text-base-content/70 hover:bg-base-300"
                      }`}
                    >
                      <Eye size={16} />
                      <span className="text-sm font-medium flex-1 text-left">Preview</span>
                      {panesVisible.preview && (
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Close on blur */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowViewMenu(false)}
                />
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            className="p-2 rounded-lg hover:bg-base-200 transition-colors"
            onClick={onThemeToggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-amber-500" />
            ) : (
              <Moon size={18} className="text-blue-500" />
            )}
          </button>

          {/* Settings */}
          <button
            className="p-2 rounded-lg hover:bg-base-200 transition-colors"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={18} className="text-base-content/60" />
          </button>

          {/* Status Indicator */}
          {configSynced && (
            <div className="ml-2 flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span className="text-xs font-medium text-success">Synced</span>
            </div>
          )}
        </div>
      </header>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}
