import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  apiUrl: string;
  builderUrl: string;
  builderToken: string;
  theme: "light" | "dark";
  currentProject: string | null;
  // Renderer settings
  rendererPort: number;
  rendererEnabled: boolean;
  rendererAutoStart: boolean;
  rendererStatus: "running" | "stopped" | "error" | "not-installed" | "building";
  rendererLogs: string;
  _hasHydrated: boolean;
  setApiUrl: (url: string) => void;
  setBuilderUrl: (url: string) => void;
  setBuilderToken: (token: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  setCurrentProject: (path: string | null) => void;
  // Renderer setters
  setRendererPort: (port: number) => void;
  setRendererEnabled: (enabled: boolean) => void;
  setRendererAutoStart: (enabled: boolean) => void;
  setRendererStatus: (status: "running" | "stopped" | "error" | "not-installed" | "building") => void;
  setRendererLogs: (logs: string) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiUrl: "/api",
      builderUrl: "https://treefrog-renderer.onrender.com",
      builderToken: "",
      theme: "dark",
      currentProject: null,
      rendererPort: 8080,
      rendererEnabled: false,
      rendererAutoStart: false,
      rendererStatus: "stopped",
      rendererLogs: "",
      _hasHydrated: false,
      setApiUrl: (url) => set({ apiUrl: url }),
      setBuilderUrl: (url) => set({ builderUrl: url }),
      setBuilderToken: (token) => set({ builderToken: token }),
      setTheme: (theme) => {
        const themeName = theme === "dark" ? "rusty-dark" : "rusty-light";
        document.documentElement.setAttribute("data-theme", themeName);
        set({ theme });
      },
      setCurrentProject: (path) => set({ currentProject: path }),
      setRendererPort: (port) => set({ rendererPort: port }),
      setRendererEnabled: (enabled) => set({ rendererEnabled: enabled }),
      setRendererAutoStart: (enabled) => set({ rendererAutoStart: enabled }),
      setRendererStatus: (status) => set({ rendererStatus: status }),
      setRendererLogs: (logs) => set({ rendererLogs: logs }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "treefrog-app",
      partialize: (state) => ({
        apiUrl: state.apiUrl,
        builderUrl: state.builderUrl,
        builderToken: state.builderToken,
        theme: state.theme,
        currentProject: state.currentProject,
        rendererPort: state.rendererPort,
        rendererEnabled: state.rendererEnabled,
        rendererAutoStart: state.rendererAutoStart,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
