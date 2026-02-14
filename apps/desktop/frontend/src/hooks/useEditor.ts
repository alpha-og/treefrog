import { useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor";
import { setupLatexLanguage } from "../utils/latex";

let latexSetupDone = false;
let customThemesRegistered = false;

function registerCustomThemes() {
  if (customThemesRegistered) return;
  
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

interface UseEditorOptions {
  onForwardSearch?: (line: number, col: number) => void;
}

export function useEditor(
  containerRef: React.RefObject<HTMLDivElement>,
  theme: "light" | "dark",
  fileContent: string,
  isBinary: boolean,
  currentFile: string,
  projectRoot: string,
  onSave: (val: string) => void,
  options?: UseEditorOptions
) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const saveTimer = useRef<number | null>(null);
  const ignoreChange = useRef(false);
  const lastProjectRef = useRef<string>("");
  const onSaveRef = useRef(onSave);
  const onForwardSearchRef = useRef(options?.onForwardSearch);
  const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    onForwardSearchRef.current = options?.onForwardSearch;
  }, [options?.onForwardSearch]);

  const getMonacoTheme = (themeMode: "light" | "dark") => {
    return themeMode === "dark" ? "treefrog-dark" : "treefrog-light";
  };

  useEffect(() => {
    if (lastProjectRef.current && projectRoot !== lastProjectRef.current) {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
        editorInstanceRef.current = null;
      }
    }
    lastProjectRef.current = projectRoot;
  }, [projectRoot]);

  useEffect(() => {
    if (!containerRef.current || isBinary) return;

    if (editorRef.current) return;

    registerCustomThemes();

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
    editorInstanceRef.current = editorRef.current;

    editorRef.current.onDidChangeModelContent(() => {
      if (ignoreChange.current) return;

      if (saveTimer.current) window.clearTimeout(saveTimer.current);

      saveTimer.current = window.setTimeout(() => {
        onSaveRef.current(editorRef.current?.getValue() || "");
      }, 300);
    });

    editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current(editorRef.current?.getValue() || "");
    });

    editorRef.current.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      () => {
        onSaveRef.current(editorRef.current?.getValue() || "");
      }
    );

    editorRef.current.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ,
      () => {
        const position = editorRef.current?.getPosition();
        if (position && onForwardSearchRef.current) {
          onForwardSearchRef.current(position.lineNumber, position.column);
        }
      }
    );

    editorRef.current.onMouseDown((e) => {
      if ((e.event.ctrlKey || e.event.metaKey) && e.target.position && onForwardSearchRef.current) {
        onForwardSearchRef.current(e.target.position.lineNumber, e.target.position.column);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      editorRef.current?.layout();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
        editorInstanceRef.current = null;
      }
    };
  }, [isBinary, theme, projectRoot]);

  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(getMonacoTheme(theme));
    }
  }, [theme]);

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

  const revealLine = useCallback((line: number, col: number = 1) => {
    if (!editorRef.current) return;
    editorRef.current.revealLineInCenter(line);
    editorRef.current.setPosition({ lineNumber: line, column: col });
    editorRef.current.focus();
  }, []);

  return { editorRef: editorInstanceRef, revealLine };
}

