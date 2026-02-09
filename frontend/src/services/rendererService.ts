import { getWailsApp } from "./api";

export type RendererMode = "auto" | "local" | "remote";
export type ImageSource = "ghcr" | "embedded" | "custom";

export interface RendererStatus {
  state: "running" | "stopped" | "error" | "not-installed" | "building";
  mode: RendererMode;
  message: string;
  port: number;
  logs: string;
  isRunning: boolean;
}

export interface RendererConfig {
  mode: RendererMode;
  port: number;
  autoStart: boolean;
  imageSource: ImageSource;
  imageRef: string;
  remoteUrl: string;
  remoteToken: string;
  customRegistry?: string;
  customTarPath?: string;
}

const getApp = () => {
  const app = getWailsApp();
  if (!app) {
    throw new Error("Wails app not available");
  }
  return app;
};

export const rendererService = {
  async startRenderer(): Promise<void> {
    return await getApp().StartRenderer();
  },

  async stopRenderer(): Promise<void> {
    return await getApp().StopRenderer();
  },

  async restartRenderer(): Promise<void> {
    return await getApp().RestartRenderer();
  },

  async getStatus(): Promise<RendererStatus> {
    return await getApp().GetRendererStatus();
  },

  async setPort(port: number): Promise<void> {
    return await getApp().SetRendererPort(port);
  },

  async setAutoStart(enabled: boolean): Promise<void> {
    return await getApp().SetRendererAutoStart(enabled);
  },

  async getLogs(): Promise<string> {
    return await getApp().GetRendererLogs();
  },

  async getConfig(): Promise<RendererConfig> {
    return await getApp().GetRendererConfig();
  },

  async setMode(mode: RendererMode): Promise<void> {
    return await getApp().SetRendererMode(mode);
  },

  async setImageSource(source: ImageSource, ref: string): Promise<void> {
    return await getApp().SetImageSource(source, ref);
  },

  async verifyCustomImage(path: string): Promise<boolean> {
    return await getApp().VerifyCustomImage(path);
  },

   async detectBestMode(): Promise<RendererMode> {
     return await getApp().DetectBestMode();
   },

   async setRemoteUrl(url: string): Promise<void> {
     return await getApp().SetRendererRemoteURL(url);
   },

   async setRemoteToken(token: string): Promise<void> {
     return await getApp().SetRendererRemoteToken(token);
   },
};
