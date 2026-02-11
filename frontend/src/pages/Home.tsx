import { useState, useEffect } from "react";
import { Clock, FolderPlus, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import { useRecentProjectsStore } from "@/stores/recentProjectsStore";
import { useAppStore } from "@/stores/appStore";
import { openProjectDialog } from "@/services/projectService";
import ProjectCard from "@/components/ProjectCard";
import FramelessWindow from "@/components/FramelessWindow";
import { Button } from "@/components/common/Button";
import { GlowCard } from "@/components/common/Card";
import { Alert } from "@/components/common/Alert";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";

interface HomeProps {
  onSelectProject?: (path: string) => Promise<void>;
  loading?: boolean;
}

export default function Home({ onSelectProject, loading }: HomeProps) {
  const navigate = useNavigate();
  const { projects, removeProject } = useRecentProjectsStore();
  const { setCompilerUrl, setCompilerToken } = useAppStore();
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
      <div className="h-screen bg-gradient-to-br from-muted via-background to-muted flex flex-col" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
        {/* Header with Settings */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0">
          <div></div>
          <motion.button
            onClick={() => navigate({ to: "/settings" })}
            className="p-2 rounded-lg hover:bg-primary/10 transition-all"
            title="Settings"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={18} className="text-primary" />
          </motion.button>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pb-6">
            <motion.div
              className="space-y-12"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {/* Section 1: Create/Open Project */}
              <motion.section variants={staggerItem}>
                  <div className="space-y-4 sm:space-y-6">
                    {/* Section Header */}
                    <div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Get Started</h2>
                      <p className="text-muted-foreground text-sm sm:text-base">
                      Create a new project or choose an existing one from your file system
                    </p>
                  </div>

                  {/* Primary Action Card */}
                   <GlowCard>
                     <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                       <div className="flex-1 min-w-0">
                         <h3 className="text-base sm:text-lg md:text-xl font-bold mb-2">Open Your Project</h3>
                         <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                          Select your LaTeX project folder. Treefrog will detect your main.tex file and set up
                          everything automatically. Your project will be saved to your recent list for quick access.
                        </p>
                      </div>
                       <Button
                         onClick={handleOpenProjectDialog}
                         loading={isSubmitting || loading}
                         className="whitespace-nowrap flex-shrink-0 w-full sm:w-auto"
                       >
                         <FolderPlus size={18} />
                         Choose Folder
                       </Button>
                    </div>
                  </GlowCard>

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Alert
                        variant="error"
                        message={error}
                        onClose={() => setError("")}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.section>

              {/* Divider */}
              <motion.div
                className="flex items-center gap-4"
                variants={staggerItem}
              >
                <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                <span className="text-xs text-muted-foreground font-medium">OR</span>
                <div className="flex-1 h-px bg-gradient-to-l from-border to-transparent" />
              </motion.div>

              {/* Section 2: Recent Projects */}
              <motion.section variants={staggerItem}>
                <div className="space-y-6">
                  {/* Section Header */}
                   <div>
                     <div className="flex items-center gap-3 mb-2">
                       <Clock size={20} className="text-primary" />
                       <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Recent Projects</h2>
                     </div>
                     <p className="text-muted-foreground text-sm sm:text-base">
                      {storeHydrated && projects.length > 0
                        && `You have ${projects.length} recent project${projects.length !== 1 ? "s" : ""}`
                      }
                    </p>
                  </div>

                   {/* Recent Projects Grid */}
                   {storeHydrated && projects && projects.length > 0 ? (
                     <motion.div
                       key={`projects-grid-${projects.length}`}
                       className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                    >
                      {projects.map((project, index) => (
                        <motion.div
                          key={project.path}
                          variants={staggerItem}
                          custom={index}
                        >
                          <ProjectCard
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
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                     <motion.div
                       className="bg-gradient-to-br from-card/50 to-card/30 border border-border/50 rounded-2xl p-6 sm:p-8 md:p-12 text-center"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                       <div className="flex justify-center mb-4">
                         <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                           <Clock size={20} className="text-muted-foreground" />
                         </div>
                       </div>
                       <h3 className="text-base sm:text-lg font-semibold text-foreground/80 mb-2">
                         No recent projects yet
                       </h3>
                       <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                        When you open a project, it will appear here for quick access next time
                      </p>
                    </motion.div>
                  )}
                </div>
              </motion.section>
            </motion.div>
          </div>
        </main>
      </div>
    </FramelessWindow>
  );
}
