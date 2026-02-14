import { useRef, useEffect } from "react";
import { FileText } from "lucide-react";
import { motion } from "motion/react";
import { useEditor } from "@/hooks/useEditor";

interface EditorPaneProps {
  theme: "light" | "dark";
  fileContent: string;
  isBinary: boolean;
  currentFile: string;
  projectRoot: string;
  onSave: (content: string) => Promise<void>;
  onForwardSearch?: (line: number, col: number) => void;
  onEditorReady?: (revealLine: (line: number, col?: number) => void) => void;
  highlightedLine?: number | null;
}

export function EditorPane({ 
  theme, 
  fileContent, 
  isBinary, 
  currentFile, 
  projectRoot, 
  onSave, 
  onForwardSearch,
  onEditorReady,
  highlightedLine 
}: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFile = currentFile && currentFile.length > 0;

  const { revealLine, editorRef } = useEditor(containerRef, theme, fileContent, isBinary, currentFile, projectRoot, onSave, {
    onForwardSearch
  });

  useEffect(() => {
    if (onEditorReady && revealLine) {
      onEditorReady(revealLine);
    }
  }, [onEditorReady, revealLine]);

  useEffect(() => {
    if (highlightedLine && highlightedLine > 0 && editorRef.current) {
      editorRef.current.revealLineInCenter(highlightedLine);
      editorRef.current.setSelection({
        startLineNumber: highlightedLine,
        startColumn: 1,
        endLineNumber: highlightedLine,
        endColumn: 1000,
      });
    }
  }, [highlightedLine, editorRef]);

  const showEditor = hasFile && !isBinary;

  return (
    <section className="editor flex-1 h-full flex flex-col bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3 font-semibold text-sm shrink-0">
        {hasFile ? currentFile.split("/").pop() : "Editor"}
      </div>

      {!hasFile && (
        <motion.div 
          className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <FileText size={48} className="opacity-30" />
          <p className="text-sm">Select a file to view</p>
        </motion.div>
      )}

      {hasFile && isBinary && (
        <div className="flex items-center justify-center flex-1 text-muted-foreground">
          Binary file selected
        </div>
      )}

      <div
        ref={containerRef}
        className="monaco flex-1 w-full"
        style={{
          height: showEditor ? "auto" : 0,
          overflow: "hidden",
          visibility: showEditor ? "visible" : "hidden",
          display: showEditor ? "block" : "none",
        }}
      />
    </section>
  );
}
