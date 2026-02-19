import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Document } from "react-pdf";
import type { PDFPageProxy, PDFDocumentProxy } from "pdfjs-dist";
import VirtualPDFPage from "./VirtualPDFPage";

interface PageDimensions {
  width: number;
  height: number;
}

interface VirtualPDFPreviewProps {
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

export default function VirtualPDFPreview({
  url,
  zoom,
  numPages,
  onNumPagesChange,
  registerPageRef,
  pageProxyRef,
  onInverseSearch,
  onPageNavigate,
  highlightPosition,
}: VirtualPDFPreviewProps) {
  const [error, setError] = useState("");
  const [internalNumPages, setInternalNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<Map<number, PageDimensions>>(new Map());
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const visiblePagesRef = useRef<Set<number>>(new Set());

  const pagesToRender = useMemo(() => 
    internalNumPages > 0 ? internalNumPages : numPages,
    [internalNumPages, numPages]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setContainerWidth(container.offsetWidth);
    setContainerHeight(container.offsetHeight);

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
          setContainerHeight(containerRef.current.offsetHeight);
        }
      }, 100);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let changed = false;
        
        entries.forEach((entry) => {
          const pageEl = entry.target as HTMLDivElement;
          const pageNum = parseInt(pageEl.dataset.pdfPage || "0", 10);
          
          if (pageNum > 0) {
            if (entry.isIntersecting) {
              if (!visiblePagesRef.current.has(pageNum)) {
                visiblePagesRef.current.add(pageNum);
                changed = true;
              }
            } else {
              if (visiblePagesRef.current.has(pageNum)) {
                visiblePagesRef.current.delete(pageNum);
                changed = true;
              }
            }
          }
        });

        if (changed) {
          setVisiblePages(new Set(visiblePagesRef.current));
        }
      },
      {
        root: containerRef.current,
        rootMargin: "200px 0px",
        threshold: 0.01,
      }
    );

    pageRefsMap.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [pagesToRender]);

  const registerVirtualPageRef = useCallback((page: number, el: HTMLDivElement | null) => {
    if (el) {
      pageRefsMap.current.set(page, el);
      observerRef.current?.observe(el);
    } else {
      const existingEl = pageRefsMap.current.get(page);
      if (existingEl) {
        observerRef.current?.unobserve(existingEl);
      }
      pageRefsMap.current.delete(page);
    }
    registerPageRef(page, el);
  }, [registerPageRef]);

  function handleLoadSuccess(d: PDFDocumentProxy) {
    setInternalNumPages(d.numPages);
    onNumPagesChange(d.numPages);
  }

  const handlePageLoad = useCallback((pageNum: number, width: number, height: number) => {
    setPageDimensions((prev) => {
      const next = new Map(prev);
      next.set(pageNum, { width, height });
      return next;
    });
  }, []);

  const firstPageDimensions = useMemo(() => {
    if (pageDimensions.size > 0) {
      return pageDimensions.get(1) || null;
    }
    return null;
  }, [pageDimensions]);

  const pageArray = useMemo(() => 
    Array.from({ length: pagesToRender }, (_, i) => i + 1),
    [pagesToRender]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-error">
        {error}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="flex flex-col items-center gap-4 p-4 h-full w-full relative overflow-auto"
    >
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
          pageArray.map((pageNum) => {
            const isVisible = visiblePages.has(pageNum);
            
            return (
              <VirtualPDFPage
                key={pageNum}
                pageNum={pageNum}
                zoom={zoom}
                pageProxyRef={pageProxyRef}
                registerPageRef={registerVirtualPageRef}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                onInverseSearch={onInverseSearch}
                onPageNavigate={onPageNavigate}
                isVisible={isVisible}
                onPageLoad={handlePageLoad}
                pageDimensions={firstPageDimensions}
              />
            );
          })
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
