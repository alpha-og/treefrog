import { Page, pdfjs } from "react-pdf";
import { useState, useEffect } from "react";

interface PDFPageProps {
  pageNum: number;
  zoom: number | string;
  pageProxyRef: React.MutableRefObject<Map<number, any>>;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
}

export default function PDFPage({
  pageNum,
  zoom,
  pageProxyRef,
  registerPageRef,
}: PDFPageProps) {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const containerRef = (el: HTMLDivElement | null) => {
    registerPageRef(pageNum, el);
    if (el) {
      setContainerWidth(el.offsetWidth);
    }
  };

  // Calculate actual zoom value based on fit mode
  let actualZoom = typeof zoom === 'number' ? zoom : 1;
  
  if (typeof zoom === 'string' && zoom === 'fit-width' && containerWidth > 0) {
    // For fit-width, we need to account for PDF page width
    // Standard A4 is 595.28 points wide at 72 DPI = 8.27 inches
    // We'll use a reasonable estimate
    const pdfPageWidth = 595; // Standard A4 width in points
    actualZoom = (containerWidth - 32) / pdfPageWidth; // -32 for padding/margins
  } else if (typeof zoom === 'string' && zoom === 'fit-height' && pageHeight > 0) {
    // For fit-height, scale based on container height
    const containerHeight = window.innerHeight - 300; // Rough estimate for header/toolbar
    actualZoom = containerHeight / pageHeight;
  }

  return (
    <div
      ref={containerRef}
      className="bg-white shadow-lg rounded mb-4 overflow-hidden"
    >
      <Page
        pageNumber={pageNum}
        scale={actualZoom}
        onLoadSuccess={(p: any) => {
          pageProxyRef.current.set(pageNum, p);
          // Get page dimensions for fit-height calculation
          if (p.getViewport) {
            const viewport = p.getViewport({ scale: 1 });
            setPageHeight(viewport.height);
          }
        }}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        loading={
          <div className="flex items-center justify-center p-8">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        }
      />
      <div className="text-center text-xs text-foreground/50 py-1 bg-muted">
        Page {pageNum}
      </div>
    </div>
  );
}
