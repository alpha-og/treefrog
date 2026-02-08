import { useState, useEffect } from "react";
import { Clock, FolderPlus, Settings } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useRecentProjectsStore } from "../stores/recentProjectsStore";
import { useAppStore } from "../stores/appStore";
import { openProjectDialog } from "../services/projectService";
import SettingsModal from "../components/SettingsModal";
import ProjectCard from "../components/ProjectCard";
import TitleBar from "../components/TitleBar";

interface HomeProps {
  onSelectProject?: (path: string) => Promise<void>;
  loading?: boolean;
}

export default function Home({ onSelectProject, loading }: HomeProps) {
  const navigate = useNavigate();
  const { projects, removeProject } = useRecentProjectsStore();
  const { builderUrl, builderToken, setBuilderUrl, setBuilderToken } = useAppStore();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  const handleSaveSettings = (url: string, token: string) => {
    setBuilderUrl(url);
    setBuilderToken(token);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-100 to-base-200 flex flex-col">
      {/* Frameless Title Bar */}
      <TitleBar title="Treefrog" />

      {/* Header - Minimalist and Clean */}
      <header className="border-b border-base-content/5 bg-base-100/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-6 md:py-8">
          <div className="flex items-center justify-between gap-4">
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-secondary to-primary flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">ƒ</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  Treefrog
                </h1>
                <p className="text-xs md:text-sm text-base-content/60 mt-0.5">
                  Modern LaTeX editor with remote compilation
                </p>
              </div>
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-ghost btn-circle hover:bg-primary/10 transition-all"
              title="Builder settings"
            >
              <Settings size={20} className="text-primary" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 md:py-16">
        <div className="space-y-16">
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
              <div className="bg-gradient-to-br from-primary/10 via-secondary/5 to-base-100 border border-primary/20 rounded-2xl p-8 md:p-10 hover:border-primary/40 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8">
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold mb-2">Open Your Project</h3>
                    <p className="text-base-content/70 text-sm md:text-base leading-relaxed">
                      Select your LaTeX project folder. Treefrog will detect your main.tex file and set up
                      everything automatically. Your project will be saved to your recent list for quick access.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenProjectDialog}
                    disabled={isSubmitting || loading}
                    className="btn btn-primary btn-lg gap-3 whitespace-nowrap shadow-lg hover:shadow-xl transition-all flex-shrink-0"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Opening...
                      </>
                    ) : (
                      <>
                        <FolderPlus size={20} />
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
                <div className="bg-base-100/50 border border-base-content/10 rounded-2xl p-12 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-base-content/10 flex items-center justify-center">
                      <Clock size={32} className="text-base-content/30" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-base-content/70 mb-2">
                    No recent projects
                  </h3>
                  <p className="text-sm text-base-content/60 max-w-sm mx-auto">
                    When you open a project, it will appear here for quick access next time
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-base-content/5 bg-base-100/30 backdrop-blur-xl mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-base-content/60">
              Made with <span className="text-error">♥</span> for LaTeX enthusiasts
            </p>
            <div className="flex items-center gap-6 text-xs text-base-content/60">
              <a href="#" className="hover:text-primary transition-colors">
                Documentation
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                GitHub
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        builderUrl={builderUrl}
        builderToken={builderToken}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
