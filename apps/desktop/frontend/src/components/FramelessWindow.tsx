import { ReactNode } from "react";

interface FramelessWindowProps {
  title?: string;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
}

export default function FramelessWindow({
  children,
}: FramelessWindowProps) {
  return (
    <div
      className="w-full h-full flex flex-col"
    >
      {children}
    </div>
  );
}
