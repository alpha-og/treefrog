import { useState, useRef, useEffect } from "react";
import { Zap, Monitor, Settings, Sun, Moon, ChevronDown } from "lucide-react";
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
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const buildMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buildMenuRef.current && !buildMenuRef.current.contains(e.target as Node)) {
        setShowBuildMenu(false);
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setShowViewMenu(false);
      }
    };

    if (showBuildMenu || showViewMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showBuildMenu, showViewMenu]);

  return (
    <>
      <header className="navbar bg-base-200 sticky top-0 z-40 border-b border-base-300 flex flex-row items-center justify-between px-4 py-2 gap-4">
        {/* Left side - Logo */}
        <div className="flex items-center gap-4">
          <button
            className="btn btn-ghost btn-sm gap-2"
            onClick={() => {}}
          >
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Treefrog
            </span>
          </button>
        </div>

        {/* Right side - Controls */}
        <div className="flex items-center gap-2">
          {/* Open Project Button */}
          <button
            className="btn btn-sm btn-primary"
            onClick={onOpenProject}
            title="Open project folder"
          >
            Open Project
          </button>

          <div className="divider divider-horizontal m-0 h-6"></div>

          {/* Build Menu */}
          <div ref={buildMenuRef} className="dropdown dropdown-end">
            <button
              className="btn btn-sm btn-ghost gap-1"
              onClick={() => setShowBuildMenu(!showBuildMenu)}
              title="Build options"
              role="menubutton"
            >
              <Zap size={16} />
              <ChevronDown size={14} />
            </button>
            {showBuildMenu && (
              <ul className="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow border border-base-300 z-50" onClick={(e) => e.stopPropagation()}>
                <li className="menu-title">
                  <span>Engine</span>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onEngineChange("pdflatex");
                      setShowBuildMenu(false);
                    }}
                    className={engine === "pdflatex" ? "active" : ""}
                  >
                    pdflatex {engine === "pdflatex" && "✓"}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onEngineChange("xelatex");
                      setShowBuildMenu(false);
                    }}
                    className={engine === "xelatex" ? "active" : ""}
                  >
                    xelatex {engine === "xelatex" && "✓"}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onEngineChange("lualatex");
                      setShowBuildMenu(false);
                    }}
                    className={engine === "lualatex" ? "active" : ""}
                  >
                    lualatex {engine === "lualatex" && "✓"}
                  </button>
                </li>
                <li>
                  <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={shell}
                      onChange={(e) => onShellChange(e.target.checked)}
                      className="checkbox checkbox-sm"
                    />
                    <span>Shell-escape</span>
                  </label>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onBuild();
                      setShowBuildMenu(false);
                    }}
                    className="btn btn-sm btn-primary"
                  >
                    Build Now
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* View Menu */}
          <div ref={viewMenuRef} className="dropdown dropdown-end">
            <button
              className="btn btn-sm btn-ghost gap-1"
              onClick={() => setShowViewMenu(!showViewMenu)}
              title="View options"
              role="menubutton"
            >
              <Monitor size={16} />
              <ChevronDown size={14} />
            </button>
            {showViewMenu && (
              <ul className="dropdown-content menu bg-base-100 rounded-box w-56 p-2 shadow border border-base-300 z-50" onClick={(e) => e.stopPropagation()}>
                <li className="menu-title">
                  <span>Panes</span>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onTogglePane("sidebar");
                      setShowViewMenu(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <span className="flex-1 text-left">Sidebar</span>
                    {panesVisible.sidebar && <span className="badge badge-primary badge-sm">✓</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onTogglePane("editor");
                      setShowViewMenu(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <span className="flex-1 text-left">Editor</span>
                    {panesVisible.editor && <span className="badge badge-primary badge-sm">✓</span>}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onTogglePane("preview");
                      setShowViewMenu(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <span className="flex-1 text-left">Preview</span>
                    {panesVisible.preview && <span className="badge badge-primary badge-sm">✓</span>}
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            className="btn btn-sm btn-ghost"
            onClick={onThemeToggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Settings */}
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setShowSettings(true)}
            title="Settings"
          >
            <Settings size={16} />
          </button>

          {/* Config Synced Indicator */}
          {configSynced && (
            <div className="badge badge-success badge-sm">
              ✓ Config synced
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
