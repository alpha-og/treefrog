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

  return (
    <section className="h-full flex flex-col bg-base-100 border-l border-base-300">
      {/* Header with Status */}
      <div className="border-b border-base-300 px-4 py-3 flex items-center justify-between bg-base-200/50">
        <div className="flex items-center gap-3">
          <FileText size={16} className="text-base-content/60" />
          <span className="font-medium text-sm">Preview</span>
        </div>
        
        {/* Status Indicator */}
        {buildStatus && (
          <div className="flex items-center gap-2">
            {buildStatus.state === "success" && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-success/10 text-success">
                <CheckCircle2 size={14} className="shrink-0" />
                <span className="text-xs font-medium">Ready</span>
              </div>
            )}
            {buildStatus.state === "building" && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-warning/10 text-warning animate-pulse">
                <Zap size={14} className="shrink-0 animate-spin" style={{ animationDuration: '1.5s' }} />
                <span className="text-xs font-medium">Building...</span>
              </div>
            )}
            {buildStatus.state === "error" && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-error/10 text-error">
                <XCircle size={14} className="shrink-0" />
                <span className="text-xs font-medium">Failed</span>
              </div>
            )}
            {buildStatus.state === "running" && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-info/10 text-info">
                <Loader2 size={14} className="shrink-0 animate-spin" />
                <span className="text-xs font-medium">Running</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Messages */}
      {buildStatus?.state === "error" && (
        <div className="mx-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-3 rounded-lg bg-error/10 border border-error/20 flex gap-3">
            <XCircle size={18} className="shrink-0 text-error mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-error mb-1">Build Failed</h3>
              <p className="text-xs text-error/80 break-words">
                {buildStatus.message || "Unknown error occurred"}
              </p>
              <a
                href={`${apiUrl}/build/log`}
                target="_blank"
                rel="noreferrer"
                className="link link-hover text-xs mt-2 inline-flex items-center gap-1 text-error/70 hover:text-error"
              >
                <FileText size={12} />
                View full log
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Building Progress Indicator */}
      {buildStatus?.state === "building" && (
        <div className="mx-4 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex gap-3">
            <Loader2 size={18} className="shrink-0 text-warning mt-0.5 animate-spin" />
            <div>
              <p className="text-sm font-medium text-warning-content">Compiling LaTeX document...</p>
              <p className="text-xs text-warning-content/70 mt-1">This may take a moment</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar bg-base-200/30 border-b border-base-300 px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onZoomChange(clampZoom(zoom - 0.2))}
            className="btn btn-sm btn-ghost gap-1.5 group"
            title="Zoom out"
            disabled={zoom <= 0.6}
          >
            <ZoomOut
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
          </button>
          <select
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="select select-sm select-bordered w-24 font-mono text-xs"
          >
            {ZOOM_LEVELS.map((z) => (
              <option key={z} value={z}>
                {Math.round(z * 100)}%
              </option>
            ))}
          </select>
          <button
            onClick={() => onZoomChange(clampZoom(zoom + 0.2))}
            className="btn btn-sm btn-ghost gap-1.5 group"
            title="Zoom in"
            disabled={zoom >= 2.4}
          >
            <ZoomIn
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
          </button>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="btn btn-sm btn-ghost"
            disabled={currentPage <= 1}
            title="Previous page"
          >
            <ChevronUp size={16} />
          </button>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-base-300/30 rounded-lg">
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
              className="input input-sm input-ghost w-12 text-center font-mono text-xs p-0 h-6"
            />
            <span className="text-xs text-base-content/60">/</span>
            <span className="text-xs text-base-content/80 font-mono min-w-[1.5rem] text-center">
              {numPages}
            </span>
          </div>
          <button
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            className="btn btn-sm btn-ghost"
            disabled={currentPage >= numPages}
            title="Next page"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Export Actions */}
        <div className="flex gap-1.5">
          <a
            href={`${apiUrl}/export/pdf`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-ghost gap-1.5 group"
            title="Download PDF"
          >
            <Download
              size={14}
              className="group-hover:translate-y-0.5 transition-transform"
            />
            <span className="text-xs hidden sm:inline">PDF</span>
          </a>
          <a
            href={`${apiUrl}/export/source-zip`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-ghost gap-1.5 group"
            title="Download source files"
          >
            <FileArchive
              size={14}
              className="group-hover:scale-110 transition-transform"
            />
            <span className="text-xs hidden sm:inline">Source</span>
          </a>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto min-h-0 bg-gradient-to-br from-base-300 to-base-200">
        {projectRoot ? (
          buildStatus?.state === "building" ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/50 gap-4 animate-in fade-in duration-500">
              <Loader2 size={48} className="animate-spin text-warning" />
              <div className="text-center">
                <p className="font-medium">Compiling LaTeX...</p>
                <p className="text-sm text-base-content/40 mt-1">Please wait</p>
              </div>
            </div>
          ) : pdfLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/50 gap-4 animate-in fade-in duration-500">
              <Loader2 size={48} className="animate-spin text-info" />
              <div className="text-center">
                <p className="font-medium">Loading PDF...</p>
              </div>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center h-full text-base-content/50 gap-4 animate-in fade-in duration-500">
              <AlertCircle size={48} className="text-error" />
              <div className="text-center">
                <p className="font-medium text-error">Failed to load PDF</p>
                <p className="text-sm text-base-content/40 mt-1">{pdfError}</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <PDFPreview
              key={pdfKey}
              url={pdfUrl}
              zoom={zoom}
              numPages={numPages}
              onPageCount={onNumPagesChange}
              registerPageRef={registerPageRef}
              pageProxyRef={pageProxyRef}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-base-content/50 gap-4 animate-in fade-in duration-500">
              <FileText size={48} className="opacity-30" />
              <div className="text-center">
                <p className="font-medium text-base-content/60">
                  No PDF Available
                </p>
                <p className="text-sm mt-1">Build the project to generate a preview</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-base-content/40 gap-4 animate-in fade-in duration-500">
            <FileText size={48} className="opacity-30" />
            <div className="text-center">
              <p className="font-medium text-base-content/60">
                No Project Selected
              </p>
              <p className="text-sm mt-1">Open a project to see the preview</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
