import { X, Minus, Square } from "lucide-react";
import { useWailsRuntime } from "../hooks/useWailsRuntime";

interface TitleBarProps {
  title?: string;
  onClose?: () => void;
}

export default function TitleBar({ title = "Treefrog", onClose }: TitleBarProps) {
  const { minimize, maximize, close, isAvailable } = useWailsRuntime();

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

  return (
    <div
      className="h-12 bg-gradient-to-r from-base-100 to-base-100/95 border-b border-base-content/10 flex items-center justify-between px-4 select-none drag rounded-t-2xl"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">ƒ</span>
        </div>
        <span className="text-sm font-semibold text-base-content">{title}</span>
      </div>

      {/* Window Controls */}
      {isAvailable && (
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button
            onClick={handleMinimize}
            className="hover:bg-base-200 rounded p-2 transition-colors"
            title="Minimize"
          >
            <Minus size={16} className="text-base-content/70" />
          </button>
          <button
            onClick={handleMaximize}
            className="hover:bg-base-200 rounded p-2 transition-colors"
            title="Maximize"
          >
            <Square size={16} className="text-base-content/70" />
          </button>
          <button
            onClick={handleClose}
            className="hover:bg-error hover:text-error-content rounded p-2 transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
