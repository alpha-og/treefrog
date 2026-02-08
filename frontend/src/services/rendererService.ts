import { getWailsApp } from "./api";

export interface RendererStatus {
  state: "running" | "stopped" | "error" | "not-installed" | "building";
  message: string;
  port: number;
  logs: string;
  isRunning: boolean;
}

export interface RendererConfig {
  port: number;
  enabled: boolean;
  autoStart: boolean;
}

const getApp = () => {
  const app = getWailsApp();
  if (!app) {
    throw new Error("Wails app not available");
  }
  return app;
};

export const rendererService = {
  async buildRenderer(): Promise<void> {
    return await getApp().BuildRenderer();
  },

  async pullRenderer(imageRef: string): Promise<void> {
    return await getApp().PullRenderer(imageRef);
  },

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
};
