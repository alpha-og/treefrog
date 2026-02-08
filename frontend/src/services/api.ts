import axios, { AxiosInstance } from "axios";
import { isWails } from "../utils/env";

let apiClient: AxiosInstance;

// Initialize HTTP API client (for web mode)
export function initializeAPI(baseURL: string) {
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
  return getAPI().get(url).then((res) => res.data);
}

export async function POST(url: string, body: any) {
  return getAPI().post(url, body).then((res) => res.data);
}

export async function PUT(url: string, body: any) {
  return getAPI().put(url, body).then((res) => res.data);
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
  SetProject(root: string): Promise<{ name: string; root: string; builderUrl: string }>;
  OpenProjectDialog(): Promise<{ name: string; root: string; builderUrl: string }>;
  
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
  TriggerBuild(mainFile: string, engine: string, shellEscape: boolean): Promise<void>;
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
  SyncTeXView(file: string, line: number, col: number): Promise<{ page: number; x: number; y: number }>;
  SyncTeXEdit(page: number, x: number, y: number): Promise<{ page: number; x: number; y: number }>;
  
  // Config
  GetConfig(): Promise<{ projectRoot: string; builderUrl: string; builderToken: string }>;
  SetBuilderConfig(url: string, token: string): Promise<void>;
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
