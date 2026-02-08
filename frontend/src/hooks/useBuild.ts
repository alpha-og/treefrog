import { useRef, useState, useCallback } from "react";
import { BuildStatus } from "../types";
import { triggerBuild } from "../services/buildService";

export function useBuild() {
  const buildInFlightRef = useRef<boolean>(false);
  const [status, setStatus] = useState<BuildStatus | null>(null);

  const build = useCallback(
    async (file: string, engine: string, shell: boolean) => {
      if (!file) return;

      // Prevent duplicate build requests in-flight
      if (buildInFlightRef.current) {
        console.debug("Build already in-flight, ignoring request");
        return;
      }

      try {
        buildInFlightRef.current = true;
        setStatus({ id: "", state: "running", message: "Building..." });
        await triggerBuild(file, engine, shell);
      } catch (err) {
        console.error("Failed to trigger build:", err);
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

