import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { setupLatexLanguage } from "../utils/latex";

// Initialize LaTeX support once
let latexSetupDone = false;
let customThemesRegistered = false;

// Register custom themes that match the application color scheme
function registerCustomThemes() {
  if (customThemesRegistered) return;
  
  // Light theme
  monaco.editor.defineTheme("treefrog-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "999999", fontStyle: "italic" },
      { token: "keyword", foreground: "c45d0d" },
      { token: "variable", foreground: "1f1f1f" },
      { token: "string", foreground: "b35c3f" },
      { token: "number", foreground: "7a5c3f" },
    ],
    colors: {
      "editor.background": "#fbf9f7",
      "editor.foreground": "#1f1f1f",
      "editor.lineNumbersColumn.background": "#f5f3f1",
      "editor.lineNumber": "#999999",
      "editor.lineHighlightBackground": "#f0ede900",
      "editor.selectionBackground": "#c45d0d40",
      "editor.selectionHighlightBackground": "#c45d0d20",
      "editorCursor.foreground": "#c45d0d",
      "editorError.foreground": "#d66262",
      "editorWarning.foreground": "#dfa53f",
    },
  });

  // Dark theme - matching globals.css dark mode colors
  monaco.editor.defineTheme("treefrog-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b8a7a", fontStyle: "italic" },
      { token: "keyword", foreground: "f4a261" },
      { token: "variable", foreground: "f0ede8" },
      { token: "string", foreground: "e8a89f" },
      { token: "number", foreground: "d4a89f" },
    ],
    colors: {
      "editor.background": "#1a1510",
      "editor.foreground": "#f0ede8",
      "editor.lineNumbersColumn.background": "#161210",
      "editor.lineNumber": "#808080",
      "editor.lineHighlightBackground": "#1f1a16",
      "editor.selectionBackground": "#f4a26160",
      "editor.selectionHighlightBackground": "#f4a26130",
      "editorCursor.foreground": "#f4a261",
      "editorError.foreground": "#f48771",
      "editorWarning.foreground": "#f4c961",
      "editorWhitespace.foreground": "#3a3530",
    },
  });

  customThemesRegistered = true;
}

export function useEditor(
  containerRef: React.RefObject<HTMLDivElement>,
  theme: "light" | "dark",
  fileContent: string,
  isBinary: boolean,
  currentFile: string,
  onSave: (val: string) => void
) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const saveTimer = useRef<number | null>(null);
  const ignoreChange = useRef(false);
  const lastProjectRef = useRef<string>("");

  // Get Monaco theme based on system theme
  const getMonacoTheme = (themeMode: "light" | "dark") => {
    return themeMode === "dark" ? "treefrog-dark" : "treefrog-light";
  };

  // Detect project changes and dispose editor
  useEffect(() => {
    const projectRoot = currentFile?.split("/")[0] || "";
    if (lastProjectRef.current && projectRoot !== lastProjectRef.current) {
      // Project changed, dispose editor and reset content
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    }
    lastProjectRef.current = projectRoot;
  }, [currentFile]);

   // Create editor on mount
  useEffect(() => {
    if (!containerRef.current || isBinary) return;

    // Don't create if editor already exists
    if (editorRef.current) return;

    // Register custom themes on first use
    registerCustomThemes();

    // Setup LaTeX support once
    if (!latexSetupDone) {
      setupLatexLanguage();
      latexSetupDone = true;
    }

    const monacoTheme = getMonacoTheme(theme);
    editorRef.current = monaco.editor.create(containerRef.current, {
      value: "",
      language: "latex",
      theme: monacoTheme,
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "IBM Plex Mono, monospace",
    });

    // Handle content changes
    editorRef.current.onDidChangeModelContent(() => {
      if (ignoreChange.current) return;

      if (saveTimer.current) window.clearTimeout(saveTimer.current);

      saveTimer.current = window.setTimeout(() => {
        onSave(editorRef.current?.getValue() || "");
      }, 300);
    });

    // Keyboard shortcuts
    editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave(editorRef.current?.getValue() || "");
    });

    editorRef.current.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        onSave(editorRef.current?.getValue() || "");
      }
    );

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      editorRef.current?.layout();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, [isBinary, theme]);

  // Update theme
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(getMonacoTheme(theme));
    }
  }, [theme]);

  // Update content when file changes
  useEffect(() => {
    if (editorRef.current && !isBinary) {
      ignoreChange.current = true;
      editorRef.current.setValue(fileContent);
      editorRef.current.layout();
      window.setTimeout(() => {
        ignoreChange.current = false;
      }, 0);
    }
  }, [fileContent, isBinary]);

  return editorRef;
}

