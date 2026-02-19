import { useCallback } from "react";
import { useProject } from "../hooks/useProject";
import { useRecentProjectsStore } from "../stores/recentProjectsStore";
import { useFileStore } from "../stores/fileStore";
import Home from "./Home";

export default function HomePageWrapper() {
  const { select: selectProject, loading: projectLoading } = useProject();
  const { addProject } = useRecentProjectsStore();
  const { clear: clearFiles } = useFileStore();

  const handleSelectProject = useCallback(
    async (path: string) => {
      clearFiles();
      addProject(path);
      await selectProject(path);
    },
    [selectProject, addProject, clearFiles]
  );

  return (
    <Home
      onSelectProject={handleSelectProject}
      loading={projectLoading}
    />
  );
}
