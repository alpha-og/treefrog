import { useState, useEffect } from "react";
import { Document } from "react-pdf";
import PDFPage from "./PDFPage";

interface PDFPreviewProps {
  url: string;
  zoom: number;
  numPages: number;
  onNumPagesChange: (numPages: number) => void;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
  pageProxyRef: React.MutableRefObject<Map<number, any>>;
}

export default function PDFPreview({
  url,
  zoom,
  numPages,
  onNumPagesChange,
  registerPageRef,
  pageProxyRef,
}: PDFPreviewProps) {
  const [error, setError] = useState("");
  // Track internal page count to handle the initial load correctly
  const [internalNumPages, setInternalNumPages] = useState<number>(0);

  useEffect(() => {
    setError("");
    setInternalNumPages(0); // Reset when URL changes
  }, [url]);

  const handleLoadSuccess = (d: any) => {
    setInternalNumPages(d.numPages);
    onNumPagesChange(d.numPages);
  };

  // Use internal page count if available, otherwise fall back to prop
  const pagesToRender = internalNumPages > 0 ? internalNumPages : numPages;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-error">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <Document
        file={url}
        onLoadSuccess={handleLoadSuccess}
        onLoadError={() => setError("Failed to load PDF")}
        loading={
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        }
      >
        {pagesToRender > 0 ? (
          Array.from({ length: pagesToRender }, (_, i) => i + 1).map((pageNum) => (
            <PDFPage
              key={pageNum}
              pageNum={pageNum}
              zoom={zoom}
              pageProxyRef={pageProxyRef}
              registerPageRef={registerPageRef}
            />
          ))
        ) : null}
      </Document>
    </div>
  );
}
