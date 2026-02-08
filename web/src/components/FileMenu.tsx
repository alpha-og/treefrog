import { useEffect, useRef } from "react";
import { Edit2, Copy, ChevronRight, FileText, Folder, Trash2 } from "lucide-react";

interface FileMenuProps {
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

export default function FileMenu({
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
}: FileMenuProps) {
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

  return (
    <div
      ref={ref}
      className="dropdown dropdown-open fixed"
      style={{ top: `${y}px`, left: `${x}px`, zIndex: 50 }}
    >
      <div className="dropdown-content menu bg-base-100 rounded-box shadow-lg border border-base-300">
        <ul className="p-0">
          <li>
            <a onClick={onRename} className="gap-2">
              <Edit2 size={14} />
              Rename
            </a>
          </li>
          <li>
            <a onClick={onDuplicate} className="gap-2">
              <Copy size={14} />
              Duplicate
            </a>
          </li>
          <li>
            <a onClick={onMove} className="gap-2">
              <ChevronRight size={14} />
              Move
            </a>
          </li>
          {isDir && (
            <>
              <li className="divider m-0"></li>
              <li>
                <a onClick={onCreateFile} className="gap-2">
                  <FileText size={14} />
                  New File
                </a>
              </li>
              <li>
                <a onClick={onCreateFolder} className="gap-2">
                  <Folder size={14} />
                  New Folder
                </a>
              </li>
            </>
          )}
          <li className="divider m-0"></li>
          <li>
            <a onClick={onDelete} className="gap-2 text-error">
              <Trash2 size={14} />
              Delete
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

