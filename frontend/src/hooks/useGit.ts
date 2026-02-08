import { useState, useCallback, useEffect } from "react";
import {
  gitStatus,
  gitCommit,
  gitPush,
  gitPull,
} from "../services/gitService";

export function useGit() {
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await gitStatus();
      setStatus(data.raw || "");
      setIsError(false);
    } catch (err) {
      console.error("Failed to get git status:", err);
      setStatus("git error");
      setIsError(true);
    }
  }, []);

  // Auto-refresh on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const commit = useCallback(
    async (msg: string) => {
      if (!msg.trim()) return;
      try {
        await gitCommit(msg);
        await refresh();
      } catch (err) {
        console.error("Failed to commit:", err);
      }
    },
    [refresh]
  );

  const push = useCallback(async () => {
    try {
      await gitPush();
      await refresh();
    } catch (err) {
      console.error("Failed to push:", err);
    }
  }, [refresh]);

  const pull = useCallback(async () => {
    try {
      await gitPull();
      await refresh();
    } catch (err) {
      console.error("Failed to pull:", err);
    }
  }, [refresh]);

  return {
    status,
    isError,
    refresh,
    commit,
    push,
    pull,
  };
}
