import { getWailsApp } from "./api";

export type RendererMode = "auto" | "local" | "remote";
export type ImageSource = "ghcr" | "embedded" | "custom";

export interface RendererStatus {
  state: "running" | "stopped" | "error" | "not-installed" | "building";
  isRunning: boolean; // Added for backend compatibility.
  mode: RendererMode;
  message: string;
  port: number;
  logs: string;
}

export interface RendererConfig {
  mode: string; // Temporarily use string; runtime validation will convert this.
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

const toRendererMode = (mode: string): RendererMode => {
  if (mode === "auto" || mode === "local" || mode === "remote") {
    return mode;
  }
  console.warn(`Invalid RendererMode: ${mode}`);
  return "auto"; // Default fallback.
};

const fromBackendRendererConfig = (config: any): RendererConfig => {
  return {
    mode: toRendererMode(config.mode),
    port: config.port,
    autoStart: config.autoStart,
    imageSource: config.imageSource,
    imageRef: config.imageRef,
    remoteUrl: config.remoteUrl,
    remoteToken: config.remoteToken,
    customRegistry: config.customRegistry,
    customTarPath: config.customTarPath,
  };
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
    const status = await getApp().GetRendererStatus();
    status.mode = toRendererMode(status.mode) as RendererMode;
    return status;
  },

  async getConfig(): Promise<RendererConfig> {
    const config = await getApp().GetRendererConfig();
    return fromBackendRendererConfig(config); // Validate config.
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

   async setAutoStart(enabled: boolean): Promise<void> {
     return await getApp().SetRendererAutoStart(enabled);
   },

   async setPort(port: number): Promise<void> {
     return await getApp().SetRendererPort(port);
   },
};
