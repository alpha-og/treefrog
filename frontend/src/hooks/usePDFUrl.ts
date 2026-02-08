import { useState, useEffect } from 'react';
import { isWails } from '../utils/env';
import * as App from 'wailsjs/go/main/App';
import { createLogger } from '../utils/logger';

const log = createLogger('usePDFUrl');

/**
 * Hook to get a PDF URL that works in both web and Wails desktop modes.
 * 
 * For web: Returns the HTTP URL directly
 * For Wails: Fetches PDF content via Go bindings and creates a blob URL
 * 
 * @param apiUrl - The API URL for web mode
 * @param pdfKey - A key to force reload when PDF changes
 * @returns Object with pdfUrl, loading state, and error state
 */
export function usePDFUrl(apiUrl: string, pdfKey: number): {
  pdfUrl: string | null;
  loading: boolean;
  error: string | null;
} {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        const wailsMode = isWails();
        log.debug(`Loading PDF - Wails mode: ${wailsMode}, pdfKey: ${pdfKey}`);

        if (wailsMode) {
          // Wails mode: Get PDF content via Go bindings and create blob URL
          try {
            log.debug('Calling App.GetPDFContent()');
            const base64Content = await App.GetPDFContent();
            log.debug(`Got PDF content, length: ${base64Content?.length || 0}`);
            
            if (!base64Content) {
              throw new Error('No PDF content returned from backend');
            }
            
            // Decode base64 to binary
            log.debug('Decoding base64 content');
            const binaryString = atob(base64Content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create blob from decoded bytes
            log.debug(`Creating blob with ${bytes.length} bytes`);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            objectUrl = URL.createObjectURL(blob);
            log.info(`PDF loaded successfully via Wails: ${objectUrl}`);
            setPdfUrl(objectUrl);
          } catch (wailerr) {
            const errMsg = wailerr instanceof Error ? wailerr.message : 'Unknown error';
            log.error(`Wails error: ${errMsg}`, wailerr);
            throw new Error(`Wails error: ${errMsg}`);
          }
        } else {
          // Web mode: Use HTTP URL directly
          const url = `${apiUrl}/export/pdf?ts=${pdfKey}`;
          log.info(`Using HTTP URL for PDF: ${url}`);
          setPdfUrl(url);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load PDF';
        log.error(`PDF loading failed: ${errorMsg}`, err);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    // Cleanup: Revoke blob URL when component unmounts or key changes
    return () => {
      if (objectUrl) {
        log.debug(`Revoking blob URL: ${objectUrl}`);
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [apiUrl, pdfKey]);

  return { pdfUrl, loading, error };
}
