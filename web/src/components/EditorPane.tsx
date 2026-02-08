import { useRef } from "react";
import { useEditor } from "../hooks/useEditor";

interface EditorPaneProps {
  theme: "light" | "dark";
  fileContent: string;
  isBinary: boolean;
  onSave: (content: string) => Promise<void>;
}

export function EditorPane({ theme, fileContent, isBinary, onSave }: EditorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEditor(containerRef, theme, fileContent, isBinary, onSave);

  return (
    <section className="editor flex-1 h-full flex flex-col bg-base-100 border-l border-base-300 overflow-hidden">
      <div className="border-b border-base-300 px-4 py-3 font-semibold text-sm flex-shrink-0">
        Editor
      </div>

      {isBinary && (
        <div className="flex items-center justify-center flex-1 text-base-content/50">
          Binary file selected
        </div>
      )}

      <div
        ref={containerRef}
        className="monaco flex-1 w-full"
        style={{
          height: isBinary ? 0 : "auto",
          overflow: "hidden",
          visibility: isBinary ? "hidden" : "visible",
          display: isBinary ? "none" : "block",
        }}
      />
    </section>
  );
}
