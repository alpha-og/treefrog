import { GET, POST, getWailsApp } from "./api";
import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";

const log = createLogger("ProjectService");

// Helper function to wait for Wails app to be available
const waitForWailsApp = async (maxAttempts: number = 10): Promise<any> => {
  for (let i = 0; i < maxAttempts; i++) {
    if (isWails()) {
      const app = getWailsApp();
      if (app) {
        log.debug("Wails app available");
        return app;
      }
    }
    if (i < maxAttempts - 1) {
      log.debug(`Waiting for Wails app... attempt ${i + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  log.warn("Wails app not available after max attempts");
  return null;
};

export const getProject = async () => {
  log.debug("Getting current project");
  const app = await waitForWailsApp();
  if (app) {
    try {
      return await app.GetProject();
    } catch (err) {
      log.error("Failed to get project from Wails", err);
      return { name: "", root: "", builderUrl: "" };
    }
  }
  
  // Fallback to HTTP (should not happen in Wails mode)
  try {
    return await GET("/project");
  } catch (err) {
    log.error("Failed to get project from HTTP", err);
    return { name: "", root: "", builderUrl: "" };
  }
};

export const setProject = async (root: string) => {
  log.info(`Setting project root to: ${root}`);
  const app = await waitForWailsApp();
  if (app) {
    try {
      return await app.SetProject(root);
    } catch (err) {
      log.error("Failed to set project in Wails", err);
      throw err;
    }
  }
  
  // Fallback to HTTP (should not happen in Wails mode)
  return POST("/project/set", { root });
};

export const openProjectDialog = async () => {
  log.info("Opening project dialog");
  const app = await waitForWailsApp();
  if (app) {
    try {
      return await app.OpenProjectDialog();
    } catch (err) {
      log.error("Failed to open project dialog in Wails", err);
      throw err;
    }
  }
  
  // Web version: no native dialog, use file input
  log.error("Open dialog not available in web mode");
  return Promise.reject(new Error("Open dialog not available in web mode"));
};
