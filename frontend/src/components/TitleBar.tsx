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

  // macOS - Traffic lights on the left
  if (platform === "darwin") {
    return (
      <div
        className="h-12 bg-gradient-to-r from-base-100 to-base-100/95 border-b border-base-content/10 flex items-center justify-center px-4 select-none rounded-t-2xl"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        {/* macOS traffic lights - positioned absolutely on the left */}
        {isAvailable && (
          <div
            className="absolute left-4 top-3 flex items-center gap-2"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            {/* Red - Close */}
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
              title="Close"
            />
            {/* Yellow - Minimize */}
            <button
              onClick={handleMinimize}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-sm"
              title="Minimize"
            />
            {/* Green - Maximize */}
            <button
              onClick={handleMaximize}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
              title="Maximize"
            />
          </div>
        )}

        {/* Center title */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">ƒ</span>
          </div>
          <span className="text-sm font-semibold text-base-content">{title}</span>
        </div>
      </div>
    );
  }

  // Windows/Linux - Controls on the right (native Windows 11 style)
  return (
    <div
      className="h-12 bg-gradient-to-r from-base-100 to-base-100/95 border-b border-base-content/10 flex items-center justify-between px-4 select-none rounded-t-2xl"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Left side - Logo and title */}
      <div className="flex items-center gap-3 flex-1">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">ƒ</span>
        </div>
        <span className="text-sm font-semibold text-base-content">{title}</span>
      </div>

      {/* Right side - Window controls */}
      {isAvailable && (
        <div
          className="flex items-center ml-auto"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={handleMinimize}
            className="hover:bg-base-200 w-12 h-12 flex items-center justify-center transition-colors"
            title="Minimize"
          >
            <Minus size={16} className="text-base-content/70" />
          </button>
          <button
            onClick={handleMaximize}
            className="hover:bg-base-200 w-12 h-12 flex items-center justify-center transition-colors"
            title="Maximize"
          >
            <Square size={16} className="text-base-content/70" />
          </button>
          <button
            onClick={handleClose}
            className="hover:bg-error hover:text-error-content w-12 h-12 flex items-center justify-center transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
