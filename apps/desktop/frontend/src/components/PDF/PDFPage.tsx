import { Page } from "react-pdf";
import type { PDFPageProxy } from "pdfjs-dist";
import { useState, useCallback, useMemo, memo } from "react";

interface PDFPageProps {
  pageNum: number;
  zoom: number | string;
  pageProxyRef: React.MutableRefObject<Map<number, PDFPageProxy>>;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
  containerWidth: number;
  containerHeight: number;
  onInverseSearch?: (page: number, x: number, y: number) => void;
  onPageNavigate?: (page: number) => void;
}

const PDFPage = memo(function PDFPage({
  pageNum,
  zoom,
  pageProxyRef,
  registerPageRef,
  containerWidth,
  containerHeight,
  onInverseSearch,
  onPageNavigate,
}: PDFPageProps) {
  const [pageHeight, setPageHeight] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    registerPageRef(pageNum, el);
  }, [pageNum, registerPageRef]);

  const handlePageDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onInverseSearch || !pageProxyRef.current.has(pageNum)) return;

    const pageProxy = pageProxyRef.current.get(pageNum);
    if (!pageProxy) return;

    const viewport = pageProxy.getViewport({ scale: 1 });
    
    const pageElement = (e.target as HTMLElement).closest('.react-pdf__Page');
    if (!pageElement) return;

    const rect = pageElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const actualZoom = typeof zoom === 'number' ? zoom : 1;
    
    const pdfX = clickX / actualZoom;
    const pdfY = viewport.height - (clickY / actualZoom);

    onInverseSearch(pageNum, pdfX, pdfY);
  }, [pageNum, zoom, onInverseSearch, pageProxyRef]);

  const handleAnnotationClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#') || href.startsWith('page=')) {
      e.preventDefault();
      const pageMatch = href.match(/page=(\d+)/) || href.match(/^#page=(\d+)/);
      if (pageMatch && onPageNavigate) {
        const targetPage = parseInt(pageMatch[1], 10);
        if (targetPage > 0) {
          onPageNavigate(targetPage);
        }
      } else if (href.startsWith('#') && onPageNavigate) {
        const namedDest = href.slice(1);
        const pageMatch = namedDest.match(/^page=(\d+)/);
        if (pageMatch) {
          onPageNavigate(parseInt(pageMatch[1], 10));
        }
      }
    }
  }, [onPageNavigate]);

  const actualZoom = useMemo(() => {
    if (typeof zoom === 'number') return zoom;
    
    if (zoom === 'fit-width' && containerWidth > 0 && pageWidth > 0) {
      const availableWidth = containerWidth - 32;
      return availableWidth / pageWidth;
    } else if (zoom === 'fit-height' && containerHeight > 0 && pageHeight > 0) {
      const availableHeight = containerHeight - 100;
      return availableHeight / pageHeight;
    }
    return 1;
  }, [zoom, containerWidth, containerHeight, pageWidth, pageHeight]);

  return (
    <div
      ref={containerRef}
      className="bg-white shadow-lg rounded mb-4 overflow-hidden"
      onDoubleClick={handlePageDoubleClick}
      onClick={handleAnnotationClick}
      style={{ cursor: onInverseSearch ? 'crosshair' : 'default' }}
    >
      <Page
        pageNumber={pageNum}
        scale={actualZoom}
        onLoadSuccess={(p: PDFPageProxy) => {
          pageProxyRef.current.set(pageNum, p);
          if (p.getViewport) {
            const viewport = p.getViewport({ scale: 1 });
            setPageHeight(viewport.height);
            setPageWidth(viewport.width);
          }
        }}
        renderAnnotationLayer={true}
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
});

export default PDFPage;
