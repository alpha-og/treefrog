import { useState, useEffect } from "react";
import { Document } from "react-pdf";
import PDFPage from "./PDFPage";

interface PDFPreviewProps {
  url: string;
  zoom: number;
  numPages: number;
  onPageCount: (numPages: number) => void;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
  pageProxyRef: React.MutableRefObject<Map<number, any>>;
}

export default function PDFPreview({
  url,
  zoom,
  numPages,
  onPageCount,
  registerPageRef,
  pageProxyRef,
}: PDFPreviewProps) {
  const [error, setError] = useState("");

  useEffect(() => setError(""), [url]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-error">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <Document
        file={url}
        onLoadSuccess={(d: any) => onPageCount(d.numPages)}
        onLoadError={() => setError("Failed to load PDF")}
        loading={
          <div className="flex items-center justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
          <PDFPage
            key={pageNum}
            pageNum={pageNum}
            zoom={zoom}
            pageProxyRef={pageProxyRef}
            registerPageRef={registerPageRef}
          />
        ))}
      </Document>
    </div>
  );
}
