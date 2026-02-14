import { getWailsApp } from "./api";
import { RendererMode, ImageSource, RendererStatus, RendererConfig } from "@/types";

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
  return "auto";
};

const fromBackendRendererConfig = (config: RendererConfig): RendererConfig => {
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
    maxRetries: config.maxRetries,
    retryDelay: config.retryDelay,
    retryBackoff: config.retryBackoff,
    retryTimeout: config.retryTimeout,
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
    return fromBackendRendererConfig(config);
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
    const mode = await getApp().DetectBestMode();
    return toRendererMode(mode);
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

  async getBuildLog(): Promise<string> {
    return await getApp().GetBuildLog();
  },

  async getRendererLogs(): Promise<string> {
    return await getApp().GetRendererLogs();
  },

  async cleanupDockerSystem(): Promise<void> {
    return await getApp().CleanupDockerSystem();
  },

  async checkDiskSpace(): Promise<number> {
    const bytes = await getApp().CheckDockerDiskSpace();
    return bytes;
  },
};