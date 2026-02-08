import { POST, getWailsApp } from "./api";
import { isWails } from "../utils/env";

export const syncConfig = (builderUrl: string, builderToken: string) => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.SetBuilderConfig(builderUrl, builderToken);
  }
  return POST("/config", { builderUrl, builderToken });
};

export const getConfig = () => {
  if (isWails()) {
    const app = getWailsApp();
    return app?.GetConfig();
  }
  return Promise.reject(new Error("Not implemented in web mode"));
};
