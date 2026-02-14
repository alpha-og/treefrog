import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { pdfjs } from "react-pdf";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
// Components
import Toolbar from "@/components/Toolbar";
import Sidebar from "@/components/Sidebar";
import { EditorPane } from "@/components/EditorPane";
import PreviewPane from "@/components/PreviewPane";
import ProjectPicker from "@/components/ProjectPicker";
import ContextMenu from "@/components/ContextMenu";
import EmptyPlaceholder from "@/components/EmptyPlaceholder";
import FramelessWindow from "@/components/FramelessWindow";

// Types
import { BuildStatus, ModalState } from "@/types";

// Stores
import { useAppStore } from "@/stores/appStore";
import { useFileStore } from "@/stores/fileStore";
import { usePaneStore, useDimensionStore } from "@/stores/layoutStore";
import { useModalStore } from "@/stores/modalStore";
import { useRecentProjectsStore } from "@/stores/recentProjectsStore";

// Hooks
import { useProject } from "@/hooks/useProject";
import { useFiles } from "@/hooks/useFiles";
import { useBuild } from "@/hooks/useBuild";
import { useGit } from "@/hooks/useGit";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSyncTeX } from "@/hooks/useSyncTex";

// Services
import { syncConfig } from "@/services/configService";

// Utils
import { clampPage, modalTitle, modalPlaceholder, modalHint } from "@/utils/ui";
import { joinPath } from "@/utils/path";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/common/Dialog";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Helper to resolve theme to light or dark
function resolveTheme(theme: "light" | "dark" | "system"): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export default function Editor() {
  // ========== ROUTER ==========
  const navigate = useNavigate();

  // ========== STORES ==========
  const { theme, setTheme, apiUrl, compilerUrl, compilerToken } = useAppStore();
  const { addProject } = useRecentProjectsStore();
  const {
    entries,
    currentDir,
    currentFile,
    isBinary,
    fileContent,
    setCurrentDir,
    setCurrentFile,
    setFileContent,
  } = useFileStore();
  const { sidebar, editor, preview, toggle: togglePane } = usePaneStore();
  const { sidebarWidth, editorWidth, setSidebarWidth, setEditorWidth } =
    useDimensionStore();
  const { modal, modalInput, openModal, closeModal, setModalInput } =
    useModalStore();

  // ========== HOOKS ==========
  const {
    root: projectRoot,
    showPicker,
    setShowPicker,
    select: selectProject,
    loading: projectLoading,
  } = useProject();
  const {
    loadEntries,
    openFile,
    saveFile,
    createFile,
    renameFile,
    moveFile,
    duplicateFile,
    deleteFile,
    refresh: _refreshFiles,
    clear: clearFiles,
  } = useFiles();
  const { status: buildStatus, build, updateStatus } = useBuild();
  const {
    status: gitStatus,
    isError: gitError,
    refresh: refreshGit,
    commit,
    push,
    pull,
  } = useGit();

  // ========== SYNCTEX ==========
  const { fromCursor, fromClick } = useSyncTeX(buildStatus?.id ?? null);

  // ========== UI STATE ==========
  const [engine, setEngine] = useState<string>("pdflatex");
  const [shellEscape, setShellEscape] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.2);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageInput, setPageInput] = useState<string>("1");
  const [configSynced, setConfigSynced] = useState<boolean>(false);
  const [pdfKey, setPdfKey] = useState<number>(Date.now());

  // ========== MODAL STATE ==========
   const [contextMenu, setContextMenu] = useState<{
     x: number;
     y: number;
     path: string;
     isDir: boolean;
     isRoot?: boolean;
   } | null>(null);

  // ========== RESIZE STATE ==========
  const [_isResizing, setIsResizing] = useState<
    "sidebar-editor" | "editor-preview" | null
  >(null);

  // ========== REFS ==========
  const currentFileRef = useRef<string>("");
  const pageProxyRef = useRef<Map<number, pdfjs.PDFPageProxy>>(new Map());
  const buildTimer = useRef<number | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const mainRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef<number>(0);
  const startDimsRef = useRef<{ sidebar: number; editor: number }>({
    sidebar: 0,
    editor: 0,
  });
  const resizingRef = useRef<"sidebar-editor" | "editor-preview" | null>(null);
  const revealLineRef = useRef<((line: number, col?: number) => void) | null>(null);

  // Keep currentFileRef in sync
  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  // ========== WEBSOCKET ==========
  const handleBuildMessage = useCallback(
    (data: BuildStatus) => {
      updateStatus(data);
      if (data.state === "success") {
        setPdfKey(Date.now());
        refreshGit();
      }
    },
    [refreshGit, updateStatus],
  );

  useWebSocket(handleBuildMessage);

  // ========== EFFECTS ==========



  // Sync config to server
  useEffect(() => {
    const doSync = async () => {
      try {
        await syncConfig(compilerUrl, compilerToken);
        setConfigSynced(true);
        window.setTimeout(() => setConfigSynced(false), 2000);
      } catch (err) {
        console.warn("Could not send config to server:", err);
      }
    };
    doSync();
  }, [compilerUrl, compilerToken]);

  // Load files when project is set
  useEffect(() => {
    if (projectRoot && !projectLoading) {
      console.log("[Editor] Loading files for project:", projectRoot);
      loadEntries("");
      refreshGit();
      // Auto-open main.tex if it exists
      openFile("main.tex").catch(() => {
        // File doesn't exist, clear editor to show empty state
        setCurrentFile("");
        setFileContent("");
      });
    }
  }, [projectRoot, projectLoading, loadEntries, refreshGit, openFile, setCurrentFile, setFileContent]);

  // Clamp page input when numPages changes
  useEffect(() => {
    if (numPages > 0) {
      const next = String(clampPage(Number(pageInput || "1"), numPages));
      if (next !== pageInput) {
        setPageInput(next);
      }
    }
  }, [numPages]);

  // ========== BUILD FUNCTIONS ==========
  const scheduleBuild = useCallback(() => {
    if (buildTimer.current) window.clearTimeout(buildTimer.current);
    buildTimer.current = window.setTimeout(async () => {
      const mainFile = currentFileRef.current || "main.tex";
      await build(mainFile, engine, shellEscape);
    }, 500);
  }, [build, engine, shellEscape]);

  const triggerBuild = useCallback(async () => {
    const mainFile = currentFileRef.current || "main.tex";
    await build(mainFile, engine, shellEscape);
  }, [build, engine, shellEscape]);

  // ========== PROJECT SELECTION ==========
  const handleSelectProject = useCallback(
    async (path: string) => {
      addProject(path);
      await selectProject(path);
      clearFiles();
      await loadEntries("");
      await refreshGit();
    },
    [selectProject, clearFiles, loadEntries, refreshGit, addProject],
  );

  // ========== SAVE HANDLER ==========
  const handleSave = useCallback(
    async (content: string) => {
      if (!currentFileRef.current) return;
      await saveFile(currentFileRef.current, content);
      scheduleBuild();
    },
    [saveFile, scheduleBuild],
  );

  // ========== MODAL HANDLERS ==========
  const handleOpenModal = useCallback(
     (next: ModalState) => {
       openModal(next);
       if (next.kind === "rename") {
         // Extract only the filename for rename (not the full path)
         const filename = next.path.split("/").pop() || next.path;
         setModalInput(filename);
       }
       if (next.kind === "move") setModalInput(currentDir || "");
       if (next.kind === "duplicate") setModalInput(next.path + " copy");
     },
     [openModal, setModalInput, currentDir],
   );

    // Menu event listeners
    useEffect(() => {
      // @ts-ignore - Wails runtime
      if (!window.runtime?.EventsOn) return;

      const events = [
        "menu-open-project",
        "menu-new-file",
        "menu-new-folder",
        "menu-go-home",
        "menu-build",
        "menu-toggle-sidebar",
        "menu-toggle-editor",
        "menu-toggle-preview",
        "menu-zoom-in",
        "menu-zoom-out",
        "menu-zoom-reset",
        "menu-toggle-theme",
        "menu-git-commit",
        "menu-git-push",
        "menu-git-pull",
        "menu-git-refresh",
      ];

       // File menu events
       // @ts-ignore
       window.runtime.EventsOn("menu-open-project", () => {
         setShowPicker(true);
       });

       // @ts-ignore
       window.runtime.EventsOn("menu-new-file", () => {
         handleOpenModal({ kind: "create", type: "file" });
       });

       // @ts-ignore
       window.runtime.EventsOn("menu-new-folder", () => {
         handleOpenModal({ kind: "create", type: "dir" });
       });

       // @ts-ignore
       window.runtime.EventsOn("menu-go-home", () => {
         navigate({ to: "/" });
       });

      // Build menu events
      // @ts-ignore
      window.runtime.EventsOn("menu-build", () => {
        triggerBuild();
      });

      // View menu events
      // @ts-ignore
      window.runtime.EventsOn("menu-toggle-sidebar", () => {
        togglePane("sidebar");
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-toggle-editor", () => {
        togglePane("editor");
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-toggle-preview", () => {
        togglePane("preview");
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-zoom-in", () => {
        setZoom((z) => Math.min(z + 0.1, 2));
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-zoom-out", () => {
        setZoom((z) => Math.max(z - 0.1, 0.5));
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-zoom-reset", () => {
        setZoom(1.2);
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-toggle-theme", () => {
        setTheme(theme === "dark" ? "light" : "dark");
      });

      // Git menu events
      // @ts-ignore
      window.runtime.EventsOn("menu-git-commit", () => {
        if (gitStatus.includes("modified") || gitStatus.includes("untracked")) {
          handleOpenModal({ kind: "commit" });
        }
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-git-push", async () => {
        await push();
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-git-pull", async () => {
        await pull();
      });

      // @ts-ignore
      window.runtime.EventsOn("menu-git-refresh", () => {
        refreshGit();
      });

      return () => {
        // @ts-ignore - Wails runtime
        if (window.runtime?.EventsOff) {
          // @ts-ignore
          window.runtime.EventsOff(...events);
        }
      };
    }, [theme, setTheme, togglePane, triggerBuild, navigate, setShowPicker, setZoom, gitStatus, push, pull, refreshGit, handleOpenModal]);

  const confirmModal = useCallback(async () => {
    if (!modal) return;
    try {
      if (modal.kind === "create") {
        if (!modalInput.trim()) return;
        await createFile(joinPath(currentDir, modalInput.trim()), modal.type);
      }
       if (modal.kind === "rename") {
         if (!modalInput.trim()) return;
         // Extract parent directory from original path
         const pathParts = modal.path.split("/");
         const parentPath = pathParts.slice(0, -1).join("/");
         // Construct new path with same parent directory
         const newPath = parentPath ? `${parentPath}/${modalInput.trim()}` : modalInput.trim();
         await renameFile(modal.path, newPath);
       }
      if (modal.kind === "move") {
        if (!modalInput.trim()) return;
        await moveFile(modal.path, modalInput.trim());
      }
      if (modal.kind === "duplicate") {
        if (!modalInput.trim()) return;
        await duplicateFile(modal.path, modalInput.trim());
      }
      if (modal.kind === "delete") {
        await deleteFile(modal.path, modal.isDir || false);
      }
    } catch (err: any) {
      alert(err.message || "Operation failed");
    }
    closeModal();
  }, [
    modal,
    modalInput,
    currentDir,
    createFile,
    renameFile,
    moveFile,
    duplicateFile,
    deleteFile,
    closeModal,
  ]);

  // ========== RESIZE HANDLERS ==========
   const handleResizeStart = useCallback(
     (which: "sidebar-editor" | "editor-preview", e: React.MouseEvent) => {
       e.preventDefault();
       resizingRef.current = which;
       setIsResizing(which);
       startPosRef.current = e.clientX;
       startDimsRef.current = { sidebar: sidebarWidth, editor: editorWidth };

       const handleResizeMove = (moveEvent: MouseEvent) => {
         if (!resizingRef.current || !mainRef.current) return;
         const delta = moveEvent.clientX - startPosRef.current;
         const mainRect = mainRef.current.getBoundingClientRect();
         const mainWidth = mainRect.width;

         if (resizingRef.current === "sidebar-editor") {
           // Sidebar resize: min 200px, max 60% of main width
           const newSidebar = Math.max(
             200,
             Math.min(mainWidth * 0.6, startDimsRef.current.sidebar + delta),
           );
           setSidebarWidth(newSidebar);
         } else if (resizingRef.current === "editor-preview") {
           // Editor resize: min 300px, max leaves 200px for preview
           const maxEditor = mainWidth - startDimsRef.current.sidebar - 200;
           const newEditor = Math.max(
             300,
             Math.min(maxEditor, startDimsRef.current.editor + delta),
           );
           setEditorWidth(newEditor);
         }
       };

       const handleResizeEnd = () => {
         resizingRef.current = null;
         setIsResizing(null);
         document.removeEventListener("mousemove", handleResizeMove);
         document.removeEventListener("mouseup", handleResizeEnd);
       };

       document.addEventListener("mousemove", handleResizeMove);
       document.addEventListener("mouseup", handleResizeEnd);
     },
[sidebarWidth, editorWidth, setSidebarWidth, setEditorWidth],
  );

  // ========== SYNCTEX HANDLERS ==========
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const [pdfHighlight, setPdfHighlight] = useState<{ page: number; x: number; y: number } | null>(null);

  const scrollToPage = useCallback((page: number) => {
    const ref = pageRefs.current.get(page);
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
      setPageInput(String(page));
    }
  }, []);

  const handleForwardSearch = useCallback(async (line: number, col: number = 0) => {
    const file = currentFileRef.current;
    if (!file) return;

    try {
      const result = await fromCursor(file, line, col);
      if (result && result.page) {
        scrollToPage(result.page);
        setPdfHighlight({ page: result.page, x: result.x, y: result.y });
        setTimeout(() => setPdfHighlight(null), 2000);
      }
    } catch (err) {
      console.warn("Forward search failed:", err);
    }
  }, [fromCursor, scrollToPage]);

  const handleInverseSearch = useCallback(async (page: number, x: number, y: number) => {
    try {
      const result = await fromClick(page, x, y);
      if (result && result.file && result.line) {
        if (result.file !== currentFileRef.current) {
          await openFile(result.file);
        }
        if (revealLineRef.current) {
          revealLineRef.current(result.line, result.col || 1);
        }
        setHighlightedLine(result.line);
        setTimeout(() => setHighlightedLine(null), 2000);
      }
    } catch (err) {
      console.warn("Inverse search failed:", err);
    }
  }, [fromClick, openFile]);

  const handleEditorReady = useCallback((revealLine: (line: number, col?: number) => void) => {
    revealLineRef.current = revealLine;
  }, []);

  const registerPageRef = useCallback(
    (page: number, el: HTMLDivElement | null) => {
      if (!el) return;
      pageRefs.current.set(page, el);
    },
    [],
  );

  // ========== COMPUTED ==========
  const visiblePanes = useMemo(
    () => ({ sidebar, editor, preview }),
    [sidebar, editor, preview],
  );
  const allPanesHidden = useMemo(
    () => !sidebar && !editor && !preview,
    [sidebar, editor, preview],
  );

  return (
    <>
      <FramelessWindow 
        title="Treefrog" 
        subtitle={projectRoot ? <span className="font-mono text-xs">{projectRoot}</span> : undefined}
      >
      <div className="flex-1 flex flex-col bg-background overflow-hidden relative" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
        {/* Background gradient accent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -mb-48"></div>
        </div>

{/* Toolbar */}
          <Toolbar
           onBuild={triggerBuild}
           engine={engine}
           onEngineChange={setEngine}
           shell={shellEscape}
           onShellChange={setShellEscape}
           onTogglePane={togglePane}
           panesVisible={visiblePanes}
           configSynced={configSynced}
         />

        {/* Main Content */}
        <div className="flex-1 flex flex-row overflow-hidden relative z-10" ref={mainRef} style={_isResizing ? { userSelect: "none" } as React.CSSProperties : {}}>
          {allPanesHidden ? (
           <EmptyPlaceholder />
         ) : (
           <>
             {/* Sidebar */}
             {sidebar && (
               <>
                 <motion.div 
                   className="border-r backdrop-blur-sm bg-card/50 overflow-hidden"
                   style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ duration: 0.3 }}
                 >
                    <Sidebar
                      projectRoot={projectRoot}
                      entries={entries}
                      currentDir={currentDir}
                      currentFile={currentFile}
                      onNavigate={loadEntries}
                      onOpenFile={openFile}
                      onCreateFile={() =>
                        handleOpenModal({ kind: "create", type: "file" })
                      }
                       onCreateFolder={() =>
                         handleOpenModal({ kind: "create", type: "dir" })
                       }
                       onFileMenu={(x, y, path, isDir) =>
                         setContextMenu({ x, y, path, isDir })
                        }
                         onEmptySpaceMenu={(x, y) => {
                           const projectName = projectRoot.split("/").pop() || projectRoot;
                           setContextMenu({ x, y, path: projectName, isDir: true, isRoot: true });
                         }}
                         onDelete={(path, isDir) =>
                           handleOpenModal({ kind: "delete", path, isDir })
                         }
                         onRename={(path) =>
                           handleOpenModal({ kind: "rename", path })
                         }
                         gitStatus={gitStatus}
                         gitError={gitError}
                         onCommit={commit}
                         onPush={push}
                         onPull={pull}
                       />
                 </motion.div>
                 {(editor || preview) && (
                   <div
                     className="w-0.5 bg-gradient-to-b from-transparent via-border to-transparent hover:bg-primary/50 cursor-col-resize transition-all duration-200 hover:w-1"
                     onMouseDown={(e) => handleResizeStart("sidebar-editor", e)}
                   />
                 )}
               </>
             )}

              {/* Editor */}
              {editor && (
                <>
                  <motion.div
                    className="min-w-0"
                    style={{
                      width: preview && editorWidth > 0 ? `${editorWidth}px` : undefined,
                      flex: preview && editorWidth > 0 ? "none" : 1,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                   >
<EditorPane
                        theme={resolveTheme(theme)}
                        fileContent={fileContent}
                        isBinary={isBinary}
                        currentFile={currentFile}
                        projectRoot={projectRoot}
                        onSave={handleSave}
                        onForwardSearch={handleForwardSearch}
                        onEditorReady={handleEditorReady}
                        highlightedLine={highlightedLine}
                      />
                  </motion.div>
                  {preview && (
                    <div
                      className="w-0.5 bg-gradient-to-b from-transparent via-border to-transparent hover:bg-primary/50 cursor-col-resize transition-all duration-200 hover:w-1"
                      onMouseDown={(e) => handleResizeStart("editor-preview", e)}
                      style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}
                    />
                  )}
                </>
              )}

             {/* Preview */}
             {preview && (
               <motion.div 
                 className="flex-1 min-w-0"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.3 }}
               >
<PreviewPane
                    apiUrl={apiUrl}
                    buildStatus={buildStatus}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    numPages={numPages}
                    onNumPagesChange={setNumPages}
                    currentPage={typeof pageInput === 'number' ? pageInput : parseInt(pageInput) || 1}
                    onPageChange={(page) => {
                      setPageInput(String(page));
                      scrollToPage(page);
                    }}
                    projectRoot={projectRoot}
                    pdfKey={pdfKey}
                    pageProxyRef={pageProxyRef}
                    registerPageRef={registerPageRef}
                    onInverseSearch={handleInverseSearch}
                    highlightPosition={pdfHighlight}
                    onPageNavigate={scrollToPage}
                  />
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Context Menu */}
       <ContextMenu
         visible={!!contextMenu}
         x={contextMenu?.x || 0}
         y={contextMenu?.y || 0}
         path={contextMenu?.path || ""}
         isDir={contextMenu?.isDir || false}
         isRoot={contextMenu?.isRoot || false}
         onClose={() => setContextMenu(null)}
        onRename={() => {
          if (contextMenu)
            handleOpenModal({ kind: "rename", path: contextMenu.path });
          setContextMenu(null);
        }}
        onDuplicate={() => {
          if (contextMenu)
            handleOpenModal({ kind: "duplicate", path: contextMenu.path });
          setContextMenu(null);
        }}
        onMove={() => {
          if (contextMenu)
            handleOpenModal({ kind: "move", path: contextMenu.path });
          setContextMenu(null);
        }}
        onDelete={() => {
          if (contextMenu)
            handleOpenModal({
              kind: "delete",
              path: contextMenu.path,
              isDir: contextMenu.isDir,
            });
          setContextMenu(null);
        }}
         onCreateFile={() => {
           // Only change currentDir if it's not the root context
           if (contextMenu && !contextMenu.isRoot) setCurrentDir(contextMenu.path);
           handleOpenModal({ kind: "create", type: "file" });
           setContextMenu(null);
         }}
         onCreateFolder={() => {
           // Only change currentDir if it's not the root context
           if (contextMenu && !contextMenu.isRoot) setCurrentDir(contextMenu.path);
           handleOpenModal({ kind: "create", type: "dir" });
           setContextMenu(null);
         }}
      />

      {/* Project Picker Modal */}
      <ProjectPicker
        visible={showPicker}
        confirm={handleSelectProject}
        close={() => setShowPicker(false)}
      />

        </div>
      </FramelessWindow>

      {/* File Operations Modal - rendered outside FramelessWindow to escape overflow-hidden */}
      {modal && (
        <Dialog open={!!modal} onOpenChange={() => closeModal()}>
          <DialogHeader>
            <DialogTitle>{modalTitle(modal)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {modalHint(modal)}
            </p>

            {modal.kind !== "delete" && (
              <Input
                type="text"
                placeholder={modalPlaceholder(modal, currentDir)}
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmModal();
                  if (e.key === "Escape") closeModal();
                }}
              />
            )}

            {modal.kind === "delete" && modal.isDir && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-amber-600 text-sm">
                This will delete the folder and all its contents.
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={closeModal}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmModal}
                variant={modal.kind === "delete" ? "destructive" : "default"}
              >
                Confirm
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
