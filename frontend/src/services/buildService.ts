import { GET, POST, getWailsApp } from "./api";
import { isWails } from "../utils/env";

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
