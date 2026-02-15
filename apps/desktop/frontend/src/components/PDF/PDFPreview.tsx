import { useState, useEffect, useRef } from "react";
import { Document } from "react-pdf";
import type { PDFPageProxy, PDFDocumentProxy } from "pdfjs-dist";
import PDFPage from "./PDFPage";

interface PDFPreviewProps {
  url: string;
  zoom: number | string;
  numPages: number;
  onNumPagesChange: (numPages: number) => void;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
  pageProxyRef: React.MutableRefObject<Map<number, PDFPageProxy>>;
  onInverseSearch?: (page: number, x: number, y: number) => void;
  onPageNavigate?: (page: number) => void;
  highlightPosition?: { page: number; x: number; y: number } | null;
}

export default function PDFPreview({
  url,
  zoom,
  numPages,
  onNumPagesChange,
  registerPageRef,
  pageProxyRef,
  onInverseSearch,
  onPageNavigate,
  highlightPosition,
}: PDFPreviewProps) {
  const [error, setError] = useState("");
  const [internalNumPages, setInternalNumPages] = useState<number>(() => 0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setContainerWidth(container.offsetWidth);
    setContainerHeight(container.offsetHeight);

    const resizeObserver = new ResizeObserver(() => {
      setContainerWidth(container.offsetWidth);
      setContainerHeight(container.offsetHeight);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleLoadSuccess = (d: PDFDocumentProxy) => {
    setInternalNumPages(d.numPages);
    onNumPagesChange(d.numPages);
  };

  const pagesToRender = internalNumPages > 0 ? internalNumPages : numPages;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-error">
        {error}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 p-4 h-full w-full relative">
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
              containerWidth={containerWidth}
              containerHeight={containerHeight}
              onInverseSearch={onInverseSearch}
              onPageNavigate={onPageNavigate}
            />
          ))
        ) : null}
      </Document>
      {highlightPosition && (
        <div
          className="absolute pointer-events-none w-4 h-4 rounded-full bg-primary/50 animate-pulse"
          style={{
            left: `calc(${highlightPosition.x}px + 1rem)`,
            top: `calc(${highlightPosition.y}px + 1rem)`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}
    </div>
  );
}
