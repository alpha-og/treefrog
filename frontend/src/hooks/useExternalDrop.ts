import { useCallback, useState, useEffect } from "react";
import { createLogger } from "../utils/logger";

const log = createLogger("ExternalDrop");

interface UseExternalDropOptions {
  onDropFiles: (files: File[], targetPath: string) => Promise<void>;
  onDropPaths?: (paths: string[], targetPath: string) => Promise<void>;
  acceptedTypes?: string[];
}

interface UseExternalDropReturn {
  isDraggingOver: boolean;
  dropTarget: string | null;
  handleDragEnter: (e: React.DragEvent, targetPath?: string) => void;
  handleDragOver: (e: React.DragEvent, targetPath?: string) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, targetPath?: string) => Promise<void>;
}

export function useExternalDrop(options: UseExternalDropOptions): UseExternalDropReturn {
  const { onDropFiles, onDropPaths, acceptedTypes } = options;
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const isValidDrop = useCallback((e: React.DragEvent): boolean => {
    // Check if dropping files from OS
    const hasFiles = e.dataTransfer.types.includes("Files");
    
    if (!hasFiles) return false;
    
    // If accepted types specified, check file types
    if (acceptedTypes && acceptedTypes.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      return files.some((file) => {
        return acceptedTypes.some((type) => {
          if (type.includes("*")) {
            const prefix = type.replace("/*", "");
            return file.type.startsWith(prefix);
          }
          return file.type === type;
        });
      });
    }
    
    return true;
  }, [acceptedTypes]);

  const handleDragEnter = useCallback((e: React.DragEvent, targetPath?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isValidDrop(e)) {
      setIsDraggingOver(true);
      setDropTarget(targetPath || null);
    }
  }, [isValidDrop]);

  const handleDragOver = useCallback((e: React.DragEvent, targetPath?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isValidDrop(e)) {
      setIsDraggingOver(true);
      setDropTarget(targetPath || null);
      
      // Set drop effect
      e.dataTransfer.dropEffect = "copy";
    }
  }, [isValidDrop]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're really leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDraggingOver(false);
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetPath?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDraggingOver(false);
    setDropTarget(null);
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      log.warn("No files in drop event");
      return;
    }
    
    log.info("Files dropped from OS", { 
      count: files.length, 
      target: targetPath || "root" 
    });
    
    try {
      await onDropFiles(files, targetPath || "");
    } catch (err) {
      log.error("Failed to process dropped files", err);
    }
  }, [onDropFiles]);

  // Prevent default drag behavior on document to allow drops
  useEffect(() => {
    const handleDocumentDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    
    const handleDocumentDrop = (e: DragEvent) => {
      // Only prevent if we're not handling it in a component
      if (!(e.target as HTMLElement).closest("[data-drop-zone]")) {
        e.preventDefault();
      }
    };
    
    document.addEventListener("dragover", handleDocumentDragOver);
    document.addEventListener("drop", handleDocumentDrop);
    
    return () => {
      document.removeEventListener("dragover", handleDocumentDragOver);
      document.removeEventListener("drop", handleDocumentDrop);
    };
  }, []);

  return {
    isDraggingOver,
    dropTarget,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
