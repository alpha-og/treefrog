import { ArrowLeft, Sidebar as SidebarIcon, Code, Eye as PreviewIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import BuildButton from "./BuildButton";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  onBuild: () => void;
  engine: string;
  onEngineChange: (engine: string) => void;
  shell: boolean;
  onShellChange: (shell: boolean) => void;
  onTogglePane: (pane: "sidebar" | "editor" | "preview") => void;
  panesVisible: { sidebar: boolean; editor: boolean; preview: boolean };
}

export default function Toolbar({
  onBuild,
  engine,
  onEngineChange,
  shell,
  onShellChange,
  onTogglePane,
  panesVisible,
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
        </div>
      </header>
    </>
  );
}
