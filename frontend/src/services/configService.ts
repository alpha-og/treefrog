import { POST } from "./api";
import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";
import * as App from "wailsjs/go/main/App";

const log = createLogger("ConfigService");

export const syncConfig = async (compilerUrl: string, compilerToken: string) => {
  // Try Wails first
  if (isWails()) {
    try {
      await App.SetCompilerConfig(compilerUrl, compilerToken);
      log.debug("Config synced via Wails");
      return;
    } catch (err) {
      log.error("Failed to sync config in Wails", err);
      throw err;
    }
  }
  
  // Fallback to HTTP
  return POST("/config", { compilerUrl, compilerToken });
};

export const getConfig = async () => {
  // Try Wails first
  if (isWails()) {
    try {
      const config = await App.GetConfig();
      log.debug("Config retrieved via Wails");
      return config;
    } catch (err) {
      log.error("Failed to get config in Wails", err);
      throw err;
    }
  }
  
  // No HTTP fallback for config
  return Promise.reject(new Error("Not implemented in web mode"));
};
