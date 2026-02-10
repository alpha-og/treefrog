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
import { motion, AnimatePresence } from "motion/react";
import { getFileIcon } from "@/utils/icons";
import { FileEntry } from "@/types";
import { useState, useEffect } from "react";
import { useFileStore } from "@/stores/fileStore";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { cn } from "@/lib/utils";

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
    // Don't cache empty entries - wait for actual data
    if (!entries || entries.length === 0) {
      return;
    }
    
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
    const contents = getCachedFolderContents(parentPath);
    
    // Defensive check - ensure contents is an array
    if (!contents || !Array.isArray(contents)) {
      return [];
    }

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
        <motion.div
          className={cn(
            "group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-150",
            isActive
              ? "bg-primary/15 font-medium border-l-2 border-primary shadow-sm"
              : "hover:bg-accent/50"
          )}
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
          whileHover={{ x: isActive ? 0 : 2 }}
          transition={{ duration: 0.15 }}
        >
          {/* Expand/collapse chevron for folders */}
          {hasChildren && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
              className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight
                size={14}
                className="text-muted-foreground"
              />
            </motion.button>
          )}
          {!hasChildren && <div className="w-5" />}

          {/* File/Folder icon and name */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <motion.span
              className="shrink-0"
              animate={{ scale: isActive ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
            >
              {node.isDir ? (
                isExpanded ? (
                  <FolderOpen size={16} className="text-amber-500" />
                ) : (
                  <Folder size={16} className="text-amber-500" />
                )
              ) : (
                getFileIcon(node.name, false)
              )}
            </motion.span>
            <span
              className={cn(
                "truncate text-sm",
                node.isDir ? "font-medium" : "",
                isActive ? "text-foreground" : "text-foreground/90"
              )}
            >
              {node.name}
            </span>
          </div>

          {/* Context menu button */}
          <button
            className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
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
            <span className="text-xs text-muted-foreground">⋮</span>
          </button>
        </motion.div>

        {/* Render children if expanded */}
        <AnimatePresence>
          {hasChildren && isExpanded && node.children && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {node.children.map((child) => renderTreeNode(child))}
            </motion.div>
          )}
        </AnimatePresence>
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
    <aside className="sidebar h-full bg-muted/30 backdrop-blur-sm border-r flex flex-col overflow-hidden">
      {/* Header with Project Name */}
      <div className="p-4 flex justify-between items-center border-b bg-gradient-to-br from-card/50 to-transparent">
        {/* Project Root */}
        {projectRoot && (
          <div className="flex items-center gap-2">
            <Folder size={16} className="text-muted-foreground shrink-0" />
            <p
              className="text-xs text-muted-foreground truncate font-medium"
              title={projectRoot}
            >
              {projectRoot.split("/").pop() || projectRoot}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateFile}
            title="New file"
            className="h-8 w-8"
          >
            <FilePlus size={16} className="text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCreateFolder}
            title="New folder"
            className="h-8 w-8"
          >
            <FolderPlus size={16} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-0.5">
        {treeNodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Folder size={32} className="mx-auto mb-2 opacity-30" />
            <p>Empty folder</p>
          </div>
        ) : (
          treeNodes.map((node) => renderTreeNode(node))
        )}
      </div>

      {/* Git Panel */}
      <div className="border-t bg-gradient-to-t from-muted/50 to-transparent">
        {/* Git Header - Collapsible */}
        <button
          onClick={() => setGitExpanded(!gitExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-colors duration-200"
        >
          <div className="flex items-center gap-2">
            <GitBranch size={14} className="text-muted-foreground" />
            <h3 className="font-semibold text-sm">Source Control</h3>
          </div>
          <motion.div
            animate={{ rotate: gitExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight size={14} className="text-muted-foreground" />
          </motion.div>
        </button>

        {/* Git Content - Expandable */}
        <AnimatePresence>
          {gitExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Git Status */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Status
                  </label>
                  <pre
                    className={cn(
                      "text-xs bg-muted/50 p-3 rounded-lg overflow-y-auto max-h-24 font-mono border",
                      gitError ? "text-destructive border-destructive/20" : "text-muted-foreground border-border"
                    )}
                  >
                    {gitStatus || "Working tree clean"}
                  </pre>
                </div>

                {/* Commit Form */}
                <form onSubmit={handleCommit} className="space-y-2">
                  <label className="text-xs text-muted-foreground block">
                    Commit Message
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Enter commit message..."
                      className="flex-1 h-8 text-sm"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!commitMessage.trim()}
                      title="Commit changes"
                      className="h-8 w-8"
                    >
                      <GitCommit size={14} />
                    </Button>
                  </div>
                </form>

                {/* Push/Pull Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPush}
                    className="flex-1 gap-1.5"
                    title="Push to remote"
                  >
                    <Upload size={14} />
                    <span className="text-xs">Push</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPull}
                    className="flex-1 gap-1.5"
                    title="Pull from remote"
                  >
                    <Download size={14} />
                    <span className="text-xs">Pull</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
