import PDFPreview from "./PDF/PDFPreview";
import { BuildStatus } from "../types";
import { ChevronUp, ChevronDown } from "lucide-react";
import { ZOOM_LEVELS } from "../constants";

interface PreviewPaneProps {
  apiUrl: string;
  buildStatus: BuildStatus | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  numPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  projectRoot: string;
  pdfKey: number;
  pageProxyRef: React.MutableRefObject<Map<number, any>>;
  onClickSync: (page: number, x: number, y: number) => Promise<void>;
  onKeyShortcut: (e: React.KeyboardEvent) => void;
  syncTarget: { page: number; x: number; y: number; file: string; line: number } | null;
  onSyncScroll: (page: number) => void;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
}

export default function PreviewPane({
  apiUrl,
  buildStatus,
  zoom,
  onZoomChange,
  numPages,
  currentPage,
  onPageChange,
  projectRoot,
  pdfKey,
  pageProxyRef,
  onClickSync,
  onKeyShortcut,
  syncTarget,
  onSyncScroll,
  registerPageRef,
}: PreviewPaneProps) {
  const clampZoom = (z: number) => Math.min(2.4, Math.max(0.6, Math.round(z * 10) / 10));

  return (
    <section className="preview flex-1 flex flex-col bg-base-100 border-l border-base-300">
      {/* Header */}
      <div className="border-b border-base-300 px-4 py-3 flex items-center justify-between">
        <div className="font-semibold text-sm flex items-center gap-2">
          Preview
          <span className={`badge ${buildStatus?.state === "success" ? "badge-success" : buildStatus?.state === "error" ? "badge-error" : buildStatus?.state === "building" ? "badge-warning" : "badge-ghost"}`}>
            {buildStatus?.state || "idle"}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {buildStatus?.state === "error" && (
        <div className="alert alert-error m-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m2-2l2 2m1-11a9 9 0 110 18 9 9 0 010-18z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Build failed</h3>
            <div className="text-sm">{buildStatus.message || "Unknown error"}</div>
            <a
              href={`${apiUrl}/build/log`}
              target="_blank"
              rel="noreferrer"
              className="link link-sm"
            >
              View full log
            </a>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar bg-base-200 border-b border-base-300 px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onZoomChange(clampZoom(zoom - 0.2))}
            className="btn btn-sm btn-ghost"
          >
            −
          </button>
          <select
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="select select-sm select-bordered w-20"
          >
            {ZOOM_LEVELS.map((z) => (
              <option key={z} value={z}>
                {Math.round(z * 100)}%
              </option>
            ))}
          </select>
          <button
            onClick={() => onZoomChange(clampZoom(zoom + 0.2))}
            className="btn btn-sm btn-ghost"
          >
            +
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            className="btn btn-sm btn-ghost"
          >
            <ChevronUp size={16} />
          </button>
          <input
            type="number"
            min="1"
            max={numPages}
            value={currentPage}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="input input-sm input-bordered w-16 text-center"
          />
          <span className="text-sm">/ {numPages}</span>
          <button
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            className="btn btn-sm btn-ghost"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="flex gap-2">
          <a
            href={`${apiUrl}/export/pdf`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-ghost"
          >
            Export PDF
          </a>
          <a
            href={`${apiUrl}/export/source-zip`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-ghost"
          >
            Export Source
          </a>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto">
        {projectRoot ? (
          <PDFPreview
            key={pdfKey}
            url={`${apiUrl}/export/pdf?ts=${pdfKey}`}
            zoom={zoom}
            numPages={numPages}
            onPageCount={() => {}}
            registerPageRef={registerPageRef}
            pageProxyRef={pageProxyRef}
            onKeyShortcut={onKeyShortcut}
            onClickSync={onClickSync}
            syncTarget={syncTarget}
            onSyncScroll={onSyncScroll}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-base-content/50">
            Select a project to see preview
          </div>
        )}
      </div>
    </section>
  );
}
