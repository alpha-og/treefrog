import { useState, useRef, useCallback, useMemo, memo } from "react";
import { Page } from "react-pdf";
import type { PDFPageProxy } from "pdfjs-dist";

const PAGE_HEIGHT_ESTIMATE = 800;

interface VirtualPDFPageProps {
  pageNum: number;
  zoom: number | string;
  pageProxyRef: React.MutableRefObject<Map<number, PDFPageProxy>>;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
  containerWidth: number;
  containerHeight: number;
  onInverseSearch?: (page: number, x: number, y: number) => void;
  onPageNavigate?: (page: number) => void;
  isVisible: boolean;
  onPageLoad: (pageNum: number, width: number, height: number) => void;
  pageDimensions: { width: number; height: number } | null;
}

const VirtualPDFPage = memo(function VirtualPDFPage({
  pageNum,
  zoom,
  pageProxyRef,
  registerPageRef,
  containerWidth,
  containerHeight,
  onInverseSearch,
  onPageNavigate,
  isVisible,
  onPageLoad,
  pageDimensions,
}: VirtualPDFPageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Calculate estimated height based on zoom
  const estimatedHeight = useMemo(() => {
    const actualZoom = typeof zoom === 'number' ? zoom : 1;
    return PAGE_HEIGHT_ESTIMATE * actualZoom + 40;
  }, [zoom]);

  // Calculate actual zoom
  const actualZoom = useMemo(() => {
    if (typeof zoom === 'number') return zoom;
    if (pageDimensions && containerWidth > 0) {
      if (zoom === 'fit-width') {
        return (containerWidth - 32) / pageDimensions.width;
      }
      if (zoom === 'fit-height' && containerHeight > 0) {
        return (containerHeight - 100) / pageDimensions.height;
      }
    }
    return 1;
  }, [zoom, pageDimensions, containerWidth, containerHeight]);

  // Only render the actual Page when visible or already loaded
  const shouldRenderPage = isVisible || isLoaded;

  const handleRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
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

    const pdfX = clickX / actualZoom;
    const pdfY = viewport.height - (clickY / actualZoom);

    onInverseSearch(pageNum, pdfX, pdfY);
  }, [pageNum, actualZoom, onInverseSearch, pageProxyRef]);

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

  // Calculate actual height if we have dimensions
  const actualHeight = pageDimensions 
    ? pageDimensions.height * actualZoom + 40 
    : estimatedHeight;

  return (
    <div
      ref={handleRef}
      data-pdf-page={pageNum}
      className="bg-white shadow-lg rounded mb-4 overflow-hidden"
      onDoubleClick={handlePageDoubleClick}
      onClick={handleAnnotationClick}
      style={{ 
        cursor: onInverseSearch ? 'crosshair' : 'default',
        minHeight: actualHeight,
      }}
    >
      {shouldRenderPage ? (
        <Page
          pageNumber={pageNum}
          scale={actualZoom}
          onLoadSuccess={(p: PDFPageProxy) => {
            pageProxyRef.current.set(pageNum, p);
            setIsLoaded(true);
            if (p.getViewport) {
              const viewport = p.getViewport({ scale: 1 });
              onPageLoad(pageNum, viewport.width, viewport.height);
            }
          }}
          renderAnnotationLayer={true}
          renderTextLayer={false}
          loading={
            <div className="flex items-center justify-center p-8" style={{ minHeight: actualHeight - 40 }}>
              <span className="loading loading-spinner loading-md"></span>
            </div>
          }
        />
      ) : (
        <div 
          className="flex items-center justify-center bg-muted/20"
          style={{ minHeight: actualHeight - 40 }}
        >
          <span className="text-muted-foreground text-sm">Page {pageNum}</span>
        </div>
      )}
      <div className="text-center text-xs text-foreground/50 py-1 bg-muted">
        Page {pageNum}
      </div>
    </div>
  );
});

export default VirtualPDFPage;
