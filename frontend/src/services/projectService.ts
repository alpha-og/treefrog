import { GET, POST } from "./api";
import { createLogger } from "../utils/logger";
import * as App from "wailsjs/go/main/App";
import { isWails } from "../utils/env";

const log = createLogger("ProjectService");

export const getProject = async () => {
  log.debug("Getting current project");
  
  // Try Wails first
  if (isWails()) {
    try {
      const project = await App.GetProject();
      log.info(`Project loaded via Wails: ${project.root}`);
      return project;
    } catch (err) {
      log.error("Failed to get project from Wails", err);
    }
  }
  
  // Fallback to HTTP (should not happen in Wails mode)
  try {
    const project = await GET("/project");
    log.info(`Project loaded via HTTP: ${project.root}`);
    return project;
  } catch (err) {
    log.error("Failed to get project from HTTP", err);
    return { name: "", root: "", builderUrl: "" };
  }
};

export const setProject = async (root: string) => {
  log.info(`Setting project root to: ${root}`);
  
  // Try Wails first
  if (isWails()) {
    try {
      const project = await App.SetProject(root);
      log.info(`Project set via Wails: ${project.root}`);
      return project;
    } catch (err) {
      log.error("Failed to set project in Wails", err);
      throw err;
    }
  }
  
  // Fallback to HTTP
  return POST("/project/set", { root });
};

export const openProjectDialog = async () => {
  log.info("Opening project dialog");
  
  // Try Wails first
  if (isWails()) {
    try {
      const project = await App.OpenProjectDialog();
      log.info(`Project selected via dialog: ${project.root}`);
      return project;
    } catch (err) {
      log.error("Failed to open project dialog in Wails", err);
      throw err;
    }
  }
  
  // Web version: no native dialog, use file input
  log.error("Open dialog not available in web mode");
  return Promise.reject(new Error("Open dialog not available in web mode"));
};
