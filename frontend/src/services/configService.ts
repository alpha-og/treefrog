import { POST, getWailsApp } from "./api";
import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";

const log = createLogger("ConfigService");

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

export const syncConfig = async (builderUrl: string, builderToken: string) => {
  const app = await waitForWailsApp();
  if (app) {
    try {
      return await app.SetBuilderConfig(builderUrl, builderToken);
    } catch (err) {
      log.error("Failed to sync config in Wails", err);
      throw err;
    }
  }
  return POST("/config", { builderUrl, builderToken });
};

export const getConfig = async () => {
  const app = await waitForWailsApp();
  if (app) {
    try {
      return await app.GetConfig();
    } catch (err) {
      log.error("Failed to get config in Wails", err);
      throw err;
    }
  }
  return Promise.reject(new Error("Not implemented in web mode"));
};
