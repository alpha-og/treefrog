import { GET, POST, getWailsApp } from "./api";
import { isWails } from "../utils/env";

/**
 * Initialize delta-sync build
 * Returns build ID and existing cached files
 */
export const initDeltaSync = (params: {
  projectId: string;
  projectName: string;
  mainFile: string;
  engine: string;
  shellEscape: boolean;
  fileChecksums: Record<string, string>;
}) => {
  return POST("/builds/init", params);
};

/**
 * Upload files for delta-sync build
 * Sends multipart form data with files and metadata
 */
export const uploadDeltaSyncFiles = (
  buildId: string,
  formData: FormData
) => {
  return POST(`/builds/${buildId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const triggerBuild = (
  mainFile: string,
  engine: string,
  shellEscape: boolean
) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.TriggerBuild(mainFile, engine, shellEscape);
  }
  return POST("/build", {
    mainFile,
    engine,
    shellEscape,
  });
};

export const buildStatus = () => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.GetBuildStatus();
  }
  return GET("/build/status");
};

export const buildLogURL = () =>
  "/api/build/log";

export const exportPDF = () =>
  "/api/export/pdf";

export const exportSource = () =>
  "/api/export/source-zip";

// Wails-specific exports
export const getBuildLog = () => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.GetBuildLog();
  }
  return Promise.reject(new Error("Not implemented in web mode"));
};

export const exportPDFFile = () => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.ExportPDF();
  }
  return Promise.reject(new Error("Not implemented in web mode"));
};

export const exportSourceFile = () => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.ExportSource();
  }
  return Promise.reject(new Error("Not implemented in web mode"));
};

/**
 * Get signed URL for artifact download
 * @param buildId The build ID
 * @param type Artifact type ('pdf' | 'logs' | 'synctex')
 * @param expires URL expiry time in seconds (default: 300 = 5 minutes)
 * @returns Signed URL for downloading the artifact
 */
export const getSignedArtifactUrl = async (
  buildId: string,
  type: 'pdf' | 'logs' | 'synctex',
  expires: number = 300
): Promise<string> => {
  const response = await GET<{ url: string; expiresAt: string }>(
    `/builds/${buildId}/artifacts/${type}/signed-url?expires=${expires}`
  );
  return response.url;
};

/**
 * Download artifact using signed URL
 * Opens the signed URL in a new tab to trigger download
 * @param buildId The build ID
 * @param type Artifact type ('pdf' | 'logs' | 'synctex')
 */
export const downloadArtifact = async (
  buildId: string,
  type: 'pdf' | 'logs' | 'synctex'
): Promise<void> => {
  try {
    const signedUrl = await getSignedArtifactUrl(buildId, type);
    window.open(signedUrl, '_blank');
  } catch (error) {
    console.error('Failed to download artifact:', error);
    throw new Error(`Failed to download ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
