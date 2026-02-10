import { X, Minus, Square } from "lucide-react";
import { useWailsRuntime } from "@/hooks/useWailsRuntime";
import { useEffect, useState, ReactNode } from "react";
import { motion } from "motion/react";

interface TitleBarProps {
  title?: string;
  subtitle?: ReactNode;
  onClose?: () => void;
}

export default function TitleBar({ title = "Treefrog", subtitle, onClose }: TitleBarProps) {
  const { minimize, maximize, close, isAvailable } = useWailsRuntime();
  const [platform, setPlatform] = useState<"darwin" | "win32" | "linux" | null>(null);

  useEffect(() => {
    // Detect platform from user agent
    const ua = navigator.userAgent;
    if (ua.includes("Mac")) {
      setPlatform("darwin");
    } else if (ua.includes("Windows")) {
      setPlatform("win32");
    } else {
      setPlatform("linux");
    }
  }, []);

  const handleMinimize = () => {
    minimize();
  };

  const handleMaximize = () => {
    maximize();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      close();
    }
  };

  if (!isAvailable) return null;

  return (
    <div
      className="w-full h-12 bg-muted/50 border-b flex items-center px-4 gap-4 flex-shrink-0"
      style={{ "--wails-draggable": "drag" } as React.CSSProperties}
    >
      {/* Left: Window controls for macOS */}
      {platform === "darwin" && (
        <div className="flex items-center gap-2.5" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
          {/* Red - Close */}
          <motion.button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 shadow-sm"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Close"
          />
          {/* Yellow - Minimize */}
          <motion.button
            onClick={handleMinimize}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 shadow-sm"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Minimize"
          />
          {/* Green - Maximize */}
          <motion.button
            onClick={handleMaximize}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 shadow-sm"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Maximize"
          />
        </div>
      )}

      {/* Center: Title and context-dependent info */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>

      {/* Right: Window controls for Windows/Linux */}
      {platform !== "darwin" && (
        <div className="flex items-center gap-1" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
          <motion.button
            onClick={handleMinimize}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Minimize"
          >
            <Minus size={14} className="text-muted-foreground" />
          </motion.button>
          <motion.button
            onClick={handleMaximize}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Maximize"
          >
            <Square size={14} className="text-muted-foreground" />
          </motion.button>
          <motion.button
            onClick={handleClose}
            className="p-1.5 hover:bg-destructive hover:text-white rounded-md transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Close"
          >
            <X size={14} />
          </motion.button>
        </div>
      )}
    </div>
  );
}
