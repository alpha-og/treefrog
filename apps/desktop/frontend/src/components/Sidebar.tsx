import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GitCommit,
  Upload,
  Download,
  GitBranch,
  ChevronRight,
} from "lucide-react";
import { useFileStore } from "@/stores/fileStore";
import { useSelectionStore } from "@/stores/selectionStore";
import { useExternalDrop } from "@/hooks/useExternalDrop";
import { useTreeSearch } from "@/hooks/useTreeSearch";
import { useTreeKeyboard } from "@/hooks/useTreeKeyboard";
import {
  TreeNode as TreeNodeType,
  buildTree,
  flattenTree,
  sortTree,
  filterByType,
  filterHiddenNodes,
} from "@/utils/treeUtils";
import {
  persistExpandedFolders,
  loadExpandedFolders,
  persistFilterSettings,
  loadFilterSettings,
} from "@/utils/treePersistence";
import { createLogger } from "@/utils/logger";
import { FileEntry } from "@/types";
import { cn } from "@/lib/utils";
import { fsUploadFiles } from "@/services/fsService";

// Components
import { Button } from "@/components/common";
import { Input } from "@/components/common";
import { SidebarHeader } from "./Sidebar/SidebarHeader";
import { SidebarSearch } from "./Sidebar/SidebarSearch";
import { FilterBar } from "./Sidebar/FilterBar";
import { TreeNode } from "./Sidebar/TreeNode";
import { ExternalDropZone } from "./Sidebar/ExternalDropZone";
import { getFileIcon } from "@/utils/icons";

const log = createLogger("Sidebar");

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
  onEmptySpaceMenu?: (x: number, y: number) => void;
  onDelete?: (path: string, isDir: boolean) => void;
  onRename?: (path: string) => void;
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
  onEmptySpaceMenu,
  onDelete,
  onRename,
  gitStatus,
  gitError,
  onCommit,
  onPush,
  onPull,
}: SidebarProps) {
  // File store - use individual selectors to prevent re-renders
  const cacheFolderContents = useFileStore((state) => state.cacheFolderContents);
  const getCachedFolderContents = useFileStore((state) => state.getCachedFolderContents);
  const clearAllFolderCache = useFileStore((state) => state.clearAllFolderCache);
  const searchQuery = useFileStore((state) => state.searchQuery);
  const filterHidden = useFileStore((state) => state.filterHidden);
  const filterType = useFileStore((state) => state.filterType);
  const sortBy = useFileStore((state) => state.sortBy);
  const sortOrder = useFileStore((state) => state.sortOrder);
  const setSearchQuery = useFileStore((state) => state.setSearchQuery);
  const toggleFilterHidden = useFileStore((state) => state.toggleFilterHidden);
  const setFilterType = useFileStore((state) => state.setFilterType);
  const setSortBy = useFileStore((state) => state.setSortBy);
  const toggleSortOrder = useFileStore((state) => state.toggleSortOrder);

  // Selection store - use individual selectors
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const lastSelectedId = useSelectionStore((state) => state.lastSelectedId);
  const toggleSelection = useSelectionStore((state) => state.toggle);
  const selectRange = useSelectionStore((state) => state.selectRange);
  const clearSelection = useSelectionStore((state) => state.clear);

  // Local state
   const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
     () => loadExpandedFolders(projectRoot)
   );
   const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
   const [commitMessage, setCommitMessage] = useState("");
   const [isCommitting, setIsCommitting] = useState(false);
   const [isGitExpanded, setIsGitExpanded] = useState(true);

  // Track previous project root to detect project switches
  const prevProjectRootRef = useRef(projectRoot);

  // Reset state when project changes
  useEffect(() => {
    if (projectRoot !== prevProjectRootRef.current) {
      prevProjectRootRef.current = projectRoot;
      setExpandedFolders(new Set());
      clearAllFolderCache();
      clearSelection();
      setSearchQuery("");
    }
  }, [projectRoot, clearAllFolderCache, clearSelection, setSearchQuery]);

// Load persisted filter settings on mount and pre-load expanded folder contents
    useEffect(() => {
      const settings = loadFilterSettings();
      // Only apply if not already set
      if (!filterHidden && settings.hidden) {
        toggleFilterHidden();
      }
      if (settings.sortBy !== sortBy) {
        setSortBy(settings.sortBy);
      }
      if (settings.sortOrder !== sortOrder) {
        toggleSortOrder();
      }
      
      // Pre-load contents for folders that are already expanded from localStorage
      // This ensures they show with children on initial load
      expandedFolders.forEach(folderPath => {
        const cachedContents = getCachedFolderContents(folderPath);
        if (!cachedContents && folderPath) {
          // Load contents for pre-expanded folders
          void onNavigate(folderPath);
        }
      });
     }, [expandedFolders, getCachedFolderContents, onNavigate]);

  // Persist expanded folders
  useEffect(() => {
    persistExpandedFolders(expandedFolders, projectRoot);
  }, [expandedFolders, projectRoot]);

  // Persist filter settings
  useEffect(() => {
    persistFilterSettings({
      hidden: filterHidden,
      sortBy,
      sortOrder,
    });
  }, [filterHidden, sortBy, sortOrder]);

   // Cache folder contents
   useEffect(() => {
     if (!entries || entries.length === 0) return;
     
     // Cache the entries for the current directory
     // This ensures both root and nested directories are cached
     if (currentDir === "" || currentDir === undefined) {
       cacheFolderContents("", entries);
     } else if (currentDir) {
       cacheFolderContents(currentDir, entries);
     }
   }, [currentDir, entries, cacheFolderContents]);

     // Build tree structure
     const treeNodes = useMemo(() => {
       // Use consistent caching approach for all levels
       const getCachedContents = (path: string) => {
         if (path === "") {
           // For root level, use cache if available, otherwise use entries
           const cached = getCachedFolderContents(path);
           return cached && cached.length > 0 ? cached : entries;
         }
         // For nested folders, use cache
         return getCachedFolderContents(path);
       };

     let nodes = buildTree("", 0, getCachedContents, expandedFolders);
     
     // Apply filtering and sorting
     if (filterHidden) {
       nodes = filterHiddenNodes(nodes);
     }
     if (filterType !== "all") {
       nodes = filterByType(nodes, filterType);
     }
     nodes = sortTree(nodes, sortBy, sortOrder);
     
     return nodes;
   }, [
     entries,
     getCachedFolderContents,
     expandedFolders,
     filterHidden,
     filterType,
     sortBy,
     sortOrder,
   ]);

  // Search functionality
  const { results: searchedNodes, resultCount, isSearching } = useTreeSearch({
    treeNodes,
  });

  const displayNodes = isSearching ? searchedNodes : treeNodes;

   // Flatten for keyboard navigation
   const flatPaths = useMemo(() => flattenTree(displayNodes), [displayNodes]);

// Toggle folder expansion
     const toggleFolder = useCallback((path: string) => {
       setExpandedFolders((prev) => {
         const next = new Set(prev);
         if (next.has(path)) {
           next.delete(path);
         } else {
           next.add(path);
         }
         return next;
       });

       // Load contents if not cached (do this after state update)
       const cachedContents = getCachedFolderContents(path);
       if (!cachedContents && path) {
         void onNavigate(path);
       }
     }, [onNavigate, getCachedFolderContents]);

// Handle node selection with multi-select
   const handleNodeSelect = useCallback(
     (path: string, e: React.MouseEvent) => {
       const isCtrl = e.ctrlKey || e.metaKey;
       const isShift = e.shiftKey;

       if (isShift && lastSelectedId) {
         selectRange(lastSelectedId, path, flatPaths);
       } else if (isCtrl) {
         toggleSelection(path);
       } else {
         clearSelection();
       }
     },
     [flatPaths, lastSelectedId, toggleSelection, selectRange, clearSelection]
   );

   // External drop handlers
   const {
     isDraggingOver: isExternalDragging,
     dropTarget: externalDropTarget,
     handleDragEnter: handleExternalDragEnter,
     handleDragOver: handleExternalDragOver,
     handleDragLeave: handleExternalDragLeave,
     handleDrop: handleExternalDrop,
   } = useExternalDrop({
     onDropFiles: async (files, targetPath) => {
        try {
          const resolvedTarget = targetPath || currentDir;
          await fsUploadFiles(files, resolvedTarget);
          log.info("Files uploaded successfully", { count: files.length, targetPath: resolvedTarget });
        } catch (err) {
          log.error("Failed to upload dropped files", err);
        }
     },
   });

  // Keyboard navigation
  const {
    handleKeyDown,
  } = useTreeKeyboard({
    treeNodes: displayNodes,
    expandedFolders,
    currentFile,
    onExpand: toggleFolder,
    onCollapse: (path) => {
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    },
    onOpenFile,
     onDelete: () => {
       if (onDelete && lastSelectedId) {
         const node = displayNodes.find(n => n.path === lastSelectedId);
         if (node) {
           onDelete(lastSelectedId, node.isDir);
         }
       }
     },
     onRename: () => {
       if (onRename && lastSelectedId) {
         onRename(lastSelectedId);
       }
     },
    onCreateFile,
    onCreateFolder,
  });

   // Render tree recursively
   const renderTree = useCallback(
     (nodes: TreeNodeType[]) => {
       return nodes.map((node) => {
         const isExpanded = expandedFolders.has(node.path);
        const isActive = currentFile === node.path;
        const isSelected = selectedIds.has(node.path);

        return (
          <TreeNode
            key={node.path}
            node={node}
            isExpanded={isExpanded}
            isActive={isActive}
            isSelected={isSelected}
            onToggle={() => toggleFolder(node.path)}
            onOpen={() => onOpenFile(node.path)}
            onSelect={(e) => handleNodeSelect(node.path, e)}
            onContextMenu={(e) => {
              e.preventDefault();
              onFileMenu(e.clientX, e.clientY, node.path, node.isDir);
            }}
          >
            {node.children && renderTree(node.children)}
          </TreeNode>
        );
       });
     },
     [
        expandedFolders,
        currentFile,
        selectedIds,
        toggleFolder,
        onOpenFile,
        handleNodeSelect,
        onFileMenu,
      ]
    );

  // Get project name
  const projectName = useMemo(() => projectRoot.split("/").pop() || projectRoot, [projectRoot]);

  // Build breadcrumbs from current file/dir
  const breadcrumbs = useMemo(() => {
    if (!currentFile) return [];
    const parts = currentFile.split("/");
    parts.pop(); // Remove filename
    return parts;
  }, [currentFile]);

   return (
      <aside
        className="sidebar h-full bg-muted/30 backdrop-blur-sm border-r flex flex-col overflow-hidden relative contain-layout"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
       {/* External drop overlay */}
       <ExternalDropZone
         isActive={isExternalDragging}
         targetPath={externalDropTarget}
         onDragEnter={handleExternalDragEnter}
         onDragOver={handleExternalDragOver}
         onDragLeave={handleExternalDragLeave}
          onDrop={handleExternalDrop}
        />

        {/* Header */}
        <SidebarHeader
          projectRoot={projectRoot}
          projectName={projectName}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
          onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
          isSearchOpen={isSearchOpen}
          isFilterOpen={isFilterOpen}
          selectionCount={selectedIds.size}
          onClearSelection={clearSelection}
          breadcrumbs={breadcrumbs}
          onBreadcrumbClick={(index) => {
            const path = breadcrumbs.slice(0, index + 1).join("/");
            onNavigate(path);
          }}
        />

        {/* Search */}
        <SidebarSearch
          query={searchQuery}
          onChange={setSearchQuery}
          resultCount={resultCount}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />

        {/* Filter Bar */}
        {isFilterOpen && (
          <FilterBar
            filterHidden={filterHidden}
            onToggleHidden={toggleFilterHidden}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortOrder={sortOrder}
            onToggleSortOrder={toggleSortOrder}
          />
        )}

         {/* Tree */}
           <div 
             className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5 contain-paint will-change-scroll"
             onContextMenu={(e) => {
               // Only show context menu if clicking on empty space (not on a node)
               if (e.target === e.currentTarget && onEmptySpaceMenu) {
                 e.preventDefault();
                 onEmptySpaceMenu(e.clientX, e.clientY);
               }
             }}
            >
            {displayNodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isSearching ? (
                 <>
                   <p>No matches found</p>
                   <p className="text-xs mt-1">Try a different search term</p>
                 </>
               ) : (
                 <>
                   <div className="mx-auto mb-2 opacity-30">
                     {getFileIcon("folder", true)}
                   </div>
                   <p>Empty folder</p>
                 </>
               )}
             </div>
           ) : (
             renderTree(displayNodes)
           )}
        </div>

         {/* Git Footer */}
         <AnimatePresence>
           {projectRoot && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.2, ease: "easeOut" }}
               className="border-t bg-muted/30 backdrop-blur-sm will-change-transform"
             >
              {/* Git Header - Collapsible */}
              <button
                onClick={() => setIsGitExpanded(!isGitExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitBranch size={14} className="text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Source Control</h3>
                </div>
                 <motion.div
                   animate={{ rotate: isGitExpanded ? 90 : 0 }}
                   transition={{ duration: 0.2, ease: "easeOut" }}
                   className="will-change-transform"
                 >
                  <ChevronRight size={14} className="text-muted-foreground" />
                </motion.div>
              </button>

                {/* Git Content - Expandable */}
                <AnimatePresence mode="wait">
                  {isGitExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="overflow-hidden will-change-transform"
                    >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Git Status */}
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Status
                        </label>
                        <pre
                          className={cn(
                            "text-xs p-2.5 rounded-md overflow-y-auto max-h-24 font-mono whitespace-pre-wrap break-words",
                            gitError
                              ? "bg-destructive/10 text-destructive border border-destructive/30"
                              : "bg-muted/50 text-muted-foreground"
                          )}
                        >
                          {gitStatus || "Working tree clean"}
                        </pre>
                      </div>

                      {/* Commit Form */}
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!commitMessage.trim() || isCommitting) return;
                          
                          setIsCommitting(true);
                          try {
                            await onCommit(commitMessage.trim());
                            setCommitMessage("");
                          } catch (err) {
                            log.error("Failed to commit", err);
                          } finally {
                            setIsCommitting(false);
                          }
                        }}
                        className="space-y-2"
                      >
                        <label className="text-xs text-muted-foreground block">
                          Commit Message
                        </label>
                        <div className="flex gap-2">
                          <Input
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            placeholder="Enter commit message..."
                            className="flex-1 h-8 text-sm"
                            disabled={isCommitting}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            disabled={!commitMessage.trim() || isCommitting}
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
             </motion.div>
           )}
         </AnimatePresence>
       </aside>
     );
   }
