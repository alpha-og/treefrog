import { Page } from "react-pdf";

interface PDFPageProps {
  pageNum: number;
  zoom: number;
  pageProxyRef: React.MutableRefObject<Map<number, any>>;
  registerPageRef: (page: number, el: HTMLDivElement | null) => void;
  onClickSync: (page: number, x: number, y: number) => Promise<void>;
}

export default function PDFPage({
  pageNum,
  zoom,
  pageProxyRef,
  registerPageRef,
  onClickSync,
}: PDFPageProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Convert screen pixels to PDF points
    // react-pdf renders at scale where 1 PDF point = 1 CSS pixel at scale 1.0
    const xPdfPts = (e.clientX - rect.left) / zoom;
    
    // Y needs to be flipped: PDF origin is at bottom-left, screen is top-left
    // Get the page height from the proxy (in PDF points)
    const pageProxy = pageProxyRef.current.get(pageNum);
    const pageHeight = pageProxy?.height || (rect.height / zoom);
    const yFromTop = (e.clientY - rect.top) / zoom;
    const yPdfPts = pageHeight - yFromTop;
    
    onClickSync(pageNum, xPdfPts, yPdfPts);
  };

  return (
    <div
      ref={(el) => registerPageRef(pageNum, el)}
      className="bg-white shadow-lg rounded mb-4 overflow-hidden cursor-pointer"
      onClick={handleClick}
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
      <div className="text-center text-xs text-base-content/50 py-1 bg-base-200">
        Page {pageNum}
      </div>
    </div>
  );
}
