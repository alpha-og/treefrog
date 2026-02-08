import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  apiUrl: string;
  builderUrl: string;
  builderToken: string;
  theme: "light" | "dark";
  currentProject: string | null;
  _hasHydrated: boolean;
  setApiUrl: (url: string) => void;
  setBuilderUrl: (url: string) => void;
  setBuilderToken: (token: string) => void;
  setTheme: (theme: "light" | "dark") => void;
  setCurrentProject: (path: string | null) => void;
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
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
