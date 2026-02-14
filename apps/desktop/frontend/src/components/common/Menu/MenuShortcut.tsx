import React from "react";
import { cn } from "@/lib/utils";

interface MenuShortcutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * MenuShortcut - Display keyboard shortcuts in menu items
 * Shows text in subtle muted color on the right side of menu items
 */
export function MenuShortcut({ children, className }: MenuShortcutProps) {
  return (
    <span
      className={cn(
        "ml-auto text-xs text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
        className
      )}
    >
      {children}
    </span>
  );
}
