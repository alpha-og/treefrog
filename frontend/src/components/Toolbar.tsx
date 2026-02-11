import { useState } from "react";
import { Home, Eye } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import BuildButton from "./BuildButton";
import { cn } from "@/lib/utils";
import {
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContentWrapper,
  MenuItem,
  DropdownMenuSeparator,
  MenuShortcut,
  MenuIcon,
} from "@/components/common/Menu";

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
          {/* View Dropdown Menu */}
          <DropdownMenuWrapper>
            <DropdownMenuTrigger asChild>
              <motion.button
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="View options"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Eye size={16} className="text-muted-foreground" />
              </motion.button>
            </DropdownMenuTrigger>
            <DropdownMenuContentWrapper align="end" className="w-56">
              <MenuItem
                onClick={() => onTogglePane("sidebar")}
                className={cn(
                  "flex items-center gap-2",
                  panesVisible.sidebar && "bg-primary/20 text-primary"
                )}
              >
                <MenuIcon name="sidebar" size={16} />
                <span className="flex-1">Sidebar</span>
                {panesVisible.sidebar && <span className="text-xs">✓</span>}
              </MenuItem>

              <MenuItem
                onClick={() => onTogglePane("editor")}
                className={cn(
                  "flex items-center gap-2",
                  panesVisible.editor && "bg-primary/20 text-primary"
                )}
              >
                <MenuIcon name="editor" size={16} />
                <span className="flex-1">Editor</span>
                {panesVisible.editor && <span className="text-xs">✓</span>}
              </MenuItem>

              <MenuItem
                onClick={() => onTogglePane("preview")}
                className={cn(
                  "flex items-center gap-2",
                  panesVisible.preview && "bg-primary/20 text-primary"
                )}
              >
                <MenuIcon name="preview" size={16} />
                <span className="flex-1">Preview</span>
                {panesVisible.preview && <span className="text-xs">✓</span>}
              </MenuItem>

              <DropdownMenuSeparator />

              <MenuItem
                onClick={() => {
                  // Reset layout - show all panes
                  const allVisible = panesVisible.sidebar && panesVisible.editor && panesVisible.preview;
                  if (!allVisible) {
                    if (!panesVisible.sidebar) onTogglePane("sidebar");
                    if (!panesVisible.editor) onTogglePane("editor");
                    if (!panesVisible.preview) onTogglePane("preview");
                  }
                }}
              >
                <MenuIcon name="reset" size={16} />
                <span>Reset Layout</span>
              </MenuItem>
            </DropdownMenuContentWrapper>
          </DropdownMenuWrapper>

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
