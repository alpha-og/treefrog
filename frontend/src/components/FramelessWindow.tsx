import { ReactNode } from "react";
import TitleBar from "./TitleBar";

interface FramelessWindowProps {
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

/**
 * FramelessWindow wraps content with a floating pill title bar
 * Uses Wails' --wails-draggable CSS property for window dragging
 * The entire window is draggable except where --wails-draggable:no-drag is set
 */
export default function FramelessWindow({
  title = "Treefrog",
  children,
  onClose,
}: FramelessWindowProps) {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ "--wails-draggable": "drag" } as React.CSSProperties}
    >
      {/* Floating pill title bar with window controls */}
      <TitleBar title={title} onClose={onClose} />

      {/* Content area - fully draggable unless specified otherwise */}
      {children}
    </div>
  );
}
