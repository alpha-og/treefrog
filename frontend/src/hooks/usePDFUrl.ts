import { useState, useEffect } from 'react';
import { getWailsApp } from '../services/api';
import { isWails } from '../utils/env';

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
        if (isWails()) {
          // Wails mode: Get PDF content via Go bindings and create blob URL
          const app = getWailsApp();
          if (!app) {
            throw new Error('Wails app not available');
          }

          const content = await app.GetPDFContent();
          
          // Create blob from PDF bytes
          const blob = new Blob([content], { type: 'application/pdf' });
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
        } else {
          // Web mode: Use HTTP URL directly
          setPdfUrl(`${apiUrl}/export/pdf?ts=${pdfKey}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();

    // Cleanup: Revoke blob URL when component unmounts or key changes
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [apiUrl, pdfKey]);

  return { pdfUrl, loading, error };
}
