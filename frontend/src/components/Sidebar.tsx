import {
  Folder,
  ChevronRight,
  GitBranch,
  GitCommit,
  Upload,
  Download,
  FolderOpen,
  FilePlus,
  FolderPlus,
} from "lucide-react";
import { getFileIcon } from "../utils/icons";
import { FileEntry } from "../types";
import { useState, useEffect } from "react";
import { useFileStore } from "../stores/fileStore";

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

interface TreeNode extends FileEntry {
  path: string;
  children?: TreeNode[];
  depth: number;
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
  const { cacheFolderContents, getCachedFolderContents } = useFileStore();
  const [gitExpanded, setGitExpanded] = useState(true);
  const [commitMessage, setCommitMessage] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  // Store folder contents when entries are loaded
  useEffect(() => {
    // Only store if we're at root level (no currentDir) or it's the initial load
    if (currentDir === "" || currentDir === undefined) {
      cacheFolderContents("", entries);
    } else if (currentDir) {
      // Store nested folder contents
      cacheFolderContents(currentDir, entries);
    }
  }, [currentDir, entries, cacheFolderContents]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        // Just collapse, don't navigate
        next.delete(path);
      } else {
        // Expand
        next.add(path);
        // Only navigate if we don't have the contents cached
        if (!getCachedFolderContents(path)) {
          onNavigate(path);
        }
      }
      return next;
    });
  };

  // Build tree structure recursively
  const buildTree = (
    parentPath: string = "",
    depth: number = 0,
  ): TreeNode[] => {
    const contents = getCachedFolderContents(parentPath) || [];

    return contents.map((entry) => {
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name;
      const isExpanded = expandedFolders.has(path);

      return {
        ...entry,
        path,
        depth,
        children:
          entry.isDir && isExpanded ? buildTree(path, depth + 1) : undefined,
      };
    });
  };

  const renderTreeNode = (node: TreeNode) => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = currentFile === node.path;
    const hasChildren = node.isDir;

    return (
      <div key={node.path}>
        <div
          className={`
            group relative flex items-center gap-2 px-2 py-1.5 rounded
            transition-all duration-150 cursor-pointer
            ${isActive
              ? "bg-base-300 font-medium border-l-2 border-primary"
              : "hover:bg-base-300/50"
            }
          `}
          style={{ paddingLeft: `${0.5 + node.depth * 1}rem` }}
          onContextMenu={(e) => {
            e.preventDefault();
            onFileMenu(e.clientX, e.clientY, node.path, node.isDir);
          }}
          onClick={() => {
            if (node.isDir) {
              toggleFolder(node.path);
            } else {
              onOpenFile(node.path);
            }
          }}
        >
          {/* Expand/collapse chevron for folders */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              className="shrink-0 p-0.5 rounded hover:bg-base-300 transition-colors"
            >
              <ChevronRight
                size={14}
                className={`transition-transform text-base-content/60 ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
          {!hasChildren && <div className="w-5.5" />}

          {/* File/Folder icon and name */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span
              className={`shrink-0 transition-transform ${isActive ? "scale-110" : ""}`}
            >
              {node.isDir ? (
                isExpanded ? (
                  <FolderOpen size={16} className="text-warning" />
                ) : (
                  <Folder size={16} className="text-warning" />
                )
              ) : (
                getFileIcon(node.name, false)
              )}
            </span>
            <span
              className={`
              truncate text-sm
              ${node.isDir ? "font-medium" : ""}
              ${isActive ? "text-base-content" : "text-base-content/90"}
            `}
            >
              {node.name}
            </span>
          </div>

          {/* Context menu button */}
          <button
            className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-base-300"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onFileMenu(
                rect.right - 140,
                rect.bottom + 4,
                node.path,
                node.isDir,
              );
            }}
            title="More options"
          >
            <span className="text-xs">⋮</span>
          </button>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && node.children && (
          <div>{node.children.map((child) => renderTreeNode(child))}</div>
        )}
      </div>
    );
  };

  const treeNodes = buildTree("", 0);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (commitMessage.trim()) {
      await onCommit(commitMessage);
      setCommitMessage("");
    }
  };

  return (
    <aside className="sidebar h-full bg-base-200 border-r border-base-300 flex flex-col overflow-hidden">
      {/* Header with Project Name */}
      <div className="p-3 flex justify-between items-center border-b border-base-300">
        {/* Project Root */}
        {projectRoot && (
          <div className="flex items-center gap-2">
            <Folder size={16} className="text-base-content/50 shrink-0" />
            <p
              className="text-xs text-base-content/60 truncate font-medium"
              title={projectRoot}
            >
              {projectRoot.split("/").pop() || projectRoot}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex">
          <button
            onClick={onCreateFile}
            className="btn btn-ghost flex-1 group justify-start"
            title="New file"
          >
            <FilePlus size={18} className="text-base-content/70" />
          </button>
          <button
            onClick={onCreateFolder}
            className="btn btn-ghost flex-1 group justify-start"
            title="New folder"
          >
            <FolderPlus size={18} className="text-base-content/70" />
          </button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <div className="p-2 space-y-0.5">
          {treeNodes.length === 0 ? (
            <div className="text-center py-8 text-base-content/40 text-sm">
              <Folder size={32} className="mx-auto mb-2 opacity-30" />
              <p>Empty folder</p>
            </div>
          ) : (
            treeNodes.map((node) => renderTreeNode(node))
          )}
        </div>
      </div>

      {/* Git Panel */}
      <div className="border-t border-base-300 bg-base-200">
        {/* Git Header - Collapsible */}
        <button
          onClick={() => setGitExpanded(!gitExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-base-300/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-base-content/70" />
            <h3 className="font-semibold text-sm">Source Control</h3>
          </div>
          <ChevronRight
            size={14}
            className={`transition-transform ${gitExpanded ? "rotate-90" : ""}`}
          />
        </button>

        {/* Git Content - Expandable */}
        <div
          className={`
            transition-all duration-200 overflow-hidden
            ${gitExpanded ? "max-h-96" : "max-h-0"}
          `}
        >
          <div className="px-4 pb-4 space-y-3">
            {/* Git Status */}
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">
                Status
              </label>
              <pre
                className={`
                  text-xs bg-base-300/50 p-2.5 rounded-md
                  overflow-y-auto max-h-24 font-mono
                  scrollbar-thin
                  ${gitError ? "text-error border border-error/30" : "text-base-content/80"}
                `}
              >
                {gitStatus || "Working tree clean"}
              </pre>
            </div>

            {/* Commit Form */}
            <form onSubmit={handleCommit} className="space-y-2">
              <label className="text-xs text-base-content/60 block">
                Commit Message
              </label>
              <div className="flex gap-2">
                <input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  className="input input-sm input-bordered flex-1 text-sm"
                />
                <button
                  type="submit"
                  className="btn btn-sm btn-primary gap-1.5"
                  disabled={!commitMessage.trim()}
                  title="Commit changes"
                >
                  <GitCommit size={14} />
                </button>
              </div>
            </form>

            {/* Push/Pull Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onPush}
                className="btn btn-sm btn-outline flex-1 gap-1.5 hover:btn-success group"
                title="Push to remote"
              >
                <Upload
                  size={14}
                  className="group-hover:-translate-y-0.5 transition-transform"
                />
                <span className="text-xs">Push</span>
              </button>
              <button
                onClick={onPull}
                className="btn btn-sm btn-outline flex-1 gap-1.5 hover:btn-info group"
                title="Pull from remote"
              >
                <Download
                  size={14}
                  className="group-hover:translate-y-0.5 transition-transform"
                />
                <span className="text-xs">Pull</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
