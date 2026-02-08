import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as monaco from "monaco-editor";
import { pdfjs } from "react-pdf";

// Components
import Toolbar from "./components/Toolbar";
import Sidebar from "./components/Sidebar";
import { EditorPane } from "./components/EditorPane";
import PreviewPane from "./components/PreviewPane";
import ProjectPicker from "./components/ProjectPicker";
import ContextMenu from "./components/ContextMenu";
import FileMenu from "./components/FileMenu";
import EmptyPlaceholder from "./components/EmptyPlaceholder";

// Types
import { BuildStatus, ModalState } from "./types";

// Stores
import { useAppStore } from "./stores/appStore";
import { useFileStore } from "./stores/fileStore";
import { usePaneStore, useDimensionStore } from "./stores/layoutStore";
import { useModalStore } from "./stores/modalStore";

// Hooks
import { useProject } from "./hooks/useProject";
import { useFiles } from "./hooks/useFiles";
import { useBuild } from "./hooks/useBuild";
import { useGit } from "./hooks/useGit";
import { useWebSocket } from "./hooks/useWebSocket";


// Services
import { syncConfig } from "./services/configService";

// Utils
import { joinPath } from "./utils/path";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function baseName(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function clampZoom(z: number) {
  return Math.min(2.4, Math.max(0.6, Math.round(z * 10) / 10));
}

function clampPage(p: number, max: number) {
  if (!p || Number.isNaN(p)) return 1;
  return Math.min(Math.max(1, p), Math.max(1, max));
}

function modalTitle(modal: ModalState) {
  switch (modal.kind) {
    case "create":
      return modal.type === "file" ? "Create file" : "Create folder";
    case "rename":
      return "Rename";
    case "move":
      return "Move";
    case "duplicate":
      return "Duplicate";
    case "delete":
      return "Delete";
  }
}

function modalPlaceholder(modal: ModalState, currentDir: string) {
  switch (modal.kind) {
    case "create":
      return joinPath(currentDir, modal.type === "file" ? "new.tex" : "new-folder");
    case "rename":
      return modal.path;
    case "move":
      return currentDir || "";
    case "duplicate":
      return modal.path + " copy";
    default:
      return "";
  }
}

function modalHint(modal: ModalState) {
  switch (modal.kind) {
    case "create":
      return "Enter a relative path.";
    case "rename":
      return "Enter the new relative path.";
    case "move":
      return "Enter the destination directory path.";
    case "duplicate":
      return "Enter the new relative path.";
    case "delete":
      return modal.isDir ? "Delete folder recursively?" : "Delete this file?";
  }
}

export default function App() {
  // ========== STORES ==========
  const { theme, setTheme, apiUrl, builderUrl, builderToken } = useAppStore();
  const { entries, currentDir, currentFile, isBinary, fileContent, setCurrentDir } = useFileStore();
  const { sidebar, editor, preview, toggle: togglePane } = usePaneStore();
  const { sidebarWidth, editorWidth, setSidebarWidth, setEditorWidth } = useDimensionStore();
  const { modal, modalInput, openModal, closeModal, setModalInput } = useModalStore();

  // ========== HOOKS ==========
  const { root: projectRoot, showPicker, setShowPicker, select: selectProject, loading: projectLoading } = useProject();
  const { loadEntries, openFile, saveFile, createFile, renameFile, moveFile, duplicateFile, deleteFile, refresh: refreshFiles, clear: clearFiles } = useFiles();
  const { status: buildStatus, build } = useBuild();
  const { status: gitStatus, isError: gitError, refresh: refreshGit, commit, push, pull } = useGit();


  // ========== LOCAL STATE (UI-specific) ==========
  const [engine, setEngine] = useState<string>("pdflatex");
  const [shellEscape, setShellEscape] = useState<boolean>(true);
  const [pdfKey, setPdfKey] = useState<number>(Date.now());
  const [zoom, setZoom] = useState<number>(1.2);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageInput, setPageInput] = useState<string>("1");
  const [configSynced, setConfigSynced] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);
  const [fileMenu, setFileMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState<"sidebar-editor" | "editor-preview" | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef<number>(0);
  const startDimsRef = useRef<{ sidebar: number; editor: number }>({ sidebar: 0, editor: 0 });
  const resizingRef = useRef<"sidebar-editor" | "editor-preview" | null>(null);

  // ========== REFS ==========
  const currentFileRef = useRef<string>("");
  const pageProxyRef = useRef<Map<number, pdfjs.PDFPageProxy>>(new Map());
  const buildTimer = useRef<number | null>(null);
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Keep currentFileRef in sync
  useEffect(() => {
    currentFileRef.current = currentFile;
  }, [currentFile]);

  // ========== WEBSOCKET ==========
  const handleBuildMessage = useCallback((data: BuildStatus) => {
    if (data.state === "success") {
      setPdfKey(Date.now());
      refreshGit();
    }
  }, [refreshGit]);

  useWebSocket(handleBuildMessage);

  // ========== EFFECTS ==========

  // Apply theme
  useEffect(() => {
    const themeName = theme === "dark" ? "rusty-dark" : "rusty-light";
    document.documentElement.setAttribute("data-theme", themeName);
  }, [theme]);

  // Sync config to server
  useEffect(() => {
    const doSync = async () => {
      try {
        await syncConfig(builderUrl, builderToken);
        setConfigSynced(true);
        window.setTimeout(() => setConfigSynced(false), 2000);
      } catch (err) {
        console.warn("Could not send config to server:", err);
      }
    };
    doSync();
  }, [builderUrl, builderToken]);

  // Load files when project is set
  useEffect(() => {
    if (projectRoot && !projectLoading) {
      loadEntries("");
      refreshGit();
    }
  }, [projectRoot, projectLoading]);

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
    }, 700);
  }, [build, engine, shellEscape]);

  const triggerBuild = useCallback(async () => {
    const mainFile = currentFileRef.current || "main.tex";
    await build(mainFile, engine, shellEscape);
  }, [build, engine, shellEscape]);

  // ========== PROJECT SELECTION ==========
  const handleSelectProject = useCallback(async (path: string) => {
    await selectProject(path);
    clearFiles();
    await loadEntries("");
    await refreshGit();
  }, [selectProject, clearFiles, loadEntries, refreshGit]);

  // ========== SAVE HANDLER ==========
  const handleSave = useCallback(async (content: string) => {
    if (!currentFileRef.current) return;
    await saveFile(currentFileRef.current, content);
    scheduleBuild();
  }, [saveFile, scheduleBuild]);

  // ========== MODAL HANDLERS ==========
  const handleOpenModal = useCallback((next: ModalState) => {
    openModal(next);
    if (next.kind === "rename") setModalInput(next.path);
    if (next.kind === "move") setModalInput(currentDir || "");
    if (next.kind === "duplicate") setModalInput(next.path + " copy");
  }, [openModal, setModalInput, currentDir]);

  const confirmModal = useCallback(async () => {
    if (!modal) return;
    try {
      if (modal.kind === "create") {
        if (!modalInput.trim()) return;
        await createFile(joinPath(currentDir, modalInput.trim()), modal.type);
      }
      if (modal.kind === "rename") {
        if (!modalInput.trim()) return;
        await renameFile(modal.path, modalInput.trim());
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
  }, [modal, modalInput, currentDir, createFile, renameFile, moveFile, duplicateFile, deleteFile, closeModal]);

  // ========== RESIZE HANDLERS ==========
  const handleResizeStart = useCallback((which: "sidebar-editor" | "editor-preview", e: React.MouseEvent) => {
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
        const newSidebar = Math.max(200, Math.min(400, startDimsRef.current.sidebar + delta));
        setSidebarWidth(newSidebar);
      } else if (resizingRef.current === "editor-preview") {
        const newEditor = Math.max(200, Math.min(mainWidth - startDimsRef.current.sidebar - 200, startDimsRef.current.editor + delta));
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
  }, [sidebarWidth, editorWidth, setSidebarWidth, setEditorWidth]);

  // ========== PDF HELPERS ==========
  const registerPageRef = useCallback((page: number, el: HTMLDivElement | null) => {
    if (!el) return;
    pageRefs.current.set(page, el);
  }, []);

  const scrollToPage = useCallback((page: number) => {
    const ref = pageRefs.current.get(page);
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
      setPageInput(String(page));
    }
  }, []);

  // ========== COMPUTED ==========
  const visiblePanes = useMemo(() => ({ sidebar, editor, preview }), [sidebar, editor, preview]);
  const allPanesHidden = useMemo(() => !sidebar && !editor && !preview, [sidebar, editor, preview]);

  return (
    <div className="h-screen w-screen flex flex-col bg-base-100">
      {/* Toolbar */}
      <Toolbar
        projectRoot={projectRoot}
        onOpenProject={() => setShowPicker(true)}
        onBuild={triggerBuild}
        engine={engine}
        onEngineChange={setEngine}
        shell={shellEscape}
        onShellChange={setShellEscape}
        theme={theme}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        onTogglePane={togglePane}
        panesVisible={visiblePanes}
        configSynced={configSynced}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-row overflow-hidden" ref={mainRef}>
        {allPanesHidden ? (
          <EmptyPlaceholder />
        ) : (
          <>
            {/* Sidebar */}
            {sidebar && (
              <>
                <div style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}>
                  <Sidebar
                    projectRoot={projectRoot}
                    entries={entries}
                    currentDir={currentDir}
                    currentFile={currentFile}
                    onNavigate={loadEntries}
                    onOpenFile={openFile}
                    onCreateFile={() => handleOpenModal({ kind: "create", type: "file" })}
                    onCreateFolder={() => handleOpenModal({ kind: "create", type: "dir" })}
                    onFileMenu={(x, y, path, isDir) => setFileMenu({ x, y, path, isDir })}
                    gitStatus={gitStatus}
                    gitError={gitError}
                    onCommit={commit}
                    onPush={push}
                    onPull={pull}
                  />
                </div>
                {(editor || preview) && (
                  <div
                    className="w-1 bg-base-300 hover:bg-primary cursor-col-resize transition-colors"
                    onMouseDown={(e) => handleResizeStart("sidebar-editor", e)}
                  />
                )}
              </>
            )}

            {/* Editor */}
            {editor && (
              <>
                <div
                  className="flex-1 min-w-0"
                  style={{ width: editorWidth > 0 ? `${editorWidth}px` : undefined, flex: editorWidth > 0 ? "none" : 1 }}
                >
                  <EditorPane
                    theme={theme}
                    fileContent={fileContent}
                    isBinary={isBinary}
                    onSave={handleSave}
                  />
                </div>
                {preview && (
                  <div
                    className="w-1 bg-base-300 hover:bg-primary cursor-col-resize transition-colors"
                    onMouseDown={(e) => handleResizeStart("editor-preview", e)}
                  />
                )}
              </>
            )}

            {/* Preview */}
            {preview && (
              <div className="flex-1 min-w-0">
                <PreviewPane
                  apiUrl={apiUrl}
                  buildStatus={buildStatus}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  numPages={numPages}
                  onNumPagesChange={setNumPages}
                  currentPage={Number(pageInput) || 1}
                  onPageChange={(page) => {
                    setPageInput(String(page));
                    scrollToPage(page);
                  }}
                  projectRoot={projectRoot}
                  pdfKey={pdfKey}
                  pageProxyRef={pageProxyRef}
                  registerPageRef={registerPageRef}
                />
              </div>
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
        onClose={() => setContextMenu(null)}
        onRename={() => {
          if (contextMenu) handleOpenModal({ kind: "rename", path: contextMenu.path });
          setContextMenu(null);
        }}
        onDuplicate={() => {
          if (contextMenu) handleOpenModal({ kind: "duplicate", path: contextMenu.path });
          setContextMenu(null);
        }}
        onMove={() => {
          if (contextMenu) handleOpenModal({ kind: "move", path: contextMenu.path });
          setContextMenu(null);
        }}
        onDelete={() => {
          if (contextMenu) handleOpenModal({ kind: "delete", path: contextMenu.path, isDir: contextMenu.isDir });
          setContextMenu(null);
        }}
        onCreateFile={() => {
          if (contextMenu) setCurrentDir(contextMenu.path);
          handleOpenModal({ kind: "create", type: "file" });
          setContextMenu(null);
        }}
        onCreateFolder={() => {
          if (contextMenu) setCurrentDir(contextMenu.path);
          handleOpenModal({ kind: "create", type: "dir" });
          setContextMenu(null);
        }}
      />

      {/* File Menu */}
      <FileMenu
        visible={!!fileMenu}
        x={fileMenu?.x || 0}
        y={fileMenu?.y || 0}
        path={fileMenu?.path || ""}
        isDir={fileMenu?.isDir || false}
        onClose={() => setFileMenu(null)}
        onRename={() => {
          if (fileMenu) handleOpenModal({ kind: "rename", path: fileMenu.path });
          setFileMenu(null);
        }}
        onDuplicate={() => {
          if (fileMenu) handleOpenModal({ kind: "duplicate", path: fileMenu.path });
          setFileMenu(null);
        }}
        onMove={() => {
          if (fileMenu) handleOpenModal({ kind: "move", path: fileMenu.path });
          setFileMenu(null);
        }}
        onDelete={() => {
          if (fileMenu) handleOpenModal({ kind: "delete", path: fileMenu.path, isDir: fileMenu.isDir });
          setFileMenu(null);
        }}
        onCreateFile={() => {
          if (fileMenu) setCurrentDir(fileMenu.path);
          handleOpenModal({ kind: "create", type: "file" });
          setFileMenu(null);
        }}
        onCreateFolder={() => {
          if (fileMenu) setCurrentDir(fileMenu.path);
          handleOpenModal({ kind: "create", type: "dir" });
          setFileMenu(null);
        }}
      />

      {/* Project Picker Modal */}
      <ProjectPicker
        visible={showPicker}
        confirm={handleSelectProject}
        close={() => setShowPicker(false)}
      />

      {/* File Operations Modal */}
      {modal && (
        <dialog className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">{modalTitle(modal)}</h3>
            <p className="text-sm text-base-content/70 mb-4">{modalHint(modal)}</p>

            {modal.kind !== "delete" && (
              <input
                type="text"
                placeholder={modalPlaceholder(modal, currentDir)}
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                className="input input-bordered w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmModal();
                  if (e.key === "Escape") closeModal();
                }}
              />
            )}

            {modal.kind === "delete" && modal.isDir && (
              <div className="alert alert-warning">
                <span>This will delete the folder and all its contents.</span>
              </div>
            )}

            <div className="modal-action">
              <button onClick={confirmModal} className={`btn ${modal.kind === "delete" ? "btn-error" : "btn-primary"}`}>
                Confirm
              </button>
              <button onClick={closeModal} className="btn">
                Cancel
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={closeModal}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
