"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Edit2, Copy, ArrowRight, Trash2, FilePlus, FolderPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { MenuShortcut, MenuIcon } from "@/components/common/Menu"

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  path: string;
  isDir: boolean;
  isRoot?: boolean;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

/**
 * FileTreeContextMenu - Custom floating context menu with Radix animations
 * 
 * Uses a custom floating menu implementation instead of Radix ContextMenu
 * because the file tree doesn't have traditional trigger elements.
 * 
 * Features:
 * - Click-outside handling to close menu
 * - Keyboard shortcuts display
 * - Icons for all actions
 * - Smooth fade + scale animations
 * - Contextual items based on file/folder type
 */
export default function ContextMenu({
  visible,
  x,
  y,
  path,
  isDir,
  isRoot = false,
  onClose,
  onRename,
  onDuplicate,
  onMove,
  onDelete,
  onCreateFile,
  onCreateFolder,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close menu
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Add slight delay to prevent immediate closure
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [visible, onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  const filename = path.split("/").pop() || path;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "fixed z-50 min-w-52 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg",
            "backdrop-blur-sm"
          )}
          style={{
            top: `${y}px`,
            left: `${x}px`,
            transformOrigin: "top left",
          }}
        >
           {/* Filename Header */}
           <div className="px-3 py-2 border-b border-border/50 bg-muted/30">
             <p
               className="text-xs text-muted-foreground truncate font-mono"
               title={path}
             >
               {filename || "Root"}
             </p>
           </div>

           <div className="p-1">
             {/* Edit Section - Only for non-root items */}
             {!isRoot && (
               <div className="space-y-1">
                 <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                   Edit
                 </div>
                 
                 <MenuItem
                   onClick={() => {
                     onRename();
                     onClose();
                   }}
                   icon="rename"
                   label="Rename"
                   shortcut="⌘R"
                 />
                 
                 <MenuItem
                   onClick={() => {
                     onDuplicate();
                     onClose();
                   }}
                   icon="duplicate"
                   label="Duplicate"
                   shortcut="⌘D"
                 />
                 
                 <MenuItem
                   onClick={() => {
                     onMove();
                     onClose();
                   }}
                   icon="move"
                   label="Move"
                   shortcut="⌘M"
                 />
               </div>
             )}

            {/* Create Section - Only for directories */}
            {isDir && (
              <>
                <div className="my-1 h-px bg-border/50" />
                <div className="space-y-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Create
                  </div>
                  
                  <MenuItem
                    onClick={() => {
                      onCreateFile();
                      onClose();
                    }}
                    icon="file-new"
                    label="New File"
                    shortcut="⌘N"
                  />
                  
                  <MenuItem
                    onClick={() => {
                      onCreateFolder();
                      onClose();
                    }}
                    icon="folder-new"
                    label="New Folder"
                    shortcut="⇧⌘N"
                  />
                </div>
              </>
            )}

             {/* Delete Section - Only for non-root items */}
             {!isRoot && (
               <>
                 <div className="my-1 h-px bg-border/50" />
                 <div className="space-y-1">
                   <MenuItem
                     onClick={() => {
                       onDelete();
                       onClose();
                     }}
                     icon="delete"
                     label="Delete"
                     shortcut="⌫"
                     destructive
                   />
                 </div>
               </>
             )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * MenuItem - Individual context menu item with icon, label, and shortcut
 */
interface MenuItemProps {
  onClick: () => void;
  icon: string;
  label: string;
  shortcut?: string;
  destructive?: boolean;
}

function MenuItem({
  onClick,
  icon,
  label,
  shortcut,
  destructive,
}: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
        "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        "transition-colors duration-100 cursor-pointer",
        destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive"
      )}
    >
      <MenuIcon name={icon} size={16} />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <MenuShortcut>{shortcut}</MenuShortcut>}
    </button>
  );
}