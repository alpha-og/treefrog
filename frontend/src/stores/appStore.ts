import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RendererMode, ImageSource } from "../services/rendererService";

interface AppState {
  apiUrl: string;
  compilerUrl: string;
  compilerToken: string;
  theme: "light" | "dark" | "system";
  currentProject: string | null;
  // Renderer settings
  rendererMode: RendererMode;
  rendererPort: number;
  rendererAutoStart: boolean;
  rendererImageSource: ImageSource;
  rendererImageRef: string;
  rendererRemoteUrl: string;
  rendererRemoteToken: string;
  rendererCustomRegistry: string;
  rendererCustomTarPath: string;
  rendererStatus: "running" | "stopped" | "error" | "not-installed" | "building";
  rendererDetectedMode: RendererMode | null;
  rendererLogs: string;
  _hasHydrated: boolean;
  setApiUrl: (url: string) => void;
  setCompilerUrl: (url: string) => void;
  setCompilerToken: (token: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setCurrentProject: (path: string | null) => void;
  // Renderer setters
  setRendererMode: (mode: RendererMode) => void;
  setRendererPort: (port: number) => void;
  setRendererAutoStart: (enabled: boolean) => void;
  setRendererImageSource: (source: ImageSource) => void;
  setRendererImageRef: (ref: string) => void;
  setRendererRemoteUrl: (url: string) => void;
  setRendererRemoteToken: (token: string) => void;
  setRendererCustomRegistry: (registry: string) => void;
  setRendererCustomTarPath: (path: string) => void;
  setRendererStatus: (status: "running" | "stopped" | "error" | "not-installed" | "building") => void;
  setRendererDetectedMode: (mode: RendererMode | null) => void;
  setRendererLogs: (logs: string) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiUrl: "/api",
      compilerUrl: "https://treefrog-renderer.onrender.com",
      compilerToken: "",
      theme: "dark",
      currentProject: null,
      rendererMode: "auto",
      rendererPort: 8080,
      rendererAutoStart: false,
      rendererImageSource: "ghcr",
      rendererImageRef: "ghcr.io/alpha-og/treefrog/renderer:latest",
      rendererRemoteUrl: "",
      rendererRemoteToken: "",
      rendererCustomRegistry: "",
      rendererCustomTarPath: "",
      rendererStatus: "stopped",
      rendererDetectedMode: null,
      rendererLogs: "",
      _hasHydrated: false,
      setApiUrl: (url) => set({ apiUrl: url }),
      setCompilerUrl: (url) => set({ compilerUrl: url }),
      setCompilerToken: (token) => set({ compilerToken: token }),
       setTheme: (theme) => {
        if (theme === "dark") {
          document.documentElement.classList.add("dark");
        } else if (theme === "light") {
          document.documentElement.classList.remove("dark");
        } else if (theme === "system") {
          // Check system preference
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
      setRendererRemoteUrl: (url) => set({ rendererRemoteUrl: url }),
      setRendererRemoteToken: (token) => set({ rendererRemoteToken: token }),
      setRendererCustomRegistry: (registry) => set({ rendererCustomRegistry: registry }),
      setRendererCustomTarPath: (path) => set({ rendererCustomTarPath: path }),
      setRendererStatus: (status) => set({ rendererStatus: status }),
      setRendererDetectedMode: (mode) => set({ rendererDetectedMode: mode }),
      setRendererLogs: (logs) => set({ rendererLogs: logs }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "treefrog-app",
      partialize: (state) => ({
        apiUrl: state.apiUrl,
        compilerUrl: state.compilerUrl,
        compilerToken: state.compilerToken,
        theme: state.theme,
        currentProject: state.currentProject,
        rendererMode: state.rendererMode,
        rendererPort: state.rendererPort,
        rendererAutoStart: state.rendererAutoStart,
        rendererImageSource: state.rendererImageSource,
        rendererImageRef: state.rendererImageRef,
        rendererRemoteUrl: state.rendererRemoteUrl,
        rendererRemoteToken: state.rendererRemoteToken,
        rendererCustomRegistry: state.rendererCustomRegistry,
        rendererCustomTarPath: state.rendererCustomTarPath,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
