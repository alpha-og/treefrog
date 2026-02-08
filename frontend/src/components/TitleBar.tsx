import { X, Minus, Square } from "lucide-react";
import { useWailsRuntime } from "../hooks/useWailsRuntime";
import { useEffect, useState } from "react";

interface TitleBarProps {
  title?: string;
  onClose?: () => void;
}

export default function TitleBar({ title = "Treefrog", onClose }: TitleBarProps) {
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

  // Floating pill controls only, no dragging here
  // Entire rest of window is draggable
  if (!isAvailable) return null;

  // macOS - Traffic lights in a pill
  if (platform === "darwin") {
    return (
      <div
        className="fixed top-3 left-3 z-50 flex items-center gap-2.5 bg-black/20 backdrop-blur-md rounded-full px-4 py-2.5 hover:bg-black/30 transition-all"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* Red - Close */}
        <button
          onClick={handleClose}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm hover:scale-110"
          title="Close"
        />
        {/* Yellow - Minimize */}
        <button
          onClick={handleMinimize}
          className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-sm hover:scale-110"
          title="Minimize"
        />
        {/* Green - Maximize */}
        <button
          onClick={handleMaximize}
          className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-sm hover:scale-110"
          title="Maximize"
        />
      </div>
    );
  }

  // Windows/Linux - Floating pill on the right
  return (
    <div
      className="fixed top-3 right-3 z-50 flex items-center gap-1 bg-black/20 backdrop-blur-md rounded-full px-2 py-1.5 hover:bg-black/30 transition-all"
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
    >
      <button
        onClick={handleMinimize}
        className="p-1.5 hover:bg-base-content/20 rounded-lg transition-colors"
        title="Minimize"
      >
        <Minus size={14} className="text-base-content/70" />
      </button>
      <button
        onClick={handleMaximize}
        className="p-1.5 hover:bg-base-content/20 rounded-lg transition-colors"
        title="Maximize"
      >
        <Square size={14} className="text-base-content/70" />
      </button>
      <button
        onClick={handleClose}
        className="p-1.5 hover:bg-error/20 hover:text-error rounded-lg transition-colors"
        title="Close"
      >
        <X size={14} />
      </button>
    </div>
  );
}
