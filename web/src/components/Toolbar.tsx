import { useState } from "react";
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

  return (
    <>
      <header className="navbar bg-base-200 sticky top-0 z-40 border-b border-base-300">
        <div className="flex-1">
          <button
            className="btn btn-ghost btn-lg gap-2"
            onClick={() => {}}
          >
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Treefrog
            </span>
          </button>
        </div>

        <div className="flex-none gap-2">
          {/* Project Info */}
          <button
            className="btn btn-sm btn-ghost"
            onClick={onOpenProject}
            title="Change project"
          >
            <span className="truncate max-w-xs">
              {projectRoot || "No project selected"}
            </span>
          </button>

          <div className="divider divider-horizontal m-0"></div>

          {/* Build Menu */}
          <div className="dropdown dropdown-end">
            <button
              className="btn btn-sm btn-ghost gap-1"
              onClick={() => setShowBuildMenu(!showBuildMenu)}
              title="Build options"
            >
              <Zap size={16} />
              <ChevronDown size={14} />
            </button>
            {showBuildMenu && (
              <ul className="dropdown-content menu bg-base-100 rounded-box w-52 p-2 shadow border border-base-300">
                <li className="menu-title">
                  <span>Engine</span>
                </li>
                <li>
                  <a
                    onClick={() => {
                      onEngineChange("pdflatex");
                      setShowBuildMenu(false);
                    }}
                    className={engine === "pdflatex" ? "active" : ""}
                  >
                    pdflatex {engine === "pdflatex" && "✓"}
                  </a>
                </li>
                <li>
                  <a
                    onClick={() => {
                      onEngineChange("xelatex");
                      setShowBuildMenu(false);
                    }}
                    className={engine === "xelatex" ? "active" : ""}
                  >
                    xelatex {engine === "xelatex" && "✓"}
                  </a>
                </li>
                <li>
                  <a
                    onClick={() => {
                      onEngineChange("lualatex");
                      setShowBuildMenu(false);
                    }}
                    className={engine === "lualatex" ? "active" : ""}
                  >
                    lualatex {engine === "lualatex" && "✓"}
                  </a>
                </li>
                <li>
                  <label className="flex items-center gap-2">
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
          <div className="dropdown dropdown-end">
            <button
              className="btn btn-sm btn-ghost gap-1"
              onClick={() => setShowViewMenu(!showViewMenu)}
              title="View options"
            >
              <Monitor size={16} />
              <ChevronDown size={14} />
            </button>
            {showViewMenu && (
              <ul className="dropdown-content menu bg-base-100 rounded-box w-56 p-2 shadow border border-base-300">
                <li className="menu-title">
                  <span>Panes</span>
                </li>
                <li>
                  <a
                    onClick={() => {
                      onTogglePane("sidebar");
                      setShowViewMenu(false);
                    }}
                  >
                    <span className="flex-1">Sidebar</span>
                    {panesVisible.sidebar && <span className="badge badge-primary">✓</span>}
                  </a>
                </li>
                <li>
                  <a
                    onClick={() => {
                      onTogglePane("editor");
                      setShowViewMenu(false);
                    }}
                  >
                    <span className="flex-1">Editor</span>
                    {panesVisible.editor && <span className="badge badge-primary">✓</span>}
                  </a>
                </li>
                <li>
                  <a
                    onClick={() => {
                      onTogglePane("preview");
                      setShowViewMenu(false);
                    }}
                  >
                    <span className="flex-1">Preview</span>
                    {panesVisible.preview && <span className="badge badge-primary">✓</span>}
                  </a>
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
