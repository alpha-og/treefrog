export type RendererMode = "auto" | "local" | "remote";
export type ImageSource = "ghcr" | "embedded" | "custom";

export interface RendererStatus {
  state: "running" | "stopped" | "error" | "not-installed" | "building";
  mode: RendererMode;
  message: string;
  port: number;
  logs: string;
}

export interface RendererConfig {
  mode: string;
  port: number;
  autoStart: boolean;
  imageSource: string;
  imageRef: string;
  remoteUrl: string;
  remoteToken: string;
  customRegistry?: string;
  customTarPath?: string;
  maxRetries: number;
  retryDelay: number;
  retryBackoff: number;
  retryTimeout: number;
}

export interface RemoteCompilerHealth {
  url: string;
  isHealthy: boolean;
  lastCheck: string;
  consecutiveFails: number;
  lastError: string;
  responseTime: number;
  upSince: string;
}