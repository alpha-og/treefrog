import { Plus, Folder, FileText, ChevronRight } from "lucide-react";
import { getFileIcon } from "../utils/icons";
import { FileEntry } from "../types";

interface SidebarProps {
  projectRoot: string;
  entries: FileEntry[];
  currentDir: string;
  currentFile: string;
  onNavigate: (dir: string) => void;
  onOpenFile: (path: string) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onFileMenu: (x: number, y: number, path: string, isDir: boolean) => void;
  gitStatus: string;
  gitError: boolean;
  onCommit: (msg: string) => Promise<void>;
  onPush: () => Promise<void>;
  onPull: () => Promise<void>;
}

export default function Sidebar({
  projectRoot,
  entries,
  currentDir,
  currentFile,
  onNavigate,
  onOpenFile,
  onCreateFile,
  onCreateFolder,
  onFileMenu,
  gitStatus,
  gitError,
  onCommit,
  onPush,
  onPull,
}: SidebarProps) {
  const breadcrumbs = currentDir
    ? [{ name: "root", path: "" }, ...currentDir.split("/").reduce<Array<{ name: string; path: string }>>((acc, p) => {
        const path = acc.length > 0 ? `${acc[acc.length - 1].path}/${p}` : p;
        acc.push({ name: p, path });
        return acc;
      }, [])]
    : [{ name: "root", path: "" }];

  return (
    <aside className="sidebar h-full bg-base-200 border-r border-base-300 flex flex-col overflow-hidden">
      {/* File Browser Header */}
      <div className="p-4 border-b border-base-300">
        <h2 className="text-lg font-semibold mb-1">Files</h2>
        {projectRoot && (
          <p className="text-xs text-base-content/60 mb-3 truncate">{projectRoot}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCreateFile}
            className="btn btn-sm btn-ghost gap-1 flex-1"
            title="New file"
          >
            <FileText size={16} />
            File
          </button>
          <button
            onClick={onCreateFolder}
            className="btn btn-sm btn-ghost gap-1 flex-1"
            title="New folder"
          >
            <Folder size={16} />
            Folder
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="px-4 py-2 flex items-center gap-1 text-sm overflow-x-auto border-b border-base-300">
        {breadcrumbs.map((b, i) => (
          <div key={b.path} className="flex items-center gap-1">
            <button
              onClick={() => onNavigate(b.path)}
              className="btn btn-xs btn-ghost"
            >
              {b.name}
            </button>
            {i < breadcrumbs.length - 1 && <ChevronRight size={14} />}
          </div>
        ))}
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        <ul className="menu menu-compact w-full p-2 gap-1">
          {entries.map((f) => {
            const path = currentDir ? `${currentDir}/${f.name}` : f.name;
            const isActive = currentFile === path;

            return (
              <li key={f.name}>
                <div
                  className={`flex items-center gap-2 ${isActive ? "active" : ""}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onFileMenu(e.clientX, e.clientY, path, f.isDir);
                  }}
                >
                  {f.isDir ? (
                    <button
                      onClick={() => onNavigate(path)}
                      className="flex-1 flex items-center gap-2 justify-start"
                    >
                      {getFileIcon(f.name, true)}
                      <span className="truncate">{f.name}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onOpenFile(path)}
                      className="flex-1 flex items-center gap-2 justify-start"
                    >
                      {getFileIcon(f.name, false)}
                      <span className="truncate">{f.name}</span>
                    </button>
                  )}
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onFileMenu(rect.right - 140, rect.bottom + 4, path, f.isDir);
                    }}
                  >
                    ⋮
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Git Panel */}
      <div className="border-t border-base-300 p-4 space-y-3">
        <h3 className="font-semibold text-sm">Git</h3>
        <pre
          className={`text-xs bg-base-300 p-2 rounded overflow-y-auto max-h-32 ${
            gitError ? "text-error" : ""
          }`}
        >
          {gitStatus || "clean"}
        </pre>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem("message") as HTMLInputElement);
            if (input?.value) {
              await onCommit(input.value);
              input.value = "";
            }
          }}
          className="flex gap-1"
        >
          <input
            name="message"
            placeholder="Commit message"
            className="input input-sm input-bordered flex-1"
          />
          <button type="submit" className="btn btn-sm btn-ghost">
            ✓
          </button>
        </form>
        <div className="flex gap-2">
          <button onClick={onPush} className="btn btn-xs btn-ghost flex-1">
            Push
          </button>
          <button onClick={onPull} className="btn btn-xs btn-ghost flex-1">
            Pull
          </button>
        </div>
      </div>
    </aside>
  );
}
