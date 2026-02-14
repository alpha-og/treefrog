import * as React from "react";

declare global {
  interface Window {
    go: {
      main: {
        App: {
          GetProject: () => Promise<{ path: string; name: string } | null>;
          SetProject: (path: string) => Promise<{ path: string; name: string } | null>;
          OpenProjectDialog: () => Promise<{ path: string; name: string } | null>;
          ListFiles: (dir: string) => Promise<Array<{ name: string; isDir: boolean; path: string }>>;
          ReadFile: (path: string) => Promise<string>;
          WriteFile: (path: string, content: string) => Promise<void>;
          CreateFile: (path: string, content?: string) => Promise<void>;
          RenameFile: (oldPath: string, newPath: string) => Promise<void>;
          DeleteFile: (path: string) => Promise<void>;
          MoveFile: (src: string, dst: string) => Promise<void>;
          DuplicateFile: (path: string) => Promise<void>;
          TriggerBuild: () => Promise<{ buildId: string; status: string }>;
          GetBuildStatus: () => Promise<BuildStatus>;
          GetBuildLog: () => Promise<string>;
          GetPDFContent: () => Promise<ArrayBuffer | null>;
          GetPDFPath: () => Promise<string | null>;
          ExportPDF: (defaultName?: string) => Promise<boolean>;
          ExportSource: () => Promise<boolean>;
          GitStatus: () => Promise<GitStatus>;
          GitCommit: (message: string) => Promise<void>;
          GitPush: () => Promise<void>;
          GitPull: () => Promise<void>;
          SyncTeXView: (file: string, line: number, col: number) => Promise<SyncTeXResult | null>;
          SyncTeXEdit: (page: number, x: number, y: number) => Promise<SyncTeXResult | null>;
          GetAuthState: () => Promise<AuthState>;
          GetAuthSignInURL: () => Promise<string>;
          OpenAuthURL: (url: string) => Promise<void>;
          SignOut: () => Promise<void>;
          IsAuthenticated: () => Promise<boolean>;
          GetSessionToken: () => Promise<string | null>;
          StartRenderer: () => Promise<RendererStatus>;
          StopRenderer: () => Promise<void>;
          RestartRenderer: () => Promise<RendererStatus>;
          GetRendererStatus: () => Promise<RendererStatus>;
          SetRendererMode: (mode: string) => Promise<void>;
          SetRendererPort: (port: number) => Promise<void>;
          SetRendererAutoStart: (autoStart: boolean) => Promise<void>;
          SetImageSource: (source: string) => Promise<void>;
          VerifyCustomImage: (imageRef: string) => Promise<boolean>;
          SetRendererRemoteURL: (url: string) => Promise<void>;
          SetRendererRemoteToken: (token: string) => Promise<void>;
          GetCompilationMetrics: () => Promise<CompilationMetrics>;
          ResetCompilationMetrics: () => Promise<void>;
          GetRemoteCompilerHealth: () => Promise<RemoteCompilerHealth>;
          IsRemoteCompilerHealthy: () => Promise<boolean>;
          CleanupDockerSystem: () => Promise<{ freed: number; success: boolean }>;
          CheckDockerDiskSpace: () => Promise<{ available: number; used: number; total: number }>;
          DetectBestMode: () => Promise<string>;
        };
      };
    };
    runtime: {
      on: (event: string, callback: (data: unknown) => void) => void;
      emit: (event: string, data?: unknown) => void;
    };
  }
}

export interface BuildStatus {
  status: string;
  buildId: string;
  progress?: number;
  message?: string;
  pdfPath?: string;
  synctexPath?: string;
  error?: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  clean: boolean;
}

export interface SyncTeXResult {
  page: number;
  x: number;
  y: number;
  file: string;
  line: number;
  col?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface RendererStatus {
  running: boolean;
  mode: string;
  port?: number;
  image?: string;
  remoteURL?: string;
  healthy?: boolean;
  error?: string;
}

export interface CompilationMetrics {
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
  lastBuild?: string;
}

export interface RemoteCompilerHealth {
  healthy: boolean;
  latency?: number;
  error?: string;
}

export {};