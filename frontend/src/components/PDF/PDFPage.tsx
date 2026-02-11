import { Page, pdfjs } from "react-pdf";
import { useState, useEffect } from "react";

interface PDFPageProps {
  pageNum: number;
  zoom: number | string;
  pageProxyRef: React.MutableRefObject<Map<number, any>>;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
  containerWidth: number;
  containerHeight: number;
}

export default function PDFPage({
  pageNum,
  zoom,
  pageProxyRef,
  registerPageRef,
  containerWidth,
  containerHeight,
}: PDFPageProps) {
  const [pageHeight, setPageHeight] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  
  const containerRef = (el: HTMLDivElement | null) => {
    registerPageRef(pageNum, el);
  };

  // Calculate actual zoom value based on fit mode
  let actualZoom = typeof zoom === 'number' ? zoom : 1;
  
  if (typeof zoom === 'string' && zoom === 'fit-width' && containerWidth > 0 && pageWidth > 0) {
    // Fit to available container width, accounting for padding
    const availableWidth = containerWidth - 32; // -32 for p-4 padding on both sides
    actualZoom = availableWidth / pageWidth;
  } else if (typeof zoom === 'string' && zoom === 'fit-height' && containerHeight > 0 && pageHeight > 0) {
    // Fit to available container height
    // Note: containerHeight includes the header, so we use a reasonable estimate
    // or rely on the actual page height if we have it
    const availableHeight = containerHeight - 100; // -100 for header + padding + margins
    actualZoom = availableHeight / pageHeight;
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
          // Get page dimensions for fit calculations
          if (p.getViewport) {
            const viewport = p.getViewport({ scale: 1 });
            setPageHeight(viewport.height);
            setPageWidth(viewport.width);
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
