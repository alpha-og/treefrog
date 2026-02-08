import { ReactNode } from "react";

interface FramelessWindowProps {
  title?: string;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
}

/**
 * FramelessWindow wraps content without a custom title bar
 * Uses native window controls from the OS
 */
export default function FramelessWindow({
  title = "Treefrog",
  subtitle,
  children,
  onClose,
}: FramelessWindowProps) {
  return (
    <div
      className="w-full h-full flex flex-col"
    >
      {/* Content area */}
      {children}
    </div>
  );
}
