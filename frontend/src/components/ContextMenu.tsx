import { useEffect, useRef } from "react";
import { Edit2, Copy, ArrowRight, File, Folder, Trash2, Plus } from "lucide-react";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (visible) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  const itemStyle =
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 hover:bg-primary/15 active:bg-primary/20 text-sm font-medium";

  const separator = (
    <div className="my-2 h-px bg-linear-to-r from-base-content/10 via-base-content/5 to-transparent" />
  );

  return (
    <div
      ref={ref}
      className="fixed"
      style={{ top: `${y}px`, left: `${x}px`, zIndex: 50 }}
    >
      <div className="min-w-60 bg-base-100 rounded-xl shadow-2xl border border-base-content/10 backdrop-blur-sm overflow-hidden animate-fade-in">
        {/* Header - File Path */}
        <div className="px-4 py-3 border-b border-base-content/5 bg-linear-to-r from-base-100/50 to-transparent">
          <p className="text-xs text-base-content/60 truncate font-mono" title={path}>
            {path.split("/").pop() || path}
          </p>
        </div>

        {/* Menu Items */}
        <div className="p-2 space-y-1">
          {/* Edit Section */}
          <button onClick={onRename} className={itemStyle}>
            <Edit2 size={16} className="text-primary opacity-80" />
            <span>Rename</span>
          </button>

          <button onClick={onDuplicate} className={itemStyle}>
            <Copy size={16} className="text-primary opacity-80" />
            <span>Duplicate</span>
          </button>

          <button onClick={onMove} className={itemStyle}>
            <ArrowRight size={16} className="text-primary opacity-80" />
            <span>Move</span>
          </button>

          {/* Create Section - Only for directories */}
          {isDir && (
            <>
              {separator}

              <button onClick={onCreateFile} className={itemStyle}>
                <Plus size={16} className="text-success opacity-80" />
                <File size={14} className="text-success opacity-80" />
                <span>New File</span>
              </button>

              <button onClick={onCreateFolder} className={itemStyle}>
                <Plus size={16} className="text-success opacity-80" />
                <Folder size={14} className="text-success opacity-80" />
                <span>New Folder</span>
              </button>
            </>
          )}

          {/* Delete Section */}
          {separator}

          <button
            onClick={onDelete}
            className={`${itemStyle} text-error hover:bg-error/20 active:bg-error/25`}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
