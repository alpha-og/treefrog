import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { FileEntry, BuildStatus, SyncView, SyncEdit, ModalState } from "./types";

// Constants
import { API_DEFAULT, ZOOM_LEVELS } from "./constants";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function getThemeName(themeMode: "light" | "dark"): string {
  return themeMode === "dark" ? "dracula" : "latte";
}

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
  // File state
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentDir, setCurrentDir] = useState<string>("");
  const [currentFile, setCurrentFile] = useState<string>("");
  const [isBinary, setIsBinary] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>("");

  // Build state
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [pdfKey, setPdfKey] = useState<number>(Date.now());
  const [engine, setEngine] = useState<string>("pdflatex");
  const [shellEscape, setShellEscape] = useState<boolean>(true);

  // Git state
  const [gitStatus, setGitStatus] = useState<string>("");
  const [gitError, setGitError] = useState<boolean>(false);

  // Sync state
  const [syncTarget, setSyncTarget] = useState<SyncView | null>(null);

  // Project state
  const [projectRoot, setProjectRoot] = useState<string>("");
  const [showProjectPicker, setShowProjectPicker] = useState<boolean>(false);

  // Modal state
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalInput, setModalInput] = useState<string>("");

  // Settings state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("treefrog-theme");
    const prefersDark = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return (saved as "light" | "dark") || (prefersDark ? "dark" : "light");
  });

  const [apiUrl, setApiUrl] = useState<string>(() => {
    return localStorage.getItem("treefrog-api-url") || API_DEFAULT;
  });

  const [builderToken, setBuilderToken] = useState<string>(() => {
    return localStorage.getItem("treefrog-builder-token") || "";
  });

  const [builderUrl, setBuilderUrl] = useState<string>(() => {
    return localStorage.getItem("treefrog-builder-url") || "https://treefrog-renderer.onrender.com";
  });

  const [configSynced, setConfigSynced] = useState<boolean>(false);

  // PDF state
  const [zoom, setZoom] = useState<number>(1.2);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageInput, setPageInput] = useState<string>("1");

  // Layout state
  const [visiblePanes, setVisiblePanes] = useState<{ sidebar: boolean; editor: boolean; preview: boolean }>(() => {
    const saved = localStorage.getItem("treefrog-panes");
    return saved ? JSON.parse(saved) : { sidebar: true, editor: true, preview: true };
  });

  const [paneDimensions, setPaneDimensions] = useState<{ sidebar: number; editor: number }>(() => {
    const saved = localStorage.getItem("treefrog-pane-dims");
    return saved ? JSON.parse(saved) : { sidebar: 280, editor: 0 };
  });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);
  const [fileMenu, setFileMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);

  // Resize state
  const [isResizing, setIsResizing] = useState<"sidebar-editor" | "editor-preview" | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef<number>(0);
  const startDimsRef = useRef<{ sidebar: number; editor: number }>({ sidebar: 0, editor: 0 });
  const resizingRef = useRef<"sidebar-editor" | "editor-preview" | null>(null);

  // Refs
  const buildPollRef = useRef<number | null>(null);
  const currentFileRef = useRef<string>("");
  const pageProxyRef = useRef<Map<number, pdfjs.PDFPageProxy>>(new Map());
  const saveTimer = useRef<number | null>(null);
  const buildTimer = useRef<number | null>(null);
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Effects
  useEffect(() => {
    loadProject();
    connectWS();
  }, []);

  useEffect(() => {
    const sendConfigToServer = async () => {
      try {
        await fetch(`${apiUrl}/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ builderUrl, builderToken }),
        });
        setConfigSynced(true);
        window.setTimeout(() => setConfigSynced(false), 2000);
      } catch (err) {
        console.warn("Could not send config to server:", err);
      }
    };
    sendConfigToServer();
  }, [apiUrl, builderUrl, builderToken]);

  useEffect(() => {
    document.documentElement.dataset.theme = getThemeName(theme);
    localStorage.setItem("treefrog-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("treefrog-api-url", apiUrl);
  }, [apiUrl]);

  useEffect(() => {
    localStorage.setItem("treefrog-builder-token", builderToken);
  }, [builderToken]);

  useEffect(() => {
    localStorage.setItem("treefrog-builder-url", builderUrl);
  }, [builderUrl]);

  useEffect(() => {
    localStorage.setItem("treefrog-panes", JSON.stringify(visiblePanes));
  }, [visiblePanes]);

  useEffect(() => {
    if (numPages > 0) {
      const next = String(clampPage(Number(pageInput || "1"), numPages));
      if (next !== pageInput) {
        setPageInput(next);
      }
    }
  }, [numPages]);

  // API functions
  async function loadProject() {
    try {
      const res = await fetch(`${apiUrl}/project`);
      if (!res.ok) {
        console.error(`Failed to load project: ${res.status} ${res.statusText}`);
        setShowProjectPicker(true);
        return;
      }
      const data = await res.json();
      setProjectRoot(data.root || "");
      if (!data.root) {
        setShowProjectPicker(true);
        return;
      }
      setShowProjectPicker(false);
      await loadEntries("");
      await refreshGit();
    } catch (err) {
      console.error("Error loading project:", err);
      setShowProjectPicker(true);
    }
  }

  async function setProjectRootFromUI(path: string) {
    if (!path.trim()) {
      throw new Error("Please enter a project path");
    }
    const res = await fetch(`${apiUrl}/project/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: path.trim() }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg);
    }
    const data = await res.json();
    setProjectRoot(data.root || "");
    setShowProjectPicker(false);
    setCurrentDir("");
    setCurrentFile("");
    currentFileRef.current = "";
    setFileContent("");
    await loadEntries("");
    await refreshGit();
  }

  async function loadEntries(dir: string) {
    const path = dir === "" ? "." : dir;
    const res = await fetch(`${apiUrl}/files?path=${encodeURIComponent(path)}`);
    if (!res.ok) return;
    const data = await res.json();
    setEntries(data);
    setCurrentDir(dir);
  }

  async function openFile(path: string) {
    setCurrentFile(path);
    currentFileRef.current = path;
    const res = await fetch(`${apiUrl}/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) return;
    const data = await res.json();
    setIsBinary(data.isBinary);
    if (!data.isBinary) {
      setFileContent(data.content || "");
    } else {
      setFileContent("");
    }
  }

  function scheduleSave(newContent: string) {
    if (!currentFileRef.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await saveFile(currentFileRef.current, newContent);
      scheduleBuild();
    }, 600);
  }

  async function saveFile(path: string, content: string) {
    await fetch(`${apiUrl}/file?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, isBinary: false }),
    });
  }

  function scheduleBuild() {
    if (buildTimer.current) window.clearTimeout(buildTimer.current);
    buildTimer.current = window.setTimeout(async () => {
      await triggerBuild();
    }, 700);
  }

  async function triggerBuild() {
    const mainFile = currentFileRef.current || "main.tex";
    await fetch(`${apiUrl}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainFile, engine, shellEscape }),
    });
    startBuildPolling();
  }

  function startBuildPolling() {
    if (buildPollRef.current) window.clearInterval(buildPollRef.current);
    buildPollRef.current = window.setInterval(async () => {
      const res = await fetch(`${apiUrl}/build/status`);
      if (!res.ok) return;
      const data = (await res.json()) as BuildStatus;
      setBuildStatus(data);
      if (data.state === "success") {
        setPdfKey(Date.now());
        refreshGit();
        if (buildPollRef.current) window.clearInterval(buildPollRef.current);
      }
      if (data.state === "error") {
        if (buildPollRef.current) window.clearInterval(buildPollRef.current);
      }
    }, 1000);
  }

  function connectWS() {
    const wsProto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${wsProto}://${location.host}/ws/build`);
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data) as BuildStatus;
        setBuildStatus(data);
        if (data.state === "success") {
          setPdfKey(Date.now());
          refreshGit();
        }
      } catch {
        // ignore
      }
    };
  }

  async function refreshGit() {
    const res = await fetch(`${apiUrl}/git/status`);
    if (!res.ok) {
      const msg = await res.text();
      setGitStatus(msg || "git error");
      setGitError(true);
      return;
    }
    const data = await res.json();
    setGitStatus(data.raw || "");
    setGitError(false);
  }

  async function commitAll(msg: string) {
    if (!msg.trim()) return;
    await fetch(`${apiUrl}/git/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg, all: true }),
    });
    refreshGit();
  }

  async function push() {
    await fetch(`${apiUrl}/git/push`, { method: "POST", headers: { "Content-Type": "application/json" } });
    refreshGit();
  }

  async function pull() {
    await fetch(`${apiUrl}/git/pull`, { method: "POST", headers: { "Content-Type": "application/json" } });
    refreshGit();
  }

  async function runFS(endpoint: string, body: any) {
    const res = await fetch(`${apiUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const msg = await res.text();
      alert(msg);
      return false;
    }
    await loadEntries(currentDir);
    return true;
  }

  // UI handlers
  function openModal(next: ModalState) {
    setModal(next);
    setModalInput("");
    if (next.kind === "rename") setModalInput(next.path);
    if (next.kind === "move") setModalInput(currentDir || "");
    if (next.kind === "duplicate") setModalInput(next.path + " copy");
  }

  function togglePane(pane: "sidebar" | "editor" | "preview") {
    setVisiblePanes((prev) => {
      const newPanes = { ...prev, [pane]: !prev[pane] };
      const visibleCount = Object.values(newPanes).filter(Boolean).length;
      if (visibleCount === 0) {
        return { ...newPanes, sidebar: true };
      }
      return newPanes;
    });
  }

  function handleResizeStart(which: "sidebar-editor" | "editor-preview", e: React.MouseEvent) {
    e.preventDefault();
    resizingRef.current = which;
    setIsResizing(which);
    startPosRef.current = e.clientX;
    startDimsRef.current = { ...paneDimensions };

    const handleResizeMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current || !mainRef.current) return;
      const delta = moveEvent.clientX - startPosRef.current;
      const mainRect = mainRef.current.getBoundingClientRect();
      const mainWidth = mainRect.width;

      if (resizingRef.current === "sidebar-editor") {
        const newSidebar = Math.max(200, Math.min(400, startDimsRef.current.sidebar + delta));
        setPaneDimensions((prev) => ({ ...prev, sidebar: newSidebar }));
      } else if (resizingRef.current === "editor-preview") {
        const newEditor = Math.max(200, Math.min(mainWidth - startDimsRef.current.sidebar - 200, startDimsRef.current.editor + delta));
        setPaneDimensions((prev) => ({ ...prev, editor: newEditor }));
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
  }

  function registerPageRef(page: number, el: HTMLDivElement | null) {
    if (!el) return;
    pageRefs.current.set(page, el);
  }

  function scrollToPage(page: number) {
    const ref = pageRefs.current.get(page);
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "start" });
      setPageInput(String(page));
    }
  }

  async function confirmModal() {
    if (!modal) return;
    if (modal.kind === "create") {
      if (!modalInput.trim()) return;
      await runFS("/fs/create", { path: joinPath(currentDir, modalInput.trim()), type: modal.type });
    }
    if (modal.kind === "rename") {
      if (!modalInput.trim()) return;
      const ok = await runFS("/fs/rename", { from: modal.path, to: modalInput.trim() });
      if (ok && currentFile === modal.path) {
        setCurrentFile(modalInput.trim());
        openFile(modalInput.trim());
      }
    }
    if (modal.kind === "move") {
      if (!modalInput.trim()) return;
      const ok = await runFS("/fs/move", { from: modal.path, toDir: modalInput.trim() });
      if (ok && currentFile === modal.path) {
        const newPath = joinPath(modalInput.trim(), baseName(modal.path));
        setCurrentFile(newPath);
        openFile(newPath);
      }
    }
    if (modal.kind === "duplicate") {
      if (!modalInput.trim()) return;
      await runFS("/fs/duplicate", { from: modal.path, to: modalInput.trim() });
    }
    if (modal.kind === "delete") {
      const ok = await runFS("/fs/delete", { path: modal.path, recursive: modal.isDir });
      if (ok && currentFile === modal.path) {
        setCurrentFile("");
        setFileContent("");
      }
    }
    setModal(null);
  }

  const allPanesHidden = useMemo(() => {
    return !visiblePanes.sidebar && !visiblePanes.editor && !visiblePanes.preview;
  }, [visiblePanes]);

  return (
    <div className="h-screen w-screen flex flex-col bg-base-100" data-theme={getThemeName(theme)}>
      {/* Toolbar */}
      <Toolbar
        projectRoot={projectRoot}
        onOpenProject={() => setShowProjectPicker(true)}
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
            {visiblePanes.sidebar && (
              <>
                <div style={{ width: `${paneDimensions.sidebar}px`, flexShrink: 0 }}>
                  <Sidebar
                    projectRoot={projectRoot}
                    entries={entries}
                    currentDir={currentDir}
                    currentFile={currentFile}
                    onNavigate={loadEntries}
                    onOpenFile={openFile}
                    onCreateFile={() => openModal({ kind: "create", type: "file" })}
                    onCreateFolder={() => openModal({ kind: "create", type: "dir" })}
                    onFileMenu={(x, y, path, isDir) => setFileMenu({ x, y, path, isDir })}
                    gitStatus={gitStatus}
                    gitError={gitError}
                    onCommit={commitAll}
                    onPush={push}
                    onPull={pull}
                  />
                </div>
                {(visiblePanes.editor || visiblePanes.preview) && (
                  <div
                    className="w-1 bg-base-300 hover:bg-primary cursor-col-resize transition-colors"
                    onMouseDown={(e) => handleResizeStart("sidebar-editor", e)}
                  />
                )}
              </>
            )}

            {/* Editor */}
            {visiblePanes.editor && (
              <>
                <div
                  className="flex-1 min-w-0"
                  style={{ width: paneDimensions.editor > 0 ? `${paneDimensions.editor}px` : undefined, flex: paneDimensions.editor > 0 ? "none" : 1 }}
                >
                  <EditorPane
                    theme={theme}
                    fileContent={fileContent}
                    isBinary={isBinary}
                    onSave={async (content: string) => {
                      if (!currentFileRef.current) return;
                      await saveFile(currentFileRef.current, content);
                      scheduleBuild();
                    }}
                  />
                </div>
                {visiblePanes.preview && (
                  <div
                    className="w-1 bg-base-300 hover:bg-primary cursor-col-resize transition-colors"
                    onMouseDown={(e) => handleResizeStart("editor-preview", e)}
                  />
                )}
              </>
            )}

            {/* Preview */}
            {visiblePanes.preview && (
              <div className="flex-1 min-w-0">
                <PreviewPane
                  apiUrl={apiUrl}
                  buildStatus={buildStatus}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  numPages={numPages}
                  currentPage={Number(pageInput) || 1}
                  onPageChange={(page) => {
                    setPageInput(String(page));
                    scrollToPage(page);
                  }}
                  projectRoot={projectRoot}
                  pdfKey={pdfKey}
                  pageProxyRef={pageProxyRef}
                  onClickSync={async (page, x, y) => {
                    const res = await fetch(`${apiUrl}/synctex/edit?page=${page}&x=${x}&y=${y}`);
                    if (!res.ok) return;
                    const data = (await res.json()) as SyncEdit;
                    if (data.file) {
                      await openFile(data.file);
                      editorInstance.current?.setPosition({ lineNumber: data.line || 1, column: data.col || 1 });
                      editorInstance.current?.revealLineInCenter(data.line || 1);
                    }
                  }}
                  onKeyShortcut={(e) => {
                    if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
                      e.preventDefault();
                      setZoom(clampZoom(zoom + 0.2));
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key === "-") {
                      e.preventDefault();
                      setZoom(clampZoom(zoom - 0.2));
                    }
                    if (e.key === "j") {
                      scrollToPage(Math.min(numPages, Number(pageInput) + 1));
                    }
                    if (e.key === "k") {
                      scrollToPage(Math.max(1, Number(pageInput) - 1));
                    }
                  }}
                  syncTarget={syncTarget}
                  onSyncScroll={scrollToPage}
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
          if (contextMenu) openModal({ kind: "rename", path: contextMenu.path });
          setContextMenu(null);
        }}
        onDuplicate={() => {
          if (contextMenu) openModal({ kind: "duplicate", path: contextMenu.path });
          setContextMenu(null);
        }}
        onMove={() => {
          if (contextMenu) openModal({ kind: "move", path: contextMenu.path });
          setContextMenu(null);
        }}
        onDelete={() => {
          if (contextMenu) openModal({ kind: "delete", path: contextMenu.path, isDir: contextMenu.isDir });
          setContextMenu(null);
        }}
        onCreateFile={() => {
          if (contextMenu) setCurrentDir(contextMenu.path);
          openModal({ kind: "create", type: "file" });
          setContextMenu(null);
        }}
        onCreateFolder={() => {
          if (contextMenu) setCurrentDir(contextMenu.path);
          openModal({ kind: "create", type: "dir" });
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
          if (fileMenu) openModal({ kind: "rename", path: fileMenu.path });
          setFileMenu(null);
        }}
        onDuplicate={() => {
          if (fileMenu) openModal({ kind: "duplicate", path: fileMenu.path });
          setFileMenu(null);
        }}
        onMove={() => {
          if (fileMenu) openModal({ kind: "move", path: fileMenu.path });
          setFileMenu(null);
        }}
        onDelete={() => {
          if (fileMenu) openModal({ kind: "delete", path: fileMenu.path, isDir: fileMenu.isDir });
          setFileMenu(null);
        }}
        onCreateFile={() => {
          if (fileMenu) setCurrentDir(fileMenu.path);
          openModal({ kind: "create", type: "file" });
          setFileMenu(null);
        }}
        onCreateFolder={() => {
          if (fileMenu) setCurrentDir(fileMenu.path);
          openModal({ kind: "create", type: "dir" });
          setFileMenu(null);
        }}
      />

      {/* Project Picker Modal */}
      <ProjectPicker
        visible={showProjectPicker}
        confirm={setProjectRootFromUI}
        close={() => setShowProjectPicker(false)}
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
                  if (e.key === "Escape") setModal(null);
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
              <button onClick={() => setModal(null)} className="btn">
                Cancel
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setModal(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
