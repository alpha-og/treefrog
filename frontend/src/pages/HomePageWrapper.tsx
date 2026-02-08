import { useCallback } from "react";
import { useProject } from "../hooks/useProject";
import { useRecentProjectsStore } from "../stores/recentProjectsStore";
import Home from "./Home";

export default function HomePageWrapper() {
  const { select: selectProject, loading: projectLoading } = useProject();
  const { addProject } = useRecentProjectsStore();

  const handleSelectProject = useCallback(
    async (path: string) => {
      addProject(path);
      await selectProject(path);
    },
    [selectProject, addProject]
  );

  return (
    <Home
      onSelectProject={handleSelectProject}
      loading={projectLoading}
    />
  );
}
