"use client";
import React from "react";
import {
  FileIcon,
  FolderPlus,
  FilePlus,
  Edit2,
  Copy,
  ArrowRight,
  Trash2,
  PanelLeft,
  Code,
  FileText,
  Maximize2,
  RotateCcw,
  Terminal,
  Play,
  FileDown,
  Package,
  Link,
  ExternalLink,
  LucideIcon,
} from "lucide-react";
import { cn } from "../utils";

interface MenuIconProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * Icon mapping for consistent menu item icons
 * Provides a central place to manage all menu icons
 */
const iconMap: Record<string, LucideIcon> = {
  // File operations
  "file": FileIcon,
  "folder": FolderPlus,
  "file-new": FilePlus,
  "folder-new": FolderPlus,
  "rename": Edit2,
  "duplicate": Copy,
  "move": ArrowRight,
  "delete": Trash2,
  
  // View menu
  "sidebar": PanelLeft,
  "editor": Code,
  "preview": FileText,
  "focus": Maximize2,
  "reset": RotateCcw,
  
  // Build menu
  "engine": FileIcon,
  "shell-escape": Terminal,
  "build": Play,
  "clean": Trash2,
  
  // Export menu
  "export-pdf": FileDown,
  "export-source": Package,
  "copy-link": Link,
  "open-external": ExternalLink,
};

export function MenuIcon({ name, size = 16, className }: MenuIconProps) {
  const Icon = iconMap[name];
  
  if (!Icon) {
    console.warn(`MenuIcon: Icon "${name}" not found in iconMap`);
    return null;
  }
  
  return (
    <Icon
      size={size}
      className={cn(
        "text-muted-foreground group-hover:text-foreground transition-colors duration-150",
        className
      )}
    />
  );
}

/**
 * Get icon by name - useful for conditional rendering
 */
export function getMenuIcon(name: string): LucideIcon | undefined {
  return iconMap[name];
}

/**
 * Icon registry - for adding custom icons dynamically
 */
export function registerMenuIcon(name: string, Icon: LucideIcon) {
  iconMap[name] = Icon;
}
