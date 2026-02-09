import { useRef, useState, useCallback } from "react";
import { BuildStatus } from "../types";
import { triggerBuild } from "../services/buildService";
import { createLogger } from "../utils/logger";

const log = createLogger("Build");

export function useBuild() {
  const buildInFlightRef = useRef<boolean>(false);
  const [status, setStatus] = useState<BuildStatus | null>(null);

  const build = useCallback(
    async (file: string, engine: string, shell: boolean) => {
      if (!file) return;

      if (buildInFlightRef.current) {
        log.debug("Build already in-flight, ignoring request");
        return;
      }

      try {
        buildInFlightRef.current = true;
        setStatus({ id: "", state: "running", message: "Building..." });
        await triggerBuild(file, engine, shell);
      } catch (err) {
        log.error("Failed to trigger build", { file, engine, error: err });
        setStatus({
          id: "",
          state: "error",
          message: "Failed to start build",
        });
        buildInFlightRef.current = false;
      }
    },
    []
  );

  // Update status from WebSocket when build completes
  const updateStatus = useCallback((newStatus: BuildStatus) => {
    setStatus(newStatus);
    if (newStatus.state === "success" || newStatus.state === "error") {
      buildInFlightRef.current = false;
    }
  }, []);

  return { status, build, updateStatus };
}

