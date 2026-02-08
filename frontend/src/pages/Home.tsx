import { useState } from "react";
import { Plus, Clock, Trash2, FolderOpen, ArrowRight, FolderPlus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useRecentProjectsStore } from "../stores/recentProjectsStore";
import { openProjectDialog } from "../services/projectService";

interface HomeProps {
  onSelectProject?: (path: string) => Promise<void>;
  loading?: boolean;
}

export default function Home({ onSelectProject, loading }: HomeProps) {
  const navigate = useNavigate();
  const { projects, removeProject } = useRecentProjectsStore();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleRemoveProject = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    removeProject(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-300 via-base-200 to-base-300 flex flex-col">
      {/* Header */}
      <header className="border-b border-base-content/10 bg-base-100/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold text-lg">ƒ</span>
            </div>
            <h1 className="text-3xl font-bold">Treefrog</h1>
          </div>
          <p className="text-base-content/70">LaTeX editor with remote compilation</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Open Project */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-6">Open Project</h2>

              {/* File Picker Button */}
              <button
                onClick={handleOpenProjectDialog}
                disabled={isSubmitting || loading}
                className="w-full btn btn-lg btn-primary gap-3 shadow-lg hover:shadow-xl transition-all"
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Opening...
                  </>
                ) : (
                  <>
                    <FolderPlus size={20} />
                    Choose Project Folder
                  </>
                )}
              </button>

              {error && (
                <div className="alert alert-error shadow-sm mt-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l-2-2m0 0l-2-2m2 2l2-2m-2 2l-2 2m2-2l2 2m1-11a9 9 0 110 18 9 9 0 010-18z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Tips */}
              <div className="mt-8 bg-base-100/50 border border-base-content/10 rounded-lg p-6">
                <h3 className="font-semibold mb-4 text-base-content/90">Quick Tips</h3>
                <ul className="space-y-3 text-sm text-base-content/70">
                  <li className="flex gap-3">
                    <span className="text-primary font-bold flex-shrink-0">•</span>
                    <span>Select your LaTeX project folder from your file system</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold flex-shrink-0">•</span>
                    <span>Project must contain a <code className="bg-base-200 px-2 py-1 rounded text-xs">main.tex</code> file</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold flex-shrink-0">•</span>
                    <span>Git repository is optional but recommended</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-bold flex-shrink-0">•</span>
                    <span>Recent projects are saved for quick access</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Projects or Empty State */}
          <div>
            {projects.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Clock size={20} className="text-primary" />
                  <h2 className="text-2xl font-bold">Recent</h2>
                  <span className="badge badge-primary badge-lg">{projects.length}</span>
                </div>
                <div className="space-y-3">
                  {projects.map((project) => (
                    <button
                      key={project.path}
                      onClick={() => handleRecentProjectClick(project.path)}
                      disabled={isSubmitting}
                      className="w-full text-left group relative"
                    >
                      <div className="bg-base-100 border border-base-content/10 hover:border-primary/50 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:bg-primary/5">
                        <div className="flex items-start gap-3">
                          <FolderOpen
                            size={18}
                            className="text-primary flex-shrink-0 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base-content truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </p>
                            <p className="text-xs text-base-content/60 truncate mt-1">
                              {project.path}
                            </p>
                            <p className="text-xs text-base-content/50 mt-2">
                              {new Date(project.timestamp).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          </div>
                          <ArrowRight
                            size={18}
                            className="text-base-content/40 flex-shrink-0 group-hover:text-primary group-hover:translate-x-1 transition-all"
                          />
                        </div>

                        {/* Delete button on hover */}
                        <button
                          onClick={(e) => handleRemoveProject(e, project.path)}
                          className="absolute top-3 right-3 btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from recent"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-base-100/30 border border-base-content/10 rounded-lg p-8 text-center">
                <div className="w-12 h-12 rounded-lg bg-base-content/10 flex items-center justify-center mx-auto mb-4">
                  <Clock size={24} className="text-base-content/40" />
                </div>
                <p className="text-base-content/60 text-sm">
                  No recent projects yet. Open one to get started!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-base-content/10 bg-base-100/30 backdrop-blur-sm mt-auto">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-base-content/60">
          <p>
            Made with{" "}
            <span className="text-error inline-block mx-1">♥</span>
            for LaTeX enthusiasts
          </p>
        </div>
      </footer>
    </div>
  );
}
