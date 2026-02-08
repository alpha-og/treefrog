import { useCallback } from "react";
import { useProject } from "../hooks/useProject";
import Home from "./Home";

export default function HomePageWrapper() {
  const { select: selectProject, loading: projectLoading } = useProject();

  const handleSelectProject = useCallback(
    async (path: string) => {
      await selectProject(path);
    },
    [selectProject]
  );

  return (
    <Home
      onSelectProject={handleSelectProject}
      loading={projectLoading}
    />
  );
}
