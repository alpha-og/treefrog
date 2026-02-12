import { useState, useCallback, useEffect } from "react";
import {
  gitStatus,
  gitCommit,
  gitPush,
  gitPull,
} from "../services/gitService";
import { createLogger } from "../utils/logger";

const log = createLogger("Git");

export function useGit() {
  const [status, setStatus] = useState("");
  const [isError, setIsError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await gitStatus();
      setStatus(data.raw || "");
      setIsError(false);
    } catch (err) {
      log.error("Failed to get git status", { error: err });
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
        log.error("Failed to commit", { message: msg, error: err });
      }
    },
    [refresh]
  );

  const push = useCallback(async () => {
    try {
      await gitPush();
      await refresh();
    } catch (err) {
      log.error("Failed to push", { error: err });
    }
  }, [refresh]);

  const pull = useCallback(async () => {
    try {
      await gitPull();
      await refresh();
    } catch (err) {
      log.error("Failed to pull", { error: err });
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
