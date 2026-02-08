import { Page } from "react-pdf";

export default function PDFPage({
  pageNum,
  zoom,
  pageProxyRef
}: any) {

  return (
    <div className="pdf-page">
      <Page
        pageNumber={pageNum}
        scale={zoom}
        onLoadSuccess={(p: any) =>
          pageProxyRef.current.set(pageNum, p)
        }
        renderAnnotationLayer={false}
        renderTextLayer={false}
      />
    </div>
  );
}
