import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

export function useEditor(
  containerRef: React.RefObject<HTMLDivElement>,
  theme: "light" | "dark",
  fileContent: string,
  isBinary: boolean,
  onSave: (val: string) => void
) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const saveTimer = useRef<number | null>(null);
  const ignoreChange = useRef(false);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current || isBinary) return;

    console.log("[useEditor] Creating editor in container:", containerRef.current);
    console.log("[useEditor] Container dimensions:", {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: "",
      language: "latex",
      theme: theme === "dark" ? "vs-dark" : "vs",
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 14,
      fontFamily: "IBM Plex Mono, monospace",
    });

    console.log("[useEditor] Editor created successfully");

    // Handle content changes
    editorRef.current.onDidChangeModelContent(() => {
      if (ignoreChange.current) return;

      if (saveTimer.current) window.clearTimeout(saveTimer.current);

      saveTimer.current = window.setTimeout(() => {
        onSave(editorRef.current?.getValue() || "");
      }, 600);
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
    };
  }, []);

  // Update theme
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
    }
  }, [theme]);

  // Update content when file changes
  useEffect(() => {
    if (editorRef.current && !isBinary) {
      console.log("[useEditor] Updating content, length:", fileContent.length, "binary:", isBinary);
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

