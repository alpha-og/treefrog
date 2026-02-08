import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  apiUrl: string;
  builderUrl: string;
  builderToken: string;
  theme: "light" | "dark";
  setApiUrl: (url: string) => void;
  setBuilderUrl: (url: string) => void;
  setBuilderToken: (token: string) => void;
  setTheme: (theme: "light" | "dark") => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiUrl: "/api",
      builderUrl: "https://treefrog-renderer.onrender.com",
      builderToken: "",
      theme: "dark",
      setApiUrl: (url) => set({ apiUrl: url }),
      setBuilderUrl: (url) => set({ builderUrl: url }),
      setBuilderToken: (token) => set({ builderToken: token }),
      setTheme: (theme) => {
        document.documentElement.setAttribute("data-theme", theme);
        set({ theme });
      },
    }),
    {
      name: "treefrog-app",
      partialize: (state) => ({
        apiUrl: state.apiUrl,
        builderUrl: state.builderUrl,
        builderToken: state.builderToken,
        theme: state.theme,
      }),
    }
  )
);
