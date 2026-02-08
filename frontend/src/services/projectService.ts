import { GET, POST, getWailsApp } from "./api";
import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";

const log = createLogger("ProjectService");

export const getProject = () => {
  log.debug("Getting current project");
  if (isWails()) {
    const app = getWailsApp();
    return app?.GetProject();
  }
  return GET("/project");
};

export const setProject = (root: string) => {
  log.info(`Setting project root to: ${root}`);
  if (isWails()) {
    const app = getWailsApp();
    return app?.SetProject(root);
  }
  return POST("/project/set", { root });
};

export const openProjectDialog = () => {
  log.info("Opening project dialog");
  if (isWails()) {
    const app = getWailsApp();
    return app?.OpenProjectDialog();
  }
  // Web version: no native dialog, use file input
  log.error("Open dialog not available in web mode");
  return Promise.reject(new Error("Open dialog not available in web mode"));
};
