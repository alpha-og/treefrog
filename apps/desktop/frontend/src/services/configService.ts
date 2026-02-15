import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";
import * as App from "wailsjs/go/main/App";

const log = createLogger("ConfigService");

export const syncRemoteCompilerUrl = async (remoteCompilerUrl: string) => {
  if (isWails()) {
    try {
      await App.SetRemoteCompilerURL(remoteCompilerUrl);
      log.debug("Remote compiler URL synced via Wails");
      return;
    } catch (err) {
      log.error("Failed to sync remote compiler URL in Wails", err);
      throw err;
    }
  }
  
  return Promise.reject(new Error("Not implemented in web mode"));
};

export const getConfig = async () => {
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
  
  return Promise.reject(new Error("Not implemented in web mode"));
};
