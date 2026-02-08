import { useEffect, useState, useCallback } from "react";
import {
  getProject,
  setProject,
} from "../services/projectService";
import { createLogger } from "../utils/logger";

const log = createLogger("useProject");

export function useProject() {
  const [root, setRoot] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    log.debug("useProject mounted - loading current project from backend");
    
    (async () => {
      setLoading(true);
      try {
        const data = await getProject();
        log.info(`Got project from backend: ${JSON.stringify(data)}`);
        if (data.root) {
          log.info(`Project loaded: ${data.root}`);
          setRoot(data.root);
          setShowPicker(false);
        } else {
          log.debug("No project loaded, showing picker");
          setShowPicker(true);
        }
      } catch (err) {
        log.error("Failed to load project", err);
        setShowPicker(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const select = useCallback(
    async (path: string) => {
      log.info(`Selecting project: ${path}`);
      if (!path.trim()) {
        log.warn("Empty project path provided");
        alert("Please enter a project path");
        return;
      }
      try {
        const data = await setProject(path.trim());
        log.info(`Project set successfully: ${data.root}`);
        setRoot(data.root);
        setShowPicker(false);
      } catch (err) {
        log.error("Failed to set project", err);
        alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    },
    []
  );

  return {
    root,
    showPicker,
    setShowPicker,
    select,
    loading,
  };
}

