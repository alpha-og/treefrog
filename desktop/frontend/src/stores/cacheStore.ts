import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectCache, CacheEntry } from '@treefrog/types';

interface CacheStore {
  // State
  projectCache: Record<string, ProjectCache>;
  currentProjectId: string | null;

  // Actions
  setCurrentProject: (projectId: string) => void;
  addCacheEntry: (
    projectId: string,
    filePath: string,
    entry: CacheEntry
  ) => void;
  getCacheEntry: (projectId: string, filePath: string) => CacheEntry | null;
  getAllCachedFiles: (projectId: string) => Record<string, CacheEntry>;
  updateLastSynced: (projectId: string) => void;
  incrementBuildCount: (projectId: string) => void;
  initializeProject: (projectId: string) => void;
  getCacheStats: (projectId: string) => { totalSize: number; fileCount: number };
  clearProjectCache: (projectId: string) => void;
}

export const useCacheStore = create<CacheStore>()(
  persist(
    (set, get) => ({
      projectCache: {},
      currentProjectId: null,

      setCurrentProject: (projectId: string) => {
        set({ currentProjectId: projectId });
      },

      addCacheEntry: (projectId, filePath, entry) => {
        set((state) => {
          const project = state.projectCache[projectId] || {
            projectId,
            files: {},
            lastSynced: 0,
            buildCount: 0,
          };

          return {
            projectCache: {
              ...state.projectCache,
              [projectId]: {
                ...project,
                files: {
                  ...project.files,
                  [filePath]: entry,
                },
              },
            },
          };
        });
      },

      getCacheEntry: (projectId, filePath) => {
        const project = get().projectCache[projectId];
        return project?.files[filePath] || null;
      },

      getAllCachedFiles: (projectId) => {
        const project = get().projectCache[projectId];
        return project?.files || {};
      },

      updateLastSynced: (projectId) => {
        set((state) => {
          const project = state.projectCache[projectId];
          if (!project) return state;

          return {
            projectCache: {
              ...state.projectCache,
              [projectId]: {
                ...project,
                lastSynced: Date.now(),
              },
            },
          };
        });
      },

      incrementBuildCount: (projectId) => {
        set((state) => {
          const project = state.projectCache[projectId];
          if (!project) return state;

          return {
            projectCache: {
              ...state.projectCache,
              [projectId]: {
                ...project,
                buildCount: project.buildCount + 1,
              },
            },
          };
        });
      },

      initializeProject: (projectId) => {
        set((state) => {
          if (state.projectCache[projectId]) {
            return state;
          }

          return {
            projectCache: {
              ...state.projectCache,
              [projectId]: {
                projectId,
                files: {},
                lastSynced: 0,
                buildCount: 0,
              },
            },
          };
        });
      },

      getCacheStats: (projectId) => {
        const project = get().projectCache[projectId];
        if (!project) {
          return { totalSize: 0, fileCount: 0 };
        }

        const files = Object.values(project.files);
        const totalSize = files.reduce((sum, entry) => sum + entry.size, 0);

        return {
          totalSize,
          fileCount: files.length,
        };
      },

      clearProjectCache: (projectId) => {
        set((state) => {
          const { [projectId]: _, ...remaining } = state.projectCache;
          return {
            projectCache: remaining,
            currentProjectId:
              state.currentProjectId === projectId
                ? null
                : state.currentProjectId,
          };
        });
      },
    }),
    {
      name: 'treefrog-cache-store',
    }
  )
);
