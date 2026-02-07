import React, { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import * as monaco from "monaco-editor";
import {
  File,
  Folder,
  ChevronRight,
  ChevronLeft,
  Plus,
  Copy,
  Trash2,
  Edit2,
  EyeOff,
  Eye,
  PanelLeft,
  PanelRight,
  Maximize2,
  MoreVertical,
  FileText,
  FileCode,
  FileJson,
  Settings,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type FileEntry = { name: string; isDir: boolean; size: number; modTime: string };

type BuildStatus = {
  id: string;
  state: string;
  message: string;
  startedAt?: string;
  endedAt?: string;
};

type SyncView = { page: number; x: number; y: number; file: string; line: number };

type SyncEdit = { file: string; line: number; col: number };

type ModalState =
  | { kind: "create"; type: "file" | "dir" }
  | { kind: "rename"; path: string }
  | { kind: "move"; path: string }
  | { kind: "duplicate"; path: string }
  | { kind: "delete"; path: string; isDir: boolean };

function getFileIcon(name: string, isDir: boolean) {
  if (isDir) return <Folder size={14} />;

  const ext = name.split(".").pop()?.toLowerCase() || "";
  
  switch (ext) {
    case "tex":
    case "txt":
      return <FileText size={14} />;
    case "json":
      return <FileJson size={14} />;
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
    case "py":
    case "rs":
    case "go":
      return <FileCode size={14} />;
    case "pdf":
      return <File size={14} />;
    default:
      return <File size={14} />;
  }
}

const API = "/api";
const ZOOM_LEVELS = [0.6, 0.8, 1, 1.2, 1.4, 1.6, 2, 2.4];

export default function App() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [currentDir, setCurrentDir] = useState<string>("");
  const [currentFile, setCurrentFile] = useState<string>("");
  const [isBinary, setIsBinary] = useState<boolean>(false);
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [pdfKey, setPdfKey] = useState<number>(Date.now());
  const [engine, setEngine] = useState<string>("pdflatex");
  const [shellEscape, setShellEscape] = useState<boolean>(true);
  const [gitStatus, setGitStatus] = useState<string>("");
  const [commitMsg, setCommitMsg] = useState<string>("");
  const [syncTarget, setSyncTarget] = useState<SyncView | null>(null);
  const [projectRoot, setProjectRoot] = useState<string>("");
  const [gitError, setGitError] = useState<boolean>(false);
  const [projectInput, setProjectInput] = useState<string>("");
  const [showProjectPicker, setShowProjectPicker] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalInput, setModalInput] = useState<string>("");
  const [theme, setTheme] = useState<string>("light");

  const [zoom, setZoom] = useState<number>(1.2);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageInput, setPageInput] = useState<string>("1");

  // Layout pane visibility state
  const [visiblePanes, setVisiblePanes] = useState<{ sidebar: boolean; editor: boolean; preview: boolean }>(() => {
    const saved = localStorage.getItem("treefrog-panes");
    return saved ? JSON.parse(saved) : { sidebar: true, editor: true, preview: true };
  });

  // Pane dimensions for resizing
  const [paneDimensions, setPaneDimensions] = useState<{ sidebar: number; editor: number }>(() => {
    const saved = localStorage.getItem("treefrog-pane-dims");
    return saved ? JSON.parse(saved) : { sidebar: 280, editor: 0 };
  });

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(
    null
  );

  // File menu dropdown state
  const [fileMenu, setFileMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);

  // Resizing state
  const [isResizing, setIsResizing] = useState<"sidebar-editor" | "editor-preview" | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const startPosRef = useRef<number>(0);
  const startDimsRef = useRef<{ sidebar: number; editor: number }>({ sidebar: 0, editor: 0 });
  const resizingRef = useRef<"sidebar-editor" | "editor-preview" | null>(null);
  const buildPollRef = useRef<number | null>(null);
  const currentFileRef = useRef<string>("");
  const ignoreChangeRef = useRef<boolean>(false);
  const pageProxyRef = useRef<Map<number, pdfjs.PDFPageProxy>>(new Map());

  const saveTimer = useRef<number | null>(null);
  const buildTimer = useRef<number | null>(null);
  const editorContainer = useRef<HTMLDivElement | null>(null);
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    loadProject();
    connectWS();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("treefrog-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = saved || (prefersDark ? "dark" : "light");
    setTheme(initial);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("treefrog-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("treefrog-panes", JSON.stringify(visiblePanes));
  }, [visiblePanes]);

  useEffect(() => {
    localStorage.setItem("treefrog-pane-dims", JSON.stringify(paneDimensions));
  }, [paneDimensions]);

  useEffect(() => {
    function handleClickOutside() {
      setContextMenu(null);
    }
    if (contextMenu) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [contextMenu]);

  useEffect(() => {
    if (!editorContainer.current || editorInstance.current) return;
    editorInstance.current = monaco.editor.create(editorContainer.current, {
      value: "",
      language: "latex",
      theme: theme === "dark" ? "vs-dark" : "vs",
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: 14,
    });

    editorInstance.current.onDidChangeModelContent(() => {
      if (ignoreChangeRef.current) return;
      const value = editorInstance.current?.getValue() ?? "";
      scheduleSave(value);
    });

    editorInstance.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveAndBuildNow();
    });

    editorInstance.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      saveAndBuildNow();
    });
  }, []);

  useEffect(() => {
    if (editorInstance.current) {
      monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
    }
  }, [theme]);

  useEffect(() => {
    if (numPages > 0) {
      const next = String(clampPage(Number(pageInput || "1"), numPages));
      if (next !== pageInput) {
        setPageInput(next);
      }
    }
  }, [numPages]);

  async function loadProject() {
    const res = await fetch(`${API}/project`);
    if (!res.ok) return;
    const data = await res.json();
    setProjectRoot(data.root || "");
    if (!data.root) {
      setShowProjectPicker(true);
      return;
    }
    setShowProjectPicker(false);
    await loadEntries("");
    await refreshGit();
  }

  async function setProjectRootFromUI() {
    if (!projectInput.trim()) return;
    const res = await fetch(`${API}/project/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: projectInput.trim() }),
    });
    if (!res.ok) {
      const msg = await res.text();
      alert(msg);
      return;
    }
    const data = await res.json();
    setProjectRoot(data.root || "");
    setShowProjectPicker(false);
    setCurrentDir("");
    setCurrentFile("");
    currentFileRef.current = "";
    editorInstance.current?.setValue("");
    await loadEntries("");
    await refreshGit();
  }

  async function loadEntries(dir: string) {
    const path = dir === "" ? "." : dir;
    const res = await fetch(`${API}/files?path=${encodeURIComponent(path)}`);
    if (!res.ok) return;
    const data = await res.json();
    setEntries(data);
    setCurrentDir(dir);
  }

  async function openFile(path: string) {
    setCurrentFile(path);
    currentFileRef.current = path;
    const res = await fetch(`${API}/file?path=${encodeURIComponent(path)}`);
    if (!res.ok) return;
    const data = await res.json();
    setIsBinary(data.isBinary);
    if (!data.isBinary && editorInstance.current) {
      ignoreChangeRef.current = true;
      editorInstance.current.setValue(data.content || "");
      window.setTimeout(() => {
        ignoreChangeRef.current = false;
      }, 0);
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
    await fetch(`${API}/file?path=${encodeURIComponent(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, isBinary: false }),
    });
  }

  async function saveAndBuildNow() {
    if (!currentFileRef.current || !editorInstance.current) return;
    const content = editorInstance.current.getValue();
    await saveFile(currentFileRef.current, content);
    await triggerBuild();
  }

  function scheduleBuild() {
    if (buildTimer.current) window.clearTimeout(buildTimer.current);
    buildTimer.current = window.setTimeout(async () => {
      await triggerBuild();
    }, 700);
  }

  async function triggerBuild() {
    const mainFile = currentFileRef.current || "main.tex";
    await fetch(`${API}/build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mainFile, engine, shellEscape }),
    });
    startBuildPolling();
  }

  function startBuildPolling() {
    if (buildPollRef.current) window.clearInterval(buildPollRef.current);
    buildPollRef.current = window.setInterval(async () => {
      const res = await fetch(`${API}/build/status`);
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
    const res = await fetch(`${API}/git/status`);
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

  async function commitAll() {
    if (!commitMsg.trim()) return;
    await fetch(`${API}/git/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: commitMsg, all: true }),
    });
    setCommitMsg("");
    refreshGit();
  }

  async function push() {
    await fetch(`${API}/git/push`, { method: "POST", headers: { "Content-Type": "application/json" } });
    refreshGit();
  }

  async function pull() {
    await fetch(`${API}/git/pull`, { method: "POST", headers: { "Content-Type": "application/json" } });
    refreshGit();
  }

  async function syncFromCursor() {
    if (!currentFile || !editorInstance.current) return;
    const pos = editorInstance.current.getPosition();
    if (!pos) return;
    const url = `${API}/synctex/view?file=${encodeURIComponent(currentFile)}&line=${pos.lineNumber}&col=${pos.column}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as SyncView;
    setSyncTarget(data);
    scrollToPage(data.page);
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

  async function runFS(endpoint: string, body: any) {
    const res = await fetch(`${API}${endpoint}`, {
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

  function openModal(next: ModalState) {
    setModal(next);
    setModalInput("");
    if (next.kind === "rename" || next.kind === "move" || next.kind === "duplicate") {
      if (next.kind === "rename") setModalInput(next.path);
      if (next.kind === "move") setModalInput(currentDir || "");
      if (next.kind === "duplicate") setModalInput(next.path + " copy");
    }
  }

  function togglePane(pane: "sidebar" | "editor" | "preview") {
    setVisiblePanes((prev) => {
      const newPanes = { ...prev, [pane]: !prev[pane] };
      // If all panes are hidden, show the sidebar as fallback
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

  function handleFileContextMenu(e: React.MouseEvent, path: string, isDir: boolean) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  }

  function closeContextMenu() {
    setContextMenu(null);
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
        editorInstance.current?.setValue("");
      }
    }
    setModal(null);
  }

  const breadcrumbs = useMemo(() => {
    const parts = currentDir ? currentDir.split("/") : [];
    const items: { name: string; path: string }[] = [{ name: "root", path: "" }];
    let acc = "";
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p;
      items.push({ name: p, path: acc });
    }
    return items;
  }, [currentDir]);

  const allPanesHidden = useMemo(() => {
    return !visiblePanes.sidebar && !visiblePanes.editor && !visiblePanes.preview;
  }, [visiblePanes]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Treefrog</div>
        <div className="project-chip" onClick={() => setShowProjectPicker(true)}>
          {projectRoot ? projectRoot : "Set project"}
        </div>
        <div className="actions">
          <select value={engine} onChange={(e) => setEngine(e.target.value)}>
            <option value="pdflatex">pdflatex</option>
            <option value="xelatex">xelatex</option>
            <option value="lualatex">lualatex</option>
          </select>
          <label className="toggle">
            <input type="checkbox" checked={shellEscape} onChange={(e) => setShellEscape(e.target.checked)} />
            Shell-escape
          </label>
          {shellEscape && <span className="warning">Shell-escape enabled</span>}
          <button onClick={triggerBuild}>Build</button>
          <button onClick={syncFromCursor}>Sync</button>
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <button 
              onClick={() => togglePane("sidebar")} 
              title={visiblePanes.sidebar ? "Hide sidebar" : "Show sidebar"}
              style={{ opacity: visiblePanes.sidebar ? 1 : 0.5 }}
            >
              <PanelLeft size={16} />
            </button>
            <button 
              onClick={() => togglePane("editor")} 
              title={visiblePanes.editor ? "Hide editor" : "Show editor"}
              style={{ opacity: visiblePanes.editor ? 1 : 0.5 }}
            >
              <Maximize2 size={16} />
            </button>
            <button 
              onClick={() => togglePane("preview")} 
              title={visiblePanes.preview ? "Hide preview" : "Show preview"}
              style={{ opacity: visiblePanes.preview ? 1 : 0.5 }}
            >
              <PanelRight size={16} />
            </button>
          </div>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </header>
      <div className="main" ref={mainRef}>
        {allPanesHidden ? (
          <EmptyPlaceholder />
        ) : (
          <>
            {visiblePanes.sidebar && (
              <>
                <aside className="sidebar">
              <div className="file-header">
                <div className="pane-title">Files</div>
              </div>
              <div className="file-actions">
                <button onClick={() => openModal({ kind: "create", type: "file" })} title="New file">
                  <Plus size={14} />
                  File
                </button>
                <button onClick={() => openModal({ kind: "create", type: "dir" })} title="New folder">
                  <Folder size={14} />
                  Folder
                </button>
              </div>
              <div className="breadcrumbs">
                {breadcrumbs.map((b, i) => (
                  <button key={b.path} onClick={() => loadEntries(b.path)} title={b.path}>
                    {b.name}
                    {i < breadcrumbs.length - 1 && <ChevronRight size={12} />}
                  </button>
                ))}
              </div>
              <ul className="filelist">
                {entries.map((f) => {
                  const path = joinPath(currentDir, f.name);
                  return (
                    <li key={f.name}>
                      <div className="file-row" onContextMenu={(e) => handleFileContextMenu(e, path, f.isDir)}>
                        {f.isDir ? (
                          <button className="dir" onClick={() => loadEntries(path)} title={f.name}>
                            {getFileIcon(f.name, true)}
                            {f.name}
                          </button>
                        ) : (
                          <button
                            className={currentFile === path ? "active" : ""}
                            onClick={() => openFile(path)}
                            title={f.name}
                          >
                            {getFileIcon(f.name, false)}
                            {f.name}
                          </button>
                        )}
                        <button
                          className="file-menu-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileMenu({ x: e.currentTarget.getBoundingClientRect().right - 140, y: e.currentTarget.getBoundingClientRect().bottom + 4, path, isDir: f.isDir });
                          }}
                          title="More options"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="git-panel">
                <div className="pane-title">Git</div>
                <pre className={`git-status ${gitError ? "error" : ""}`}>{gitStatus || "clean"}</pre>
                <input
                  placeholder="Commit message"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                />
                <div className="git-actions">
                  <button onClick={commitAll}>Commit</button>
                  <button onClick={push}>Push</button>
                  <button onClick={pull}>Pull</button>
                </div>
              </div>
            </aside>
            {visiblePanes.editor || visiblePanes.preview ? (
              <div
                className="resize-handle"
                onMouseDown={(e) => handleResizeStart("sidebar-editor", e)}
              />
            ) : null}
          </>
        )}
        {visiblePanes.editor && (
          <>
            <section className="editor">
              <div className="pane-header">
                <div className="pane-title">Editor</div>
              </div>
              {isBinary ? (
                <div className="binary">Binary file selected</div>
              ) : (
                <div className="monaco" ref={editorContainer} />
              )}
            </section>
            {visiblePanes.preview ? (
              <div
                className="resize-handle"
                onMouseDown={(e) => handleResizeStart("editor-preview", e)}
              />
            ) : null}
          </>
        )}
        {visiblePanes.preview && (
          <section className="preview">
            <div className="pane-header">
              <div className="pane-title">
                Preview
                <span className={`status ${buildStatus?.state || "idle"}`}>
                  {buildStatus?.state || "idle"}
                </span>
              </div>
            </div>
            {buildStatus?.state === "error" && (
              <div className="build-error">
                <div className="error-title">Build failed</div>
                <div className="error-message">{buildStatus.message || "Unknown error"}</div>
                <a href={`${API}/build/log`} target="_blank" rel="noreferrer">
                  View full log
                </a>
              </div>
            )}
            <div className="preview-toolbar">
              <button onClick={() => setZoom(clampZoom(zoom - 0.2))}>−</button>
              <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
                {ZOOM_LEVELS.map((z) => (
                  <option key={z} value={z}>{Math.round(z * 100)}%</option>
                ))}
              </select>
              <button onClick={() => setZoom(clampZoom(zoom + 0.2))}>+</button>
              <div className="page-controls">
                <button onClick={() => scrollToPage(Math.max(1, Number(pageInput) - 1))}>Prev</button>
                <input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onBlur={() => scrollToPage(clampPage(Number(pageInput), numPages))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      scrollToPage(clampPage(Number(pageInput), numPages));
                    }
                  }}
                />
                <span>/ {numPages || 0}</span>
                <button onClick={() => scrollToPage(Math.min(numPages, Number(pageInput) + 1))}>Next</button>
              </div>
              <a href={`${API}/export/pdf`} target="_blank" rel="noreferrer">Export PDF</a>
              <a href={`${API}/export/source-zip`} target="_blank" rel="noreferrer">Export Source</a>
            </div>
            {projectRoot ? (
              <PDFPreview
                key={pdfKey}
                url={`${API}/export/pdf?ts=${pdfKey}`}
                zoom={zoom}
                numPages={numPages}
                onPageCount={setNumPages}
                registerPageRef={registerPageRef}
                pageProxyRef={pageProxyRef}
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
                onClickSync={async (page, x, y) => {
                  const res = await fetch(`${API}/synctex/edit?page=${page}&x=${x}&y=${y}`);
                  if (!res.ok) return;
                  const data = (await res.json()) as SyncEdit;
                  if (data.file) {
                    await openFile(data.file);
                    editorInstance.current?.setPosition({ lineNumber: data.line || 1, column: data.col || 1 });
                    editorInstance.current?.revealLineInCenter(data.line || 1);
                  }
                }}
                syncTarget={syncTarget}
                onSyncScroll={(page) => scrollToPage(page)}
              />
            ) : (
              <div className="empty">Select a project to see preview.</div>
            )}
          </section>
        )}
          </>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          path={contextMenu.path}
          isDir={contextMenu.isDir}
          onClose={closeContextMenu}
          onRename={() => {
            openModal({ kind: "rename", path: contextMenu.path });
            closeContextMenu();
          }}
          onDuplicate={() => {
            openModal({ kind: "duplicate", path: contextMenu.path });
            closeContextMenu();
          }}
          onMove={() => {
            openModal({ kind: "move", path: contextMenu.path });
            closeContextMenu();
          }}
          onDelete={() => {
            openModal({ kind: "delete", path: contextMenu.path, isDir: contextMenu.isDir });
            closeContextMenu();
          }}
          onCreateFile={() => {
            setCurrentDir(contextMenu.path);
            openModal({ kind: "create", type: "file" });
            closeContextMenu();
          }}
          onCreateFolder={() => {
            setCurrentDir(contextMenu.path);
            openModal({ kind: "create", type: "dir" });
            closeContextMenu();
          }}
        />
      )}

      {fileMenu && (
        <FileMenu
          x={fileMenu.x}
          y={fileMenu.y}
          path={fileMenu.path}
          isDir={fileMenu.isDir}
          onClose={() => setFileMenu(null)}
          onRename={() => {
            openModal({ kind: "rename", path: fileMenu.path });
            setFileMenu(null);
          }}
          onDuplicate={() => {
            openModal({ kind: "duplicate", path: fileMenu.path });
            setFileMenu(null);
          }}
          onMove={() => {
            openModal({ kind: "move", path: fileMenu.path });
            setFileMenu(null);
          }}
          onDelete={() => {
            openModal({ kind: "delete", path: fileMenu.path, isDir: fileMenu.isDir });
            setFileMenu(null);
          }}
          onCreateFile={() => {
            setCurrentDir(fileMenu.path);
            openModal({ kind: "create", type: "file" });
            setFileMenu(null);
          }}
          onCreateFolder={() => {
            setCurrentDir(fileMenu.path);
            openModal({ kind: "create", type: "dir" });
            setFileMenu(null);
          }}
        />
      )}

      {showProjectPicker && (
        <div className="modal">
          <div className="modal-card">
            <h3>Select Project Folder</h3>
            <p>Enter an absolute path to your LaTeX project.</p>
            <input
              placeholder="/path/to/project"
              value={projectInput}
              onChange={(e) => setProjectInput(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={setProjectRootFromUI}>Set project</button>
              {projectRoot && (
                <button onClick={() => setShowProjectPicker(false)}>Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal">
          <div className="modal-card">
            <h3>{modalTitle(modal)}</h3>
            <p>{modalHint(modal, currentDir)}</p>
            {modal.kind !== "delete" && (
              <input
                placeholder={modalPlaceholder(modal, currentDir)}
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
              />
            )}
            {modal.kind === "delete" && modal.isDir && (
              <p className="danger">This will delete the folder and its contents.</p>
            )}
            <div className="modal-actions">
              <button onClick={confirmModal}>Confirm</button>
              <button onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyPlaceholder() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "16px",
        color: "var(--ink-secondary)",
      }}
    >
      <Settings size={48} style={{ opacity: 0.3 }} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
          All panes hidden
        </div>
        <div style={{ fontSize: "12px", opacity: 0.7 }}>
          Use the panel icons in the toolbar to show panes
        </div>
      </div>
    </div>
  );
}

function joinPath(base: string, name: string) {
  if (!base) return name;
  if (!name) return base;
  return `${base}/${name}`;
}

function baseName(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function parentDir(path: string) {
  if (!path) return "";
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
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

function modalHint(modal: ModalState, currentDir: string) {
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
    default:
      return currentDir;
  }
}

function ContextMenu({
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
}: {
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
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onRename}>
        <Edit2 size={14} />
        Rename
      </button>
      <button onClick={onDuplicate}>
        <Copy size={14} />
        Duplicate
      </button>
      <button onClick={onMove}>
        <ChevronRight size={14} />
        Move
      </button>
      {isDir && (
        <>
          <button onClick={onCreateFile}>
            <File size={14} />
            New File
          </button>
          <button onClick={onCreateFolder}>
            <Folder size={14} />
            New Folder
          </button>
        </>
      )}
      <button onClick={onDelete} className="danger">
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}

function FileMenu({
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
}: {
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
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="file-menu-dropdown"
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onRename}>
        <Edit2 size={14} />
        Rename
      </button>
      <button onClick={onDuplicate}>
        <Copy size={14} />
        Duplicate
      </button>
      <button onClick={onMove}>
        <ChevronRight size={14} />
        Move
      </button>
      {isDir && (
        <>
          <button onClick={onCreateFile}>
            <FileText size={14} />
            New File
          </button>
          <button onClick={onCreateFolder}>
            <Folder size={14} />
            New Folder
          </button>
        </>
      )}
      <button onClick={onDelete} className="danger">
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}

function PDFPreview({
  url,
  onClickSync,
  syncTarget,
  zoom,
  numPages,
  onPageCount,
  registerPageRef,
  pageProxyRef,
  onKeyShortcut,
  onSyncScroll,
}: {
  url: string;
  onClickSync: (page: number, x: number, y: number) => void;
  syncTarget: SyncView | null;
  zoom: number;
  numPages: number;
  onPageCount: (n: number) => void;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
  pageProxyRef: React.MutableRefObject<Map<number, pdfjs.PDFPageProxy>>;
  onKeyShortcut: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onSyncScroll: (page: number) => void;
}) {
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setError("");
  }, [url]);

  useEffect(() => {
    if (syncTarget) {
      onSyncScroll(syncTarget.page);
    }
  }, [syncTarget, onSyncScroll]);

  if (error) return <div className="empty">{error}</div>;
  return (
    <div className="pdf" tabIndex={0} onKeyDown={onKeyShortcut}>
      <Document
        file={url}
        onLoadSuccess={(doc) => onPageCount(doc.numPages)}
        onLoadError={() => setError("Failed to load PDF")}
        loading={<div className="empty">Loading PDF…</div>}
        error={<div className="empty">Failed to load PDF</div>}
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
          <PDFPage
            key={pageNum}
            pageNum={pageNum}
            zoom={zoom}
            onClickSync={onClickSync}
            syncTarget={syncTarget}
            registerRef={(ref) => registerPageRef(pageNum, ref)}
            pageProxyRef={pageProxyRef}
          />
        ))}
      </Document>
    </div>
  );
}

function PDFPage({
  pageNum,
  zoom,
  onClickSync,
  syncTarget,
  registerRef,
  pageProxyRef,
}: {
  pageNum: number;
  zoom: number;
  onClickSync: (page: number, x: number, y: number) => void;
  syncTarget: SyncView | null;
  registerRef: (ref: HTMLDivElement) => void;
  pageProxyRef: React.MutableRefObject<Map<number, pdfjs.PDFPageProxy>>;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (wrapperRef.current) {
      registerRef(wrapperRef.current);
    }
  }, [registerRef]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    overlay.innerHTML = "";
    if (syncTarget && syncTarget.page === pageNum) {
      const pageProxy = pageProxyRef.current.get(pageNum);
      if (pageProxy) {
        const viewport = pageProxy.getViewport({ scale: zoom });
        const pt = viewport.convertToViewportPoint(syncTarget.x, syncTarget.y);
        const dot = document.createElement("div");
        dot.className = "sync-dot";
        dot.style.left = `${pt[0]}px`;
        dot.style.top = `${pt[1]}px`;
        overlay.appendChild(dot);
      }
    }
  }, [syncTarget, pageNum, zoom, pageProxyRef]);

  return (
    <div
      className="pdf-page"
      ref={wrapperRef}
      onClick={(e) => {
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const pageProxy = pageProxyRef.current.get(pageNum);
        if (!pageProxy) return;
        const viewport = pageProxy.getViewport({ scale: zoom });
        const pdfPoint = viewport.convertToPdfPoint(x, y);
        onClickSync(pageNum, pdfPoint[0], pdfPoint[1]);
      }}
    >
      <Page
        pageNumber={pageNum}
        scale={zoom}
        onLoadSuccess={(pageProxy) => {
          pageProxyRef.current.set(pageNum, pageProxy);
        }}
        renderAnnotationLayer={false}
        renderTextLayer={false}
      />
      <div className="overlay" ref={overlayRef} />
    </div>
  );
}
