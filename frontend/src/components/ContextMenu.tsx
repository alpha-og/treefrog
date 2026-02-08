import { useEffect, useRef } from "react";
import { Edit2, Copy, ChevronRight, File, Folder, Trash2 } from "lucide-react";

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
    "w-full flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-150 hover:bg-base-200 active:bg-base-300";

  const separator = (
    <li className="my-1">
      <div className="border-t border-base-300/70 mx-2" />
    </li>
  );

  return (
    <div
      ref={ref}
      className="fixed dropdown dropdown-open"
      style={{ top: `${y}px`, left: `${x}px`, zIndex: 50 }}
    >
      <div className="dropdown-content min-w-[200px] max-w-[260px] bg-base-100 rounded-xl panel-shadow border border-base-300">
        {/* Header */}
        <div className="px-3 pt-2 pb-2 border-b border-base-300">
          <p className="text-xs text-base-content/60 truncate">{path}</p>
        </div>

        <ul className="menu p-1 text-sm">
          <li>
            <button onClick={onRename} className={itemStyle}>
              <Edit2 size={16} className="opacity-70 shrink-0" />
              Rename
            </button>
          </li>

          <li>
            <button onClick={onDuplicate} className={itemStyle}>
              <Copy size={16} className="opacity-70 shrink-0" />
              Duplicate
            </button>
          </li>

          <li>
            <button onClick={onMove} className={itemStyle}>
              <ChevronRight size={16} className="opacity-70 shrink-0" />
              Move
            </button>
          </li>

          {isDir && (
            <>
              {separator}

              <li>
                <button onClick={onCreateFile} className={itemStyle}>
                  <File size={16} className="opacity-70 shrink-0" />
                  New File
                </button>
              </li>

              <li>
                <button onClick={onCreateFolder} className={itemStyle}>
                  <Folder size={16} className="opacity-70 shrink-0" />
                  New Folder
                </button>
              </li>
            </>
          )}

          {separator}

          <li>
            <button
              onClick={onDelete}
              className={`${itemStyle} text-error hover:bg-error/10`}
            >
              <Trash2 size={16} className="shrink-0" />
              Delete
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
