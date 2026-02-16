import { useRef, useState, useCallback, useEffect } from "react";
import { BuildStatus } from "../types";
import {
  triggerBuild,
  initDeltaSync,
  uploadDeltaSyncFiles,
} from "../services/buildService";
import { createLogger } from "../utils/logger";
import {
  computeFileChecksum,
  generateProjectId,
} from "../utils/checksum";
import { useCacheStore } from "../stores/cacheStore";

const log = createLogger("Build");

interface DeltaSyncBuildParams {
  projectPath: string;
  projectName: string;
  mainFile: string;
  engine: string;
  shell: boolean;
  files: File[];
}

export function useBuild() {
  const buildInFlightRef = useRef<boolean>(false);
  const progressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<BuildStatus | null>(null);
  const [deltaProgress, setDeltaProgress] = useState<{
    phase: string;
    progress: number;
  } | null>(null);

  const cacheStore = useCacheStore();

  useEffect(() => {
    return () => {
      if (progressTimeoutRef.current) {
        clearTimeout(progressTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Build using delta-sync: only upload changed files
   */
  const buildWithDeltaSync = useCallback(
    async (params: DeltaSyncBuildParams) => {
      if (!params.projectPath || !params.files.length) return;

      if (buildInFlightRef.current) {
        log.debug("Build already in-flight, ignoring request");
        return;
      }

      try {
        buildInFlightRef.current = true;
        const projectId = generateProjectId(params.projectPath);
        cacheStore.setCurrentProject(projectId);
        cacheStore.initializeProject(projectId);

        // Phase 1: Compute checksums for all files
        setDeltaProgress({ phase: "Computing checksums...", progress: 0 });
        const fileChecksums: Record<string, string> = {};
        let fileIndex = 0;

        for (const file of params.files) {
          const checksum = await computeFileChecksum(file);
          fileChecksums[file.name] = checksum;
          fileIndex++;
          setDeltaProgress({
            phase: `Computing checksums (${fileIndex}/${params.files.length})`,
            progress: (fileIndex / params.files.length) * 100,
          });
        }

        // Phase 2: Initialize delta-sync with server
        setDeltaProgress({ phase: "Initializing delta-sync...", progress: 50 });
        const initResponse = await initDeltaSync({
          projectId,
          projectName: params.projectName,
          mainFile: params.mainFile,
          engine: params.engine,
          shellEscape: params.shell,
          fileChecksums,
        });

        const buildId = initResponse.buildId;
        const existingFiles = initResponse.existingFiles || {};

        // Phase 3: Determine which files to upload (only changed/new files)
        setDeltaProgress({ phase: "Comparing with cache...", progress: 60 });
        const filesToUpload: File[] = [];
        const cachedFileReferences: Record<string, string> = {};

        for (const file of params.files) {
          const checksum = fileChecksums[file.name];
          const existingFile = existingFiles[file.name];

          if (
            existingFile &&
            existingFile.checksum === checksum
          ) {
            // File unchanged - use cached version
            cachedFileReferences[file.name] = checksum;
          } else {
            // File changed or new - mark for upload
            filesToUpload.push(file);
          }
        }

        log.debug("Delta-sync comparison", {
          totalFiles: params.files.length,
          cachedFiles: Object.keys(cachedFileReferences).length,
          uploadFiles: filesToUpload.length,
        });

        // Phase 4: Upload only changed files
        setDeltaProgress({
          phase: `Uploading files (0/${filesToUpload.length})...`,
          progress: 70,
        });

        const formData = new FormData();

        // Add metadata
        formData.append(
          "metadata",
          JSON.stringify({
            cachedFiles: cachedFileReferences,
            mainFile: params.mainFile,
            engine: params.engine,
            shellEscape: params.shell,
          })
        );

        // Add files
        filesToUpload.forEach((file, index) => {
          formData.append("files", file);
          setDeltaProgress({
            phase: `Uploading files (${index + 1}/${filesToUpload.length})`,
            progress: 70 + (index / filesToUpload.length) * 20,
          });
        });

        // Upload files
        await uploadDeltaSyncFiles(buildId, formData);

        // Phase 5: Build started
        setDeltaProgress({ phase: "Build queued...", progress: 100 });
        setStatus({
          id: buildId,
          state: "running",
          message: `Build started (${filesToUpload.length} files uploaded, ${Object.keys(cachedFileReferences).length} from cache)`,
        });

        // Update cache store
        cacheStore.incrementBuildCount(projectId);
        cacheStore.updateLastSynced(projectId);

        // Cache the file checksums for next build
        for (const file of params.files) {
          cacheStore.addCacheEntry(projectId, file.name, {
            projectId,
            fileHash: fileChecksums[file.name],
            lastModified: Date.now(),
            size: file.size,
          });
        }

        // Wait a bit before clearing progress (cleanup on unmount handled in useEffect)
        progressTimeoutRef.current = setTimeout(() => setDeltaProgress(null), 1000);
      } catch (err) {
        log.error("Failed to trigger delta-sync build", {
          error: err,
        });
        setStatus({
          id: "",
          state: "error",
          message: "Failed to start build",
        });
        setDeltaProgress(null);
        buildInFlightRef.current = false;
      }
    },
    [cacheStore]
  );

  /**
   * Legacy build method (non-delta-sync)
   */
  const build = useCallback(
    async (file: string, engine: string, shell: boolean) => {
      console.log("[useBuild.build] Called with file:", file, "engine:", engine);
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

  return {
    status,
    build,
    buildWithDeltaSync,
    updateStatus,
    deltaProgress,
  };
}

