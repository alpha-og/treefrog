import { useState, useEffect } from "react";
import { Document } from "react-pdf";
import PDFPage from "./PDFPage";

export default function PDFPreview(props: any) {
  const [error, setError] = useState("");

  useEffect(() => setError(""), [props.url]);

  if (error)
    return <div className="empty">{error}</div>;

  return (
    <div className="pdf">
      <Document
        file={props.url}
        onLoadSuccess={(d: any) => props.onPageCount(d.numPages)}
        onLoadError={() => setError("Failed to load PDF")}
      >
        {Array.from({ length: props.numPages }, (_, i) => i + 1)
          .map(p => (
            <PDFPage
              key={p}
              pageNum={p}
              {...props}
            />
          ))}
      </Document>
    </div>
  );
}
