import { ReactNode } from "react";
import TitleBar from "./TitleBar";

interface FramelessWindowProps {
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

/**
 * FramelessWindow wraps content with a native-looking title bar
 * Handles platform-specific styling for macOS and Windows/Linux
 */
export default function FramelessWindow({
  title = "Treefrog",
  children,
  onClose,
}: FramelessWindowProps) {
  return (
    <div className="w-full h-full flex flex-col">
      {/* Native title bar with platform-specific styling */}
      <TitleBar title={title} onClose={onClose} />

      {/* Content area */}
      {children}
    </div>
  );
}
