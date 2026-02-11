import { useCallback, useState, useRef } from "react";
import { useFileStore } from "../stores/fileStore";
import { isValidDrop } from "../utils/treeUtils";
import { createLogger } from "../utils/logger";

const log = createLogger("TreeDnD");

interface UseTreeDnDOptions {
  onMove: (from: string, to: string) => Promise<void>;
  onCopy?: (from: string, to: string) => Promise<void>;
}

interface UseTreeDnDReturn {
  // State
  activeId: string | null;
  overId: string | null;
  isCopyOperation: boolean;
  dragTimer: number | null;
  
  // Actions
  handleDragStart: (id: string) => void;
  handleDragOver: (overId: string | null) => void;
  handleDragEnd: () => Promise<void>;
  handleDragCancel: () => void;
  handleModifierChange: (isAltPressed: boolean) => void;
  clearDragTimer: () => void;
  setDragTimer: (timer: number) => void;
  
  // Helpers
  isValidDropTarget: (source: string, target: string) => boolean;
  getDropTarget: () => string | null;
  shouldAutoExpand: (folderPath: string) => boolean;
}

export function useTreeDnD(options: UseTreeDnDOptions): UseTreeDnDReturn {
  const { onMove, onCopy } = options;
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [isCopyOperation, setIsCopyOperation] = useState(false);
  const [dragTimer, setDragTimerState] = useState<number | null>(null);
  
  const dragTimerRef = useRef<number | null>(null);

  const handleDragStart = useCallback((id: string) => {
    log.debug("Drag started", { id });
    setActiveId(id);
    setOverId(null);
    setIsCopyOperation(false);
  }, []);

  const handleDragOver = useCallback((newOverId: string | null) => {
    setOverId(newOverId);
  }, []);

  const handleModifierChange = useCallback((isAltPressed: boolean) => {
    setIsCopyOperation(isAltPressed);
  }, []);

  const clearDragTimer = useCallback(() => {
    if (dragTimerRef.current) {
      window.clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    setDragTimerState(null);
  }, []);

  const setDragTimer = useCallback((timer: number) => {
    clearDragTimer();
    dragTimerRef.current = timer;
    setDragTimerState(timer);
  }, [clearDragTimer]);

  const handleDragEnd = useCallback(async () => {
    if (!activeId) {
      handleDragCancel();
      return;
    }

    const targetPath = overId;
    
    // Validate drop
    if (targetPath && !isValidDrop(activeId, targetPath)) {
      log.warn("Invalid drop attempted", { from: activeId, to: targetPath });
      handleDragCancel();
      return;
    }

    try {
      const fileName = activeId.split("/").pop() || "";
      const newPath = targetPath ? `${targetPath}/${fileName}` : fileName;
      
      log.info(isCopyOperation ? "Copying file" : "Moving file", { 
        from: activeId, 
        to: newPath 
      });

      if (isCopyOperation && onCopy) {
        await onCopy(activeId, newPath);
      } else {
        await onMove(activeId, newPath);
      }
      
      // Clear caches for affected folders
      const sourceFolder = activeId.split("/").slice(0, -1).join("/");
      const targetFolder = targetPath || "";
      
      if (sourceFolder !== targetFolder) {
        // Clear source folder cache to refresh contents
        const folderCache = useFileStore.getState().folderCache;
        const newCache = new Map(folderCache);
        newCache.delete(sourceFolder);
        useFileStore.setState({ folderCache: newCache });
      }
      
    } catch (err) {
      log.error("Failed to move/copy file", err);
    } finally {
      handleDragCancel();
    }
  }, [activeId, overId, isCopyOperation, onMove, onCopy]);

  const handleDragCancel = useCallback(() => {
    clearDragTimer();
    setActiveId(null);
    setOverId(null);
    setIsCopyOperation(false);
  }, [clearDragTimer]);

  const isValidDropTarget = useCallback((source: string, target: string): boolean => {
    return isValidDrop(source, target);
  }, []);

  const getDropTarget = useCallback((): string | null => {
    if (overId) return overId;
    if (activeId) return "";  // Root level
    return null;
  }, [overId, activeId]);

  const shouldAutoExpand = useCallback((folderPath: string): boolean => {
    return overId === folderPath;
  }, [overId]);

  return {
    activeId,
    overId,
    isCopyOperation,
    dragTimer,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    handleModifierChange,
    clearDragTimer,
    setDragTimer,
    isValidDropTarget,
    getDropTarget,
    shouldAutoExpand,
  };
}
