import { Page } from "react-pdf";

interface PDFPageProps {
  pageNum: number;
  zoom: number;
  pageProxyRef: React.MutableRefObject<Map<number, any>>;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
}

export default function PDFPage({
  pageNum,
  zoom,
  pageProxyRef,
  registerPageRef,
}: PDFPageProps) {
  return (
    <div
      ref={(el) => registerPageRef(pageNum, el)}
      className="bg-white shadow-lg rounded mb-4 overflow-hidden"
    >
      <Page
        pageNumber={pageNum}
        scale={zoom}
        onLoadSuccess={(p: any) => pageProxyRef.current.set(pageNum, p)}
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
