import { useState, useEffect } from "react";
import { Clock, FolderPlus, Settings } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useRecentProjectsStore } from "../stores/recentProjectsStore";
import { useAppStore } from "../stores/appStore";
import { openProjectDialog } from "../services/projectService";
import ProjectCard from "../components/ProjectCard";
import FramelessWindow from "../components/FramelessWindow";

interface HomeProps {
  onSelectProject?: (path: string) => Promise<void>;
  loading?: boolean;
}

export default function Home({ onSelectProject, loading }: HomeProps) {
  const navigate = useNavigate();
  const { projects, removeProject } = useRecentProjectsStore();
  const { setBuilderUrl, setBuilderToken } = useAppStore();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(false);

  // Wait for Zustand stores to hydrate from localStorage
  useEffect(() => {
    setStoreHydrated(true);
  }, []);

  const handleOpenProjectDialog = async () => {
    setError("");
    try {
      setIsSubmitting(true);
      const project = await openProjectDialog();
      if (project && project.root) {
        if (onSelectProject) {
          await onSelectProject(project.root);
        }
        navigate({ to: "/editor" });
      }
    } catch (err) {
      console.log("Project dialog cancelled or error:", err);
      // User cancelled or error occurred
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecentProjectClick = async (path: string) => {
    setError("");
    try {
      setIsSubmitting(true);
      if (onSelectProject) {
        await onSelectProject(path);
      }
      navigate({ to: "/editor" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveProject = (path: string) => {
    removeProject(path);
  };

  return (
    <FramelessWindow title="Treefrog" subtitle="Home">
      <div className="flex-1 bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex flex-col overflow-hidden" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
        {/* Header with Settings */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <div></div>
          <button
            onClick={() => navigate({ to: "/settings" })}
            className="btn btn-ghost btn-sm hover:bg-primary/10 transition-all"
            title="Settings"
          >
            <Settings size={18} className="text-primary" />
          </button>
        </div>

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto px-6 py-8 md:py-12">
            <div className="space-y-12">
              {/* Section 1: Create/Open Project */}
              <section>
                <div className="space-y-6">
                  {/* Section Header */}
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">Get Started</h2>
                    <p className="text-base-content/70 text-sm md:text-base">
                      Create a new project or choose an existing one from your file system
                    </p>
                  </div>

                  {/* Primary Action Card */}
                  <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-base-100 border border-primary/20 rounded-2xl p-6 md:p-8 hover:border-primary/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-bold mb-2">Open Your Project</h3>
                        <p className="text-base-content/70 text-xs md:text-sm leading-relaxed">
                          Select your LaTeX project folder. Treefrog will detect your main.tex file and set up
                          everything automatically. Your project will be saved to your recent list for quick access.
                        </p>
                      </div>
                      <button
                        onClick={handleOpenProjectDialog}
                        disabled={isSubmitting || loading}
                        className="btn btn-primary btn-sm md:btn-md gap-2 whitespace-nowrap shadow-lg hover:shadow-xl transition-all flex-shrink-0 w-full md:w-auto"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="loading loading-spinner loading-sm"></span>
                            Opening...
                          </>
                        ) : (
                          <>
                            <FolderPlus size={18} />
                            Choose Folder
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-error/10 border border-error/30 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                      <div className="w-5 h-5 rounded-full bg-error flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                      <div>
                        <p className="font-semibold text-error text-sm">{error}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gradient-to-r from-base-content/10 to-transparent" />
                <span className="text-xs text-base-content/60 font-medium">OR</span>
                <div className="flex-1 h-px bg-gradient-to-l from-base-content/10 to-transparent" />
              </div>

              {/* Section 2: Recent Projects */}
              <section>
                <div className="space-y-6">
                  {/* Section Header */}
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Clock size={24} className="text-primary" />
                      <h2 className="text-2xl md:text-3xl font-bold">Recent Projects</h2>
                    </div>
                    <p className="text-base-content/70 text-sm md:text-base">
                      {storeHydrated && projects.length > 0
                        ? `You have ${projects.length} recent project${projects.length !== 1 ? "s" : ""}`
                        : "No recent projects yet"}
                    </p>
                  </div>

                  {/* Recent Projects Grid */}
                  {storeHydrated && projects && projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {projects.map((project) => (
                        <ProjectCard
                          key={project.path}
                          project={project}
                          onSelect={async (path) => {
                            setIsSubmitting(true);
                            try {
                              if (onSelectProject) {
                                await onSelectProject(path);
                              }
                              navigate({ to: "/editor" });
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Failed to open project");
                            } finally {
                              setIsSubmitting(false);
                            }
                          }}
                          onRemove={handleRemoveProject}
                          isLoading={isSubmitting}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-base-100/50 to-base-100/30 border border-base-content/5 rounded-2xl p-12 text-center">
                      <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <Clock size={32} className="text-base-content/40" />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-base-content/80 mb-2">
                        No recent projects yet
                      </h3>
                      <p className="text-sm text-base-content/60 max-w-sm mx-auto">
                        When you open a project, it will appear here for quick access next time
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </FramelessWindow>
  );
}
