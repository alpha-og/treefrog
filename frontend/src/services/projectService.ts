import { GET, POST, getWailsApp } from "./api";
import { isWails } from "../utils/env";

export const getProject = () => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.GetProject();
  }
  return GET("/project");
};

export const setProject = (root: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.SetProject(root);
  }
  return POST("/project/set", { root });
};

export const openProjectDialog = () => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.OpenProjectDialog();
  }
  // Web version: no native dialog, use file input
  return Promise.reject(new Error("Open dialog not available in web mode"));
};
