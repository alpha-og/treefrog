import { GET, POST } from "./api";

export const triggerBuild = (
  mainFile: string,
  engine: string,
  shellEscape: boolean
) =>
  POST("/build", {
    mainFile,
    engine,
    shellEscape,
  });

export const buildStatus = () =>
  GET("/build/status");

export const buildLogURL = () =>
  "/api/build/log";

export const exportPDF = () =>
  "/api/export/pdf";

export const exportSource = () =>
  "/api/export/source-zip";

