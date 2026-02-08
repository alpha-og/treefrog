import { useEffect, useState, useCallback } from "react";
import {
  getProject,
  setProject,
} from "../services/projectService";

export function useProject() {
  const [root, setRoot] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getProject();
        if (data.root) {
          setRoot(data.root);
          setShowPicker(false);
        } else {
          setShowPicker(true);
        }
      } catch (err) {
        console.error("Failed to load project:", err);
        setShowPicker(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const select = useCallback(
    async (path: string) => {
      if (!path.trim()) {
        alert("Please enter a project path");
        return;
      }
      try {
        const data = await setProject(path.trim());
        setRoot(data.root);
        setShowPicker(false);
      } catch (err) {
        console.error("Failed to set project:", err);
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

