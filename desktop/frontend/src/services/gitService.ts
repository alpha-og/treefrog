import { GET, POST, getWailsApp } from "./api";
import { isWails } from "../utils/env";

export const gitStatus = () => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.GitStatus();
  }
  return GET("/git/status");
};

export const gitCommit = (message: string, files?: string[], all: boolean = true) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.GitCommit(message, files || [], all);
  }
  return POST("/git/commit", {
    message,
    all: true,
  });
};

export const gitPush = (remote?: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.GitPush(remote || "");
  }
  return POST("/git/push", {});
};

export const gitPull = (remote?: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.GitPull(remote || "");
  }
  return POST("/git/pull", {});
};
