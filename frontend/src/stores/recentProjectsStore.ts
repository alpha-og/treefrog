import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentProject {
  path: string;
  name: string;
  timestamp: number;
}

interface RecentProjectsState {
  projects: RecentProject[];
  addProject: (path: string) => void;
  removeProject: (path: string) => void;
  clearProjects: () => void;
}

export const useRecentProjectsStore = create<RecentProjectsState>()(
  persist(
    (set) => ({
      projects: [],
      addProject: (path: string) =>
        set((state) => {
          // Check if project already exists
          const existing = state.projects.find((p) => p.path === path);
          if (existing) {
            // Move to top by updating timestamp
            return {
              projects: [
                { ...existing, timestamp: Date.now() },
                ...state.projects.filter((p) => p.path !== path),
              ].slice(0, 10), // Keep only last 10
            };
          }
          // Add new project
          const name = path.split("/").pop() || path;
          return {
            projects: [
              { path, name, timestamp: Date.now() },
              ...state.projects,
            ].slice(0, 10), // Keep only last 10
          };
        }),
      removeProject: (path: string) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.path !== path),
        })),
      clearProjects: () => set({ projects: [] }),
    }),
    {
      name: "treefrog-recent-projects",
      partialize: (state) => ({
        projects: state.projects,
      }),
    }
  )
);
