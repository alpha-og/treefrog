import { useCallback } from "react";
import { useSelectionStore } from "../stores/selectionStore";
import { TreeNode, flattenTree } from "../utils/treeUtils";

interface UseTreeKeyboardOptions {
  treeNodes: TreeNode[];
  expandedFolders: Set<string>;
  currentFile: string;
  onExpand: (path: string) => void;
  onCollapse: (path: string) => void;
  onOpenFile: (path: string) => void;
  onDelete: () => void;
  onRename: () => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
}

interface UseTreeKeyboardReturn {
  handleKeyDown: (e: React.KeyboardEvent) => void;
  focusNode: (path: string) => void;
}

export function useTreeKeyboard(options: UseTreeKeyboardOptions): UseTreeKeyboardReturn {
  const {
    treeNodes,
    expandedFolders,
    currentFile,
    onExpand,
    onCollapse,
    onOpenFile,
    onDelete,
    onRename,
    onCreateFile,
    onCreateFolder,
  } = options;

  const {
    lastSelectedId,
    select,
    toggle,
    selectRange,
    selectAll,
    clear,
  } = useSelectionStore();

  const flatPaths = flattenTree(treeNodes);
  const currentIndex = flatPaths.indexOf(currentFile);

  const focusNode = useCallback((path: string) => {
    const element = document.querySelector(`[data-path="${path}"]`) as HTMLElement;
    if (element) {
      element.focus();
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (currentIndex > 0) {
          const prevPath = flatPaths[currentIndex - 1];
          if (isShift && lastSelectedId) {
            selectRange(lastSelectedId, prevPath, flatPaths);
          } else if (isCtrl) {
            toggle(prevPath);
          } else {
            clear();
            select(prevPath);
          }
          focusNode(prevPath);
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        if (currentIndex < flatPaths.length - 1) {
          const nextPath = flatPaths[currentIndex + 1];
          if (isShift && lastSelectedId) {
            selectRange(lastSelectedId, nextPath, flatPaths);
          } else if (isCtrl) {
            toggle(nextPath);
          } else {
            clear();
            select(nextPath);
          }
          focusNode(nextPath);
        }
        break;

      case "ArrowRight":
        e.preventDefault();
        if (currentFile) {
          const node = findNode(treeNodes, currentFile);
          if (node?.isDir) {
            if (expandedFolders.has(currentFile)) {
              // Already expanded, navigate to first child
              const currentIdx = flatPaths.indexOf(currentFile);
              if (currentIdx < flatPaths.length - 1) {
                const nextPath = flatPaths[currentIdx + 1];
                clear();
                select(nextPath);
                focusNode(nextPath);
              }
            } else {
              // Expand folder
              onExpand(currentFile);
            }
          }
        }
        break;

      case "ArrowLeft":
        e.preventDefault();
        if (currentFile) {
          const node = findNode(treeNodes, currentFile);
          if (node?.isDir && expandedFolders.has(currentFile)) {
            // Collapse folder
            onCollapse(currentFile);
          } else {
            // Navigate to parent
            const parentPath = currentFile.split("/").slice(0, -1).join("/");
            if (parentPath) {
              clear();
              select(parentPath);
              focusNode(parentPath);
            }
          }
        }
        break;

      case "Enter":
        e.preventDefault();
        if (currentFile) {
          const node = findNode(treeNodes, currentFile);
          if (node?.isDir) {
            if (expandedFolders.has(currentFile)) {
              onCollapse(currentFile);
            } else {
              onExpand(currentFile);
            }
          } else {
            onOpenFile(currentFile);
          }
        }
        break;

      case " ":
        e.preventDefault();
        if (currentFile) {
          toggle(currentFile);
        }
        break;

      case "a":
        if (isCtrl) {
          e.preventDefault();
          selectAll(flatPaths);
        }
        break;

      case "Escape":
        e.preventDefault();
        clear();
        break;

      case "Delete":
      case "Backspace":
        if (!isCtrl) {
          e.preventDefault();
          onDelete();
        }
        break;

      case "F2":
        e.preventDefault();
        onRename();
        break;

      case "n":
        if (isCtrl) {
          e.preventDefault();
          onCreateFile();
        }
        break;

      case "N":
        if (isCtrl && isShift) {
          e.preventDefault();
          onCreateFolder();
        }
        break;

      default:
        break;
    }
  }, [
    treeNodes,
    flatPaths,
    currentIndex,
    currentFile,
    expandedFolders,
    lastSelectedId,
    select,
    toggle,
    selectRange,
    selectAll,
    clear,
    onExpand,
    onCollapse,
    onOpenFile,
    onDelete,
    onRename,
    onCreateFile,
    onCreateFolder,
    focusNode,
  ]);

  return {
    handleKeyDown,
    focusNode,
  };
}

// Helper to find a node in the tree
function findNode(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}
