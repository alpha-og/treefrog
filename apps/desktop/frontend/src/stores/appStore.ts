import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RendererMode, ImageSource } from "@/types";

interface AppState {
  remoteCompilerUrl: string;
  theme: "light" | "dark" | "system";
  currentProject: string | null;
  rendererMode: RendererMode;
  rendererPort: number;
  rendererAutoStart: boolean;
  rendererImageSource: ImageSource;
  rendererImageRef: string;
  rendererCustomRegistry: string;
  rendererCustomTarPath: string;
  rendererStatus: "running" | "stopped" | "error" | "not-installed" | "building";
  rendererDetectedMode: RendererMode | null;
  rendererLogs: string;
  buildLog: string;
  _hasHydrated: boolean;
  setRemoteCompilerUrl: (url: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setCurrentProject: (path: string | null) => void;
  setRendererMode: (mode: RendererMode) => void;
  setRendererPort: (port: number) => void;
  setRendererAutoStart: (enabled: boolean) => void;
  setRendererImageSource: (source: ImageSource) => void;
  setRendererImageRef: (ref: string) => void;
  setRendererCustomRegistry: (registry: string) => void;
  setRendererCustomTarPath: (path: string) => void;
  setRendererStatus: (status: "running" | "stopped" | "error" | "not-installed" | "building") => void;
  setRendererDetectedMode: (mode: RendererMode | null) => void;
  setRendererLogs: (logs: string) => void;
  setBuildLog: (log: string) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      remoteCompilerUrl: "",
      theme: "dark",
      currentProject: null,
      rendererMode: "auto",
      rendererPort: 8080,
      rendererAutoStart: false,
      rendererImageSource: "ghcr",
      rendererImageRef: "ghcr.io/alpha-og/treefrog/local-latex-compiler:latest",
      rendererCustomRegistry: "",
      rendererCustomTarPath: "",
      rendererStatus: "stopped",
      rendererDetectedMode: null,
      rendererLogs: "",
      buildLog: "",
      _hasHydrated: false,
      setRemoteCompilerUrl: (url) => set({ remoteCompilerUrl: url }),
      setTheme: (theme) => {
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else if (theme === "light") {
          document.documentElement.classList.remove("dark");
        } else if (theme === "system") {
          const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          if (isDark) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
        }
        set({ theme });
      },
      setCurrentProject: (path) => set({ currentProject: path }),
      setRendererMode: (mode) => set({ rendererMode: mode }),
      setRendererPort: (port) => set({ rendererPort: port }),
      setRendererAutoStart: (enabled) => set({ rendererAutoStart: enabled }),
      setRendererImageSource: (source) => set({ rendererImageSource: source }),
      setRendererImageRef: (ref) => set({ rendererImageRef: ref }),
      setRendererCustomRegistry: (registry) => set({ rendererCustomRegistry: registry }),
      setRendererCustomTarPath: (path) => set({ rendererCustomTarPath: path }),
      setRendererStatus: (status) => set({ rendererStatus: status }),
      setRendererDetectedMode: (mode) => set({ rendererDetectedMode: mode }),
      setRendererLogs: (logs) => set({ rendererLogs: logs }),
      setBuildLog: (log) => set({ buildLog: log }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "treefrog-app",
      partialize: (state) => ({
        remoteCompilerUrl: state.remoteCompilerUrl,
        theme: state.theme,
        currentProject: state.currentProject,
        rendererMode: state.rendererMode,
        rendererPort: state.rendererPort,
        rendererAutoStart: state.rendererAutoStart,
        rendererImageSource: state.rendererImageSource,
        rendererImageRef: state.rendererImageRef,
        rendererCustomRegistry: state.rendererCustomRegistry,
        rendererCustomTarPath: state.rendererCustomTarPath,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
