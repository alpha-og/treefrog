import axios, { AxiosInstance } from "axios";
import { isWails } from "../utils/env";
import { createLogger } from "../utils/logger";
import { RendererMode } from "./rendererService";

const log = createLogger("API");

let apiClient: AxiosInstance;

// Initialize HTTP API client (for web mode)
export function initializeAPI(baseURL: string) {
  log.debug(`Initializing API client with baseURL: ${baseURL}`);
  apiClient = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return apiClient;
}

export function getAPI(): AxiosInstance {
  if (!apiClient) {
    apiClient = initializeAPI("/api");
  }
  return apiClient;
}

// Web API methods
export async function GET(url: string) {
  log.debug(`GET ${url}`);
  try {
    const res = await getAPI().get(url);
    log.debug(`GET ${url} completed`, { status: res.status });
    return res.data;
  } catch (error) {
    log.error(`GET ${url} failed`, error);
    throw error;
  }
}

export async function POST(url: string, body: any) {
  log.debug(`POST ${url}`, { bodyKeys: Object.keys(body || {}) });
  try {
    const res = await getAPI().post(url, body);
    log.debug(`POST ${url} completed`, { status: res.status });
    return res.data;
  } catch (error) {
    log.error(`POST ${url} failed`, error);
    throw error;
  }
}

export async function PUT(url: string, body: any) {
  log.debug(`PUT ${url}`, { bodyKeys: Object.keys(body || {}) });
  try {
    const res = await getAPI().put(url, body);
    log.debug(`PUT ${url} completed`, { status: res.status });
    return res.data;
  } catch (error) {
    log.error(`PUT ${url} failed`, error);
    throw error;
  }
}

// Wails bindings interface
declare global {
  interface Window {
    go?: {
      main: {
        App: WailsApp;
      };
    };
  }
}

interface WailsApp {
  // Project
  GetProject(): Promise<{ name: string; root: string; builderUrl: string }>;
  SetProject(
    root: string,
  ): Promise<{ name: string; root: string; builderUrl: string }>;
  OpenProjectDialog(): Promise<{
    name: string;
    root: string;
    builderUrl: string;
  }>;

  // Files
  ListFiles(path: string): Promise<FileEntry[]>;
  ReadFile(path: string): Promise<string>;
  WriteFile(path: string, content: string): Promise<void>;
  CreateFile(path: string, type: "file" | "dir"): Promise<void>;
  RenameFile(from: string, to: string): Promise<void>;
  DeleteFile(path: string, recursive: boolean): Promise<void>;
  MoveFile(from: string, toDir: string): Promise<void>;
  DuplicateFile(from: string, to: string): Promise<void>;

  // Build
  GetBuildStatus(): Promise<BuildStatus>;
  TriggerBuild(
    mainFile: string,
    engine: string,
    shellEscape: boolean,
  ): Promise<void>;
  GetBuildLog(): Promise<string>;
  GetPDFPath(): Promise<string>;
  GetPDFContent(): Promise<Uint8Array>;
  ExportPDF(): Promise<string>;
  ExportSource(): Promise<string>;

  // Git
  GitStatus(): Promise<{ raw: string }>;
  GitCommit(message: string, files: string[], all: boolean): Promise<void>;
  GitPush(remote: string): Promise<void>;
  GitPull(remote: string): Promise<void>;

  // SyncTeX
  SyncTeXView(
    file: string,
    line: number,
    col: number,
  ): Promise<{ page: number; x: number; y: number }>;
  SyncTeXEdit(
    page: number,
    x: number,
    y: number,
  ): Promise<{ page: number; x: number; y: number }>;

  // Config
  GetConfig(): Promise<{
    projectRoot: string;
    builderUrl: string;
    builderToken: string;
  }>;
  SetBuilderConfig(url: string, token: string): Promise<void>;

  // Renderer
  BuildRenderer(): Promise<void>;
  PullRenderer(imageRef: string): Promise<void>;
  StartRenderer(): Promise<void>;
  StopRenderer(): Promise<void>;
  RestartRenderer(): Promise<void>;
  GetRendererStatus(): Promise<RendererStatus>;
  SetRendererPort(port: number): Promise<void>;
  SetRendererAutoStart(enabled: boolean): Promise<void>;
  SetRendererMode(mode: string): Promise<void>;
  SetImageSource(source: string, ref: string): Promise<void>;
  VerifyCustomImage(path: string): Promise<boolean>;
  DetectBestMode(): Promise<RendererMode>;
  SetRendererRemoteURL(url: string): Promise<void>;
  SetRendererRemoteToken(token: string): Promise<void>;
  GetRendererLogs(): Promise<string>;
  GetRendererConfig(): Promise<RendererConfig>;
}

interface RendererStatus {
  state: "running" | "stopped" | "error" | "not-installed" | "building";
  isRunning: boolean;
  mode: RendererMode;
  message: string;
  port: number;
  logs: string;
}

interface RendererConfig {
  mode: string;
  port: number;
  autoStart: boolean;
  imageSource: string;
  imageRef: string;
  remoteUrl: string;
  remoteToken: string;
  customRegistry?: string;
  customTarPath?: string;
}

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modTime: string;
  entries?: FileEntry[];
}

interface BuildStatus {
  id: string;
  state: string;
  message: string;
  startedAt: string;
  endedAt: string;
}

// Get Wails app instance
export const getWailsApp = (): WailsApp | null => {
  if (isWails() && window.go) {
    return window.go.main.App;
  }
  return null;
};
