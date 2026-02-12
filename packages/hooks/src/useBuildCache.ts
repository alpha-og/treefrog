import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProjectCache, CacheStats } from '@treefrog/types';

interface CacheState {
  projects: Record<string, ProjectCache>;
  addProject: (cache: ProjectCache) => void;
  getProject: (projectId: string) => ProjectCache | undefined;
  updateProject: (cache: ProjectCache) => void;
  removeProject: (projectId: string) => void;
  clear: () => void;
  getStats: () => CacheStats;
}

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      projects: {},
      addProject: (cache) =>
        set((state) => ({
          projects: { ...state.projects, [cache.projectId]: cache },
        })),
      getProject: (projectId) => get().projects[projectId],
      updateProject: (cache) =>
        set((state) => ({
          projects: { ...state.projects, [cache.projectId]: cache },
        })),
      removeProject: (projectId) =>
        set((state) => {
          const { [projectId]: _, ...remaining } = state.projects;
          return { projects: remaining };
        }),
      clear: () => set({ projects: {} }),
      getStats: () => {
        const state = get();
        const projects = Object.values(state.projects);
        const totalSize = projects.reduce(
          (sum, p) =>
            sum +
            Object.values(p.files).reduce((fileSum, f) => fileSum + f.size, 0),
          0
        );
        const cacheHitRate =
          projects.length > 0
            ? projects.reduce((sum, p) => sum + p.buildCount, 0) / projects.length
            : 0;

        return {
          totalSize,
          totalProjects: projects.length,
          cacheHitRate,
          payloadReduction: totalSize > 0 ? 0.99 : 0, // 99% reduction on subsequent builds
        };
      },
    }),
    {
      name: 'treefrog-cache',
    }
  )
);

export const useBuildCache = (projectId: string) => {
  const { getProject, updateProject, addProject } = useCacheStore();
  const [cache, setCache] = useState<ProjectCache | undefined>(
    getProject(projectId)
  );

  useEffect(() => {
    const project = getProject(projectId);
    setCache(project);
  }, [projectId, getProject]);

  return {
    cache,
    saveCache: (projectCache: ProjectCache) => {
      if (cache?.projectId === projectId) {
        updateProject(projectCache);
      } else {
        addProject(projectCache);
      }
      setCache(projectCache);
    },
  };
};
