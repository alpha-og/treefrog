"use client"

import * as React from "react"
import { Edit2, Copy, ArrowRight, File, Folder, Trash2, Plus } from "lucide-react"
import {
  ContextMenu as ContextMenuPrimitive,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  path: string;
  isDir: boolean;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

export default function ContextMenu({
  visible,
  x,
  y,
  path,
  isDir,
  onClose,
  onRename,
  onDuplicate,
  onMove,
  onDelete,
  onCreateFile,
  onCreateFolder,
}: ContextMenuProps) {
  if (!visible) return null;

  const filename = path.split("/").pop() || path;

  return (
    <ContextMenuPrimitive>
      <ContextMenuContent className="min-w-48" style={{ top: y, left: x }}>
        {/* Compact header with file path */}
        <div className="px-3 py-2 border-b bg-muted/50">
          <p className="text-xs text-muted-foreground truncate font-mono" title={path}>
            {filename}
          </p>
        </div>

        <div className="p-1 space-y-1">
          {/* Edit Section */}
          <ContextMenuGroup>
            <ContextMenuLabel>Edit</ContextMenuLabel>
            <ContextMenuItem onClick={onRename}>
              <Edit2 size={16} className="opacity-80" />
              <span>Rename</span>
              <ContextMenuShortcut>⌘R</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={onDuplicate}>
              <Copy size={16} className="opacity-80" />
              <span>Duplicate</span>
              <ContextMenuShortcut>⌘D</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={onMove}>
              <ArrowRight size={16} className="opacity-80" />
              <span>Move</span>
              <ContextMenuShortcut>⌘M</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuGroup>

          {/* Create Section - Only for directories */}
          {isDir && (
            <>
              <ContextMenuSeparator />

              <ContextMenuGroup>
                <ContextMenuLabel>Create</ContextMenuLabel>
                <ContextMenuItem onClick={onCreateFile}>
                  <Plus size={16} className="opacity-80" />
                  <span>New File</span>
                  <ContextMenuShortcut>⌘N</ContextMenuShortcut>
                </ContextMenuItem>

                <ContextMenuItem onClick={onCreateFolder}>
                  <Plus size={16} className="opacity-80" />
                  <span>New Folder</span>
                  <ContextMenuShortcut>⇧⌘N</ContextMenuShortcut>
                </ContextMenuItem>
              </ContextMenuGroup>
            </>
          )}

          {/* Delete Section */}
          <ContextMenuSeparator />

          <ContextMenuItem 
            onClick={onDelete} 
            className="text-destructive focus:bg-destructive/20"
          >
            <Trash2 size={16} />
            <span>Delete</span>
            <ContextMenuShortcut>⌫⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </div>
      </ContextMenuContent>
    </ContextMenuPrimitive>
  );
}