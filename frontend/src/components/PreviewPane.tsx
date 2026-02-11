import { useState, useEffect, useRef } from "react";
import PDFPreview from "./PDF/PDFPreview";
import { BuildStatus } from "../types";
import { createLogger } from "../utils/logger";
import {
  ZoomIn,
  ZoomOut,
  Download,
  FileArchive,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import { ZOOM_LEVELS } from "../constants";
import { usePDFUrl } from "../hooks/usePDFUrl";
import { isWails } from "../utils/env";
import { getBuildLog, exportPDFFile, exportSourceFile } from "../services/buildService";
import {
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContentWrapper,
  MenuItem,
  DropdownMenuSeparator,
  MenuIcon,
} from "@/components/common/Menu";
import { Button } from "@/components/common/Button";

const log = createLogger("PreviewPane");

interface PreviewPaneProps {
  apiUrl: string;
  buildStatus: BuildStatus | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  numPages: number;
  onNumPagesChange: (numPages: number) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  projectRoot: string;
  pdfKey: number;
  pageProxyRef: React.MutableRefObject<Map<number, any>>;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
}

export default function PreviewPane({
  apiUrl,
  buildStatus,
  zoom,
  onZoomChange,
  numPages,
  onNumPagesChange,
  currentPage,
  onPageChange,
  projectRoot,
  pdfKey,
  pageProxyRef,
  registerPageRef,
}: PreviewPaneProps) {
  const clampZoom = (z: number) =>
    Math.min(2.4, Math.max(0.6, Math.round(z * 10) / 10));

  // Get PDF URL that works in both web and Wails modes
  const { pdfUrl, loading: pdfLoading, error: pdfError } = usePDFUrl(apiUrl, pdfKey);
  
   // Log viewer state for desktop mode
   const [showLog, setShowLog] = useState(false);
   const [logContent, setLogContent] = useState("");
   const [logLoading, setLogLoading] = useState(false);
   const [isEditingPage, setIsEditingPage] = useState(false);
   const [pageInput, setPageInput] = useState(currentPage.toString());
   const [displayPage, setDisplayPage] = useState(currentPage);
   const pdfViewerRef = useRef<HTMLDivElement>(null);
   const currentPageRef = useRef(currentPage);

   // Keep currentPage ref and displayPage in sync
   useEffect(() => {
     currentPageRef.current = currentPage;
     setDisplayPage(currentPage);
     if (!isEditingPage) {
       setPageInput(currentPage.toString());
     }
   }, [currentPage, isEditingPage]);

   // Track current page based on scroll position (display only, no snapping)
   useEffect(() => {
     const container = pdfViewerRef.current;
     if (!container) return;

      let timeout: ReturnType<typeof setTimeout>;
     
     const handleScroll = () => {
       if (!pdfViewerRef.current) return;

       const container = pdfViewerRef.current;
       const containerRect = container.getBoundingClientRect();
       const viewportCenter = containerRect.height / 2;

       // Find all page divs - they have the registerPageRef assigned to them
       const pageDivs: HTMLElement[] = [];
       const walker = document.createTreeWalker(
         container,
         NodeFilter.SHOW_ELEMENT,
         {
           acceptNode: (node: Element) => {
             if (
               node instanceof HTMLElement &&
               node.className.includes("shadow-lg") &&
               node.className.includes("bg-white")
             ) {
               return NodeFilter.FILTER_ACCEPT;
             }
             return NodeFilter.FILTER_SKIP;
           },
         }
       );

       let currentNode;
       while ((currentNode = walker.nextNode())) {
         pageDivs.push(currentNode as HTMLElement);
       }

       if (pageDivs.length === 0) return;

       // Find the page closest to the viewport center
       let closestPage = 1;
       let minDistance = Infinity;

       pageDivs.forEach((el, index) => {
         const rect = el.getBoundingClientRect();
         const elementCenter = rect.top - containerRect.top + rect.height / 2;
         const distance = Math.abs(elementCenter - viewportCenter);

         if (distance < minDistance) {
           minDistance = distance;
           closestPage = index + 1;
         }
       });

       // Only update display page if it changed (no scroll snapping)
       setDisplayPage(closestPage);
     };

     // Debounce scroll events slightly
     const debouncedScroll = () => {
       clearTimeout(timeout);
       timeout = setTimeout(handleScroll, 30);
     };

     container.addEventListener("scroll", debouncedScroll);
     
     return () => {
       container.removeEventListener("scroll", debouncedScroll);
       clearTimeout(timeout);
     };
   }, []);

  const handleViewLog = async () => {
    if (isWails()) {
      setLogLoading(true);
      try {
        const log = await getBuildLog();
        setLogContent(log || "No log available");
        setShowLog(true);
       } catch (err) {
         log.error("Failed to load build log", err);
         setLogContent("Failed to load build log");
        setShowLog(true);
      } finally {
        setLogLoading(false);
      }
    }
  };

  const handleExportPDF = async () => {
    if (isWails()) {
      try {
        await exportPDFFile();
       } catch (err) {
         log.error("Failed to export PDF", err);
       }
    }
  };

  const handleExportSource = async () => {
    if (isWails()) {
      try {
        await exportSourceFile();
       } catch (err) {
         log.error("Failed to export source", err);
      }
    }
  };

  return (
    <section className="h-full flex flex-col bg-card border-l border-border relative overflow-hidden">
      {/* Background gradient accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mb-32 -ml-32"></div>
      </div>

      {/* Header with Controls - All in one line */}
       <div className="border-b border-border px-4 py-2 flex items-center justify-between gap-2 bg-linear-to-r from-card/80 to-transparent backdrop-blur-sm relative z-10">
        {/* Left: Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <FileText size={16} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground whitespace-nowrap">Preview</span>
        </div>

        {/* Center: Zoom + Page Navigation + Status */}
        <div className="flex items-center gap-1.5 justify-center overflow-auto">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1.5 border border-border hover:border-primary/20 transition-all duration-200 shrink-0">
            <button
              onClick={() => onZoomChange(clampZoom(zoom - 0.2))}
              className="p-1 rounded-md hover:bg-primary/15 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom out"
              disabled={zoom <= 0.6}
            >
              <ZoomOut
                size={14}
                className="text-foreground/70 group-hover:text-primary transition-all"
              />
            </button>
            <select
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
               className="bg-transparent border-0 font-mono text-xs px-1.5 py-0.5 min-w-11 text-foreground/80 focus:outline-none hover:bg-accent/20 transition-colors appearance-none cursor-pointer"
            >
              {ZOOM_LEVELS.map((z) => (
                <option key={z} value={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
            </select>
            <button
              onClick={() => onZoomChange(clampZoom(zoom + 0.2))}
              className="p-1 rounded-md hover:bg-primary/15 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom in"
              disabled={zoom >= 2.4}
            >
              <ZoomIn
                size={14}
                className="text-foreground/70 group-hover:text-primary transition-all"
              />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-base-content/10 shrink-0"></div>

          {/* Page Counter */}
          <div 
            className="flex items-center gap-1 px-2.5 py-1.5 bg-muted/40 rounded-lg border border-border shrink-0 cursor-pointer hover:border-base-content/20 transition-all"
            onClick={() => setIsEditingPage(true)}
            title="Click to jump to a page"
          >
            {isEditingPage ? (
              <input
                type="number"
                min="1"
                max={numPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => {
                  const page = Math.min(Math.max(1, parseInt(pageInput) || currentPage), numPages);
                  onPageChange(page);
                  setIsEditingPage(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const page = Math.min(Math.max(1, parseInt(pageInput) || currentPage), numPages);
                    onPageChange(page);
                    setIsEditingPage(false);
                  } else if (e.key === "Escape") {
                    setPageInput(currentPage.toString());
                    setIsEditingPage(false);
                  }
                }}
                className="w-6 text-center font-mono text-xs bg-transparent border-0 focus:outline-none text-foreground font-medium"
                autoFocus
              />
            ) : (
              <span className="text-xs font-medium text-foreground/80 font-mono">{displayPage}</span>
            )}
            <span className="text-xs text-foreground/60">/</span>
            <span className="text-xs text-foreground/80 font-mono">{numPages}</span>
          </div>

          {/* Status Indicator */}
          {buildStatus && (
            <div className="shrink-0">
              {buildStatus.state === "success" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/15 border border-success/30 text-success shadow-sm whitespace-nowrap">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span className="text-xs font-medium">Ready</span>
                </div>
              )}
              {buildStatus.state === "building" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-warning/15 border border-warning/30 text-warning animate-pulse shadow-sm whitespace-nowrap">
                  <Zap size={13} className="shrink-0 animate-spin" style={{ animationDuration: '1.5s' }} />
                  <span className="text-xs font-medium">Building...</span>
                </div>
              )}
              {buildStatus.state === "error" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-error/15 border border-error/30 text-error shadow-sm whitespace-nowrap">
                  <XCircle size={13} className="shrink-0" />
                  <span className="text-xs font-medium">Failed</span>
                </div>
              )}
              {buildStatus.state === "running" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-info/15 border border-info/30 text-info animate-pulse shadow-sm whitespace-nowrap">
                  <Loader2 size={13} className="shrink-0 animate-spin" />
                  <span className="text-xs font-medium">Running</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Export Menu */}
        <DropdownMenuWrapper>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10"
              title="Export options"
            >
              <span className="text-lg">⋮</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContentWrapper align="end" className="w-56">
            {isWails() ? (
              <>
                <MenuItem
                  onClick={handleExportPDF}
                >
                  <MenuIcon name="export-pdf" size={16} />
                  <span className="flex-1">Export PDF</span>
                </MenuItem>
                <MenuItem
                  onClick={handleExportSource}
                >
                  <MenuIcon name="export-source" size={16} />
                  <span className="flex-1">Export Source</span>
                </MenuItem>
              </>
            ) : (
              <>
                <MenuItem
                  onClick={() => {
                    window.open(`${apiUrl}/export/pdf`, "_blank", "noreferrer");
                  }}
                >
                  <MenuIcon name="export-pdf" size={16} />
                  <span className="flex-1">Download PDF</span>
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    window.open(`${apiUrl}/export/source-zip`, "_blank", "noreferrer");
                  }}
                >
                  <MenuIcon name="export-source" size={16} />
                  <span className="flex-1">Download Source</span>
                </MenuItem>
              </>
            )}
          </DropdownMenuContentWrapper>
        </DropdownMenuWrapper>
      </div>

      {/* Status Messages */}
      {buildStatus?.state === "error" && (
        <div className="mx-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
          <div className="p-4 rounded-xl bg-error/10 border border-error/30 border-l-4 border-l-error flex gap-3">
            <XCircle size={20} className="shrink-0 text-error mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-error mb-1">Build Failed</h3>
               <p className="text-xs text-error/80 wrap-break-word leading-relaxed">
                {buildStatus.message || "Unknown error occurred"}
              </p>
              {isWails() ? (
                <button
                  onClick={handleViewLog}
                  disabled={logLoading}
                  className="link link-hover text-xs mt-2 inline-flex items-center gap-1 text-error hover:text-error font-medium"
                >
                  <FileText size={12} />
                  {logLoading ? "Loading..." : "View full log"}
                </button>
              ) : (
                <a
                  href={`${apiUrl}/build/log`}
                  target="_blank"
                  rel="noreferrer"
                  className="link link-hover text-xs mt-2 inline-flex items-center gap-1 text-error hover:text-error font-medium"
                >
                  <FileText size={12} />
                  View full log
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Log Modal for Desktop */}
      {showLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[80vh] flex flex-col m-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText size={18} className="text-primary" />
                </div>
                <h3 className="font-bold text-lg">Build Log</h3>
              </div>
              <button onClick={() => setShowLog(false)} className="btn btn-sm btn-ghost hover:bg-muted">
                ✕
              </button>
            </div>
            <pre className="bg-muted/50 p-4 rounded-lg overflow-auto flex-1 text-xs font-mono whitespace-pre-wrap text-foreground/80 border border-border">
              {logContent}
            </pre>
          </div>
        </div>
      )}

      {/* Building Progress Indicator */}
      {buildStatus?.state === "building" && (
        <div className="mx-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 border-l-4 border-l-warning flex gap-3">
            <Loader2 size={20} className="shrink-0 text-warning mt-0.5 animate-spin" />
            <div>
              <p className="text-sm font-bold text-warning">Compiling LaTeX document...</p>
              <p className="text-xs text-warning/70 mt-1">This may take a moment</p>
            </div>
          </div>
        </div>
      )}



        {/* PDF Viewer */}
         <div ref={pdfViewerRef} className="flex-1 overflow-auto min-h-0 bg-linear-to-br from-card via-muted/30 to-card relative z-0">
         {projectRoot ? (
           buildStatus?.state === "building" ? (
             <div className="flex flex-col items-center justify-center h-full text-foreground/50 gap-4 animate-in fade-in duration-500">
               <div className="relative">
                 <div className="absolute inset-0 bg-warning/20 rounded-full blur-2xl animate-pulse"></div>
                 <Loader2 size={56} className="animate-spin text-warning relative" />
               </div>
               <div className="text-center">
                 <p className="font-semibold text-foreground/80">Compiling LaTeX...</p>
                 <p className="text-xs text-foreground/50 mt-2">This may take a moment</p>
               </div>
             </div>
           ) : pdfLoading ? (
             <div className="flex flex-col items-center justify-center h-full text-foreground/50 gap-4 animate-in fade-in duration-500">
               <div className="relative">
                 <div className="absolute inset-0 bg-info/20 rounded-full blur-2xl animate-pulse"></div>
                 <Loader2 size={56} className="animate-spin text-info relative" />
               </div>
               <div className="text-center">
                 <p className="font-semibold text-foreground/80">Loading PDF...</p>
                 <p className="text-xs text-foreground/50 mt-2">Please wait</p>
               </div>
             </div>
          ) : pdfUrl && !pdfError ? (
              <PDFPreview
                url={pdfUrl}
                numPages={numPages}
                onNumPagesChange={onNumPagesChange}
                zoom={zoom}
                pageProxyRef={pageProxyRef}
                registerPageRef={registerPageRef}
              />
           ) : pdfError ? (
             <div className="flex flex-col items-center justify-center h-full text-error gap-4 animate-in fade-in duration-500">
               <div className="p-4 rounded-full bg-error/20">
                 <XCircle size={48} />
               </div>
               <div className="text-center max-w-sm">
                 <p className="font-semibold text-base text-error/90">Unable to load PDF</p>
                  <p className="text-sm text-error/70 mt-2">
                    {pdfError || "An error occurred while loading the preview"}
                  </p>
               </div>
             </div>
           ) : null
         ) : (
           <div className="flex flex-col items-center justify-center h-full text-foreground/50 gap-4">
             <div className="p-4 rounded-full bg-base-content/10">
               <FileText size={48} />
             </div>
             <div className="text-center">
               <p className="font-medium">No project selected</p>
               <p className="text-sm text-foreground/60 mt-2">Choose a folder to get started</p>
             </div>
           </div>
         )}
       </div>
    </section>
  );
}
