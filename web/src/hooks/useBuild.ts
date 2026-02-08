import { useRef, useState, useCallback } from "react";
import { BuildStatus } from "../types";
import { triggerBuild, buildStatus } from "../services/buildService";

export function useBuild() {
  const pollRef = useRef<number | null>(null);
  const [status, setStatus] = useState<BuildStatus | null>(null);

  const build = useCallback(
    async (file: string, engine: string, shell: boolean) => {
      if (!file) return;

      try {
        await triggerBuild(file, engine, shell);

        if (pollRef.current) window.clearInterval(pollRef.current);

        pollRef.current = window.setInterval(async () => {
          try {
            const s = await buildStatus();
            setStatus(s);

            if (s.state === "success" || s.state === "error") {
              window.clearInterval(pollRef.current!);
            }
          } catch (err) {
            console.error("Failed to get build status:", err);
          }
        }, 1000);
      } catch (err) {
        console.error("Failed to trigger build:", err);
        setStatus({
          id: "",
          state: "error",
          message: "Failed to start build",
        });
      }
    },
    []
  );

  return { status, build };
}

