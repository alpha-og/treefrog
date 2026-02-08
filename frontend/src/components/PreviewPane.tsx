import { useState } from "react";
import PDFPreview from "./PDF/PDFPreview";
import { BuildStatus } from "../types";
import {
  ChevronUp,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Download,
  FileArchive,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import { ZOOM_LEVELS } from "../constants";
import { usePDFUrl } from "../hooks/usePDFUrl";
import { isWails } from "../utils/env";
import { getBuildLog, exportPDFFile, exportSourceFile } from "../services/buildService";

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

  const handleViewLog = async () => {
    if (isWails()) {
      setLogLoading(true);
      try {
        const log = await getBuildLog();
        setLogContent(log || "No log available");
        setShowLog(true);
      } catch (err) {
        console.error("Failed to load log:", err);
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
        console.error("Failed to export PDF:", err);
      }
    }
  };

  const handleExportSource = async () => {
    if (isWails()) {
      try {
        await exportSourceFile();
      } catch (err) {
        console.error("Failed to export source:", err);
      }
    }
  };

  return (
    <section className="h-full flex flex-col bg-base-100 border-l border-base-content/5 relative overflow-hidden">
      {/* Background gradient accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl -mb-32 -ml-32"></div>
      </div>

      {/* Header with Status */}
      <div className="border-b border-base-content/5 px-6 py-4 flex items-center justify-between bg-gradient-to-r from-base-100/80 to-transparent backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText size={18} className="text-primary" />
          </div>
          <span className="font-semibold text-base text-base-content">Preview</span>
        </div>
        
        {/* Status Indicator */}
        {buildStatus && (
          <div className="flex items-center gap-3">
            {buildStatus.state === "success" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/15 border border-success/30 text-success shadow-sm">
                <CheckCircle2 size={16} className="shrink-0" />
                <span className="text-sm font-medium">Ready</span>
              </div>
            )}
            {buildStatus.state === "building" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/15 border border-warning/30 text-warning animate-pulse shadow-sm">
                <Zap size={16} className="shrink-0 animate-spin" style={{ animationDuration: '1.5s' }} />
                <span className="text-sm font-medium">Building...</span>
              </div>
            )}
            {buildStatus.state === "error" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/15 border border-error/30 text-error shadow-sm">
                <XCircle size={16} className="shrink-0" />
                <span className="text-sm font-medium">Failed</span>
              </div>
            )}
            {buildStatus.state === "running" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-info/15 border border-info/30 text-info animate-pulse shadow-sm">
                <Loader2 size={16} className="shrink-0 animate-spin" />
                <span className="text-sm font-medium">Running</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {buildStatus?.state === "error" && (
        <div className="mx-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10">
          <div className="p-4 rounded-xl bg-error/10 border border-error/30 border-l-4 border-l-error flex gap-3">
            <XCircle size={20} className="shrink-0 text-error mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-error mb-1">Build Failed</h3>
              <p className="text-xs text-error/80 break-words leading-relaxed">
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
          <div className="bg-base-100 rounded-2xl shadow-2xl p-6 max-w-3xl w-full max-h-[80vh] flex flex-col m-4 border border-base-content/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText size={18} className="text-primary" />
                </div>
                <h3 className="font-bold text-lg">Build Log</h3>
              </div>
              <button onClick={() => setShowLog(false)} className="btn btn-sm btn-ghost hover:bg-base-200">
                ✕
              </button>
            </div>
            <pre className="bg-base-200/50 p-4 rounded-lg overflow-auto flex-1 text-xs font-mono whitespace-pre-wrap text-base-content/80 border border-base-content/5">
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

      {/* Control Toolbar */}
      <div className="toolbar bg-gradient-to-r from-base-100/80 via-base-100/60 to-transparent border-b border-base-content/5 px-4 py-3 flex items-center justify-between gap-4 flex-wrap backdrop-blur-sm relative z-10">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2 bg-base-200/40 backdrop-blur-sm rounded-lg p-2 border border-base-content/5 hover:border-primary/20 transition-all duration-200">
          <button
            onClick={() => onZoomChange(clampZoom(zoom - 0.2))}
            className="p-2 rounded-md hover:bg-primary/15 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom out"
            disabled={zoom <= 0.6}
          >
            <ZoomOut
              size={16}
              className="text-base-content/70 group-hover:text-primary group-hover:scale-110 transition-all"
            />
          </button>
          <select
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="select select-sm bg-transparent border-0 font-mono text-sm px-2 py-1 min-w-[70px] text-base-content/80 focus:outline-none hover:bg-base-300/20 transition-colors"
          >
            {ZOOM_LEVELS.map((z) => (
              <option key={z} value={z}>
                {Math.round(z * 100)}%
              </option>
            ))}
          </select>
          <button
            onClick={() => onZoomChange(clampZoom(zoom + 0.2))}
            className="p-2 rounded-md hover:bg-primary/15 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom in"
            disabled={zoom >= 2.4}
          >
            <ZoomIn
              size={16}
              className="text-base-content/70 group-hover:text-primary group-hover:scale-110 transition-all"
            />
          </button>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2 bg-base-200/40 backdrop-blur-sm rounded-lg p-2 border border-base-content/5 hover:border-primary/20 transition-all duration-200">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="p-2 rounded-md hover:bg-primary/15 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage <= 1}
            title="Previous page"
          >
            <ChevronUp size={16} className="text-base-content/70 group-hover:text-primary transition-colors" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <input
              type="number"
              min="1"
              max={numPages}
              value={currentPage}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= numPages) {
                  onPageChange(val);
                }
              }}
              className="w-10 text-center font-mono text-sm bg-transparent border-0 focus:outline-none text-base-content"
            />
            <span className="text-sm text-base-content/60">/</span>
            <span className="text-sm text-base-content/80 font-mono w-10 text-center">
              {numPages}
            </span>
          </div>
          <button
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            className="p-2 rounded-md hover:bg-primary/15 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentPage >= numPages}
            title="Next page"
          >
            <ChevronDown size={16} className="text-base-content/70 group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* Export Actions */}
        <div className="flex gap-2">
          {isWails() ? (
            <>
              <button
                onClick={handleExportPDF}
                className="px-3 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/20 hover:border-primary/40 transition-all duration-200 flex items-center gap-2 group"
                title="Export PDF"
              >
                <Download
                  size={16}
                  className="text-primary group-hover:translate-y-0.5 transition-transform"
                />
                <span className="text-xs hidden sm:inline font-medium text-primary">PDF</span>
              </button>
              <button
                onClick={handleExportSource}
                className="px-3 py-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 border border-secondary/20 hover:border-secondary/40 transition-all duration-200 flex items-center gap-2 group"
                title="Export source files"
              >
                <FileArchive
                  size={16}
                  className="text-secondary group-hover:scale-110 transition-transform"
                />
                <span className="text-xs hidden sm:inline font-medium text-secondary">Source</span>
              </button>
            </>
          ) : (
            <>
              <a
                href={`${apiUrl}/export/pdf`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-primary/15 hover:bg-primary/25 border border-primary/20 hover:border-primary/40 transition-all duration-200 flex items-center gap-2 group"
                title="Download PDF"
              >
                <Download
                  size={16}
                  className="text-primary group-hover:translate-y-0.5 transition-transform"
                />
                <span className="text-xs hidden sm:inline font-medium text-primary">PDF</span>
              </a>
              <a
                href={`${apiUrl}/export/source-zip`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg bg-secondary/15 hover:bg-secondary/25 border border-secondary/20 hover:border-secondary/40 transition-all duration-200 flex items-center gap-2 group"
                title="Download source files"
              >
                <FileArchive
                  size={16}
                  className="text-secondary group-hover:scale-110 transition-transform"
                />
                <span className="text-xs hidden sm:inline font-medium text-secondary">Source</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto min-h-0 bg-gradient-to-br from-base-100 via-base-200/30 to-base-100 relative z-0">
        {projectRoot ? (
          buildStatus?.state === "building" ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/50 gap-4 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-warning/20 rounded-full blur-2xl animate-pulse"></div>
                <Loader2 size={56} className="animate-spin text-warning relative" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-base-content/80">Compiling LaTeX...</p>
                <p className="text-xs text-base-content/50 mt-2">This may take a moment</p>
              </div>
            </div>
          ) : pdfUrl && !pdfError ? (
            <PDFPreview
              url={pdfUrl}
              onNumPagesChange={onNumPagesChange}
              currentPage={currentPage}
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
                  {pdfError instanceof Error ? pdfError.message : "An error occurred while loading the preview"}
                </p>
              </div>
            </div>
          ) : null
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-base-content/50 gap-4">
            <div className="p-4 rounded-full bg-base-content/10">
              <FileText size={48} />
            </div>
            <div className="text-center">
              <p className="font-medium">No project selected</p>
              <p className="text-sm text-base-content/60 mt-2">Choose a folder to get started</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
