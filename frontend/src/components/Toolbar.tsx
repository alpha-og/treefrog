import { useState } from "react";
import { Home, FileText, Eye, Sidebar as SidebarIcon, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import BuildButton from "./BuildButton";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  projectRoot: string;
  onOpenProject: () => void;
  onBuild: () => void;
  engine: string;
  onEngineChange: (engine: string) => void;
  shell: boolean;
  onShellChange: (shell: boolean) => void;
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
  onTogglePane,
  panesVisible,
  configSynced,
}: ToolbarProps) {
  const navigate = useNavigate();
  const [showViewMenu, setShowViewMenu] = useState(false);

  return (
    <>
      {/* Main Toolbar - Draggable */}
      <header
        className="bg-card border-b px-6 py-3 flex items-center justify-between gap-6 h-16"
        style={{ "--wails-draggable": "drag" } as React.CSSProperties}
      >
        {/* Left: Logo and Home */}
        <div className="flex items-center gap-3 shrink-0" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
          <motion.button
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => navigate({ to: "/" })}
            title="Go to home"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Home size={20} className="text-primary" />
          </motion.button>
          <span className="text-sm font-semibold text-foreground/80">Treefrog</span>
        </div>

        {/* Center: Spacer */}
        <div className="flex-1" />

        {/* Right: Controls and Settings */}
        <div className="flex items-center gap-3 shrink-0" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
          {/* View Settings */}
          <div className="relative">
            <motion.button
              className={cn(
                "p-2 rounded-lg transition-colors",
                showViewMenu ? "bg-accent" : "hover:bg-accent"
              )}
              onClick={() => setShowViewMenu(!showViewMenu)}
              title="View options"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Eye size={16} className="text-muted-foreground" />
            </motion.button>

            {/* View Menu Popover */}
            <AnimatePresence>
              {showViewMenu && (
                <>
                  <motion.div
                    className="absolute right-0 mt-2 w-56 bg-card border rounded-xl shadow-xl z-50 overflow-hidden"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-4">
                      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        Panes
                      </h3>
                      <div className="space-y-2">
                        {/* Sidebar Toggle */}
                        <motion.button
                          onClick={() => {
                            onTogglePane("sidebar");
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                            panesVisible.sidebar
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          )}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <SidebarIcon size={16} />
                          <span className="text-sm font-medium flex-1 text-left">Sidebar</span>
                          {panesVisible.sidebar && (
                            <Check size={14} />
                          )}
                        </motion.button>

                        {/* Editor Toggle */}
                        <motion.button
                          onClick={() => {
                            onTogglePane("editor");
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                            panesVisible.editor
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          )}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <FileText size={16} />
                          <span className="text-sm font-medium flex-1 text-left">Editor</span>
                          {panesVisible.editor && (
                            <Check size={14} />
                          )}
                        </motion.button>

                        {/* Preview Toggle */}
                        <motion.button
                          onClick={() => {
                            onTogglePane("preview");
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                            panesVisible.preview
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          )}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Eye size={16} />
                          <span className="text-sm font-medium flex-1 text-left">Preview</span>
                          {panesVisible.preview && (
                            <Check size={14} />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                  {/* Backdrop to close menu */}
                  <motion.div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowViewMenu(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                </>
              )}
            </AnimatePresence>
          </div>


          {/* Build Button with Engine Dropdown */}
          <BuildButton
            onBuild={onBuild}
            engine={engine}
            onEngineChange={onEngineChange}
            shell={shell}
            onShellChange={onShellChange}
          />
        </div>
      </header>

      {/* Status Indicator - Fixed bottom right */}
      <AnimatePresence>
        {configSynced && (
          <motion.div
            className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-emerald-500/10 rounded-lg shadow-lg border border-emerald-500/20"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-medium text-emerald-600">Config synced</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
