import { useState } from "react";
import { ArrowLeft, Eye, Sidebar as SidebarIcon, Code, Eye as PreviewIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import BuildButton from "./BuildButton";
import { UserMenu } from "./UserMenu";
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

  return (
    <>
      {/* Main Toolbar - Draggable */}
      <header
        className="bg-card border-b px-6 py-3 flex items-center justify-between gap-6 h-16"
        style={{ "--wails-draggable": "drag" } as React.CSSProperties}
      >
        {/* Left: Logo and Back Button */}
        <div className="flex items-center gap-3 shrink-0" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
          <motion.button
            className="p-2 rounded-lg hover:bg-primary/10 transition-all"
            onClick={() => navigate({ to: "/" })}
            title="Go back"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={18} className="text-primary" />
          </motion.button>
          <span className="text-sm font-semibold text-foreground/80">Treefrog</span>
        </div>

        {/* Center: Spacer */}
        <div className="flex-1" />

        {/* Right: Controls and Settings */}
        <div className="flex items-center gap-3 shrink-0" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
          {/* Segmented Pane Control - Fluid Toggle Group */}
          <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-primary/5 border border-primary/20">

            {/* Sidebar Toggle */}
            <motion.button
              onClick={() => onTogglePane("sidebar")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="group relative px-2.5 py-1.5 rounded-md transition-all duration-300"
              title={panesVisible.sidebar ? "Hide sidebar" : "Show sidebar"}
            >
              {/* Animated Background */}
              <motion.span
                className="absolute inset-0 rounded-md bg-primary pointer-events-none"
                initial={false}
                animate={{
                  opacity: panesVisible.sidebar ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />

              <SidebarIcon
                size={16}
                className={cn(
                  "relative z-10 transition-colors duration-300 font-medium",
                  panesVisible.sidebar 
                    ? "text-primary-foreground" 
                    : "text-primary group-hover:text-primary/80"
                )}
              />
            </motion.button>

            {/* Editor Toggle */}
            <motion.button
              onClick={() => onTogglePane("editor")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="group relative px-2.5 py-1.5 rounded-md transition-all duration-300"
              title={panesVisible.editor ? "Hide editor" : "Show editor"}
            >
              {/* Animated Background */}
              <motion.span
                className="absolute inset-0 rounded-md bg-primary pointer-events-none"
                initial={false}
                animate={{
                  opacity: panesVisible.editor ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />

              <Code
                size={16}
                className={cn(
                  "relative z-10 transition-colors duration-300 font-medium",
                  panesVisible.editor 
                    ? "text-primary-foreground" 
                    : "text-primary group-hover:text-primary/80"
                )}
              />
            </motion.button>

            {/* Preview Toggle */}
            <motion.button
              onClick={() => onTogglePane("preview")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              className="group relative px-2.5 py-1.5 rounded-md transition-all duration-300"
              title={panesVisible.preview ? "Hide preview" : "Show preview"}
            >
              {/* Animated Background */}
              <motion.span
                className="absolute inset-0 rounded-md bg-primary pointer-events-none"
                initial={false}
                animate={{
                  opacity: panesVisible.preview ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />

              <PreviewIcon
                size={16}
                className={cn(
                  "relative z-10 transition-colors duration-300 font-medium",
                  panesVisible.preview 
                    ? "text-primary-foreground" 
                    : "text-primary group-hover:text-primary/80"
                )}
              />
            </motion.button>

          </div>
          {/* Build Button with Engine Dropdown */}
          <BuildButton
            onBuild={onBuild}
            engine={engine}
            onEngineChange={onEngineChange}
            shell={shell}
            onShellChange={onShellChange}
          />

          {/* User Menu */}
          <div className="border-l border-border/50 pl-3 ml-1">
            <UserMenu />
          </div>
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
