import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Download, Copy, CheckCircle, AlertCircle, Clock, FileText, CloudOff } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/common";
import { downloadArtifact } from "@/services/buildService";
import { useCloudBuild } from "@/hooks/useCloudData";
import { useAuthStore } from "@/stores/authStore";
import { fadeInUp, staggerContainer, staggerItem } from "@/utils/animations";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface BuildDetail {
  id: string;
  projectName: string;
  status: "completed" | "failed" | "running" | "pending";
  engine: string;
  mainFile: string;
  shellEscape: boolean;
  createdAt: string;
  completedAt?: string;
  duration?: number;
  logs: string;
  errorMessage?: string;
  artifacts: Array<{
    type: string;
    size: number;
    url?: string;
  }>;
}

export default function Build() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/build" });
  const buildId = search.id as string | undefined;
  const { isGuest } = useAuthStore();
  
  const [build, setBuild] = useState<BuildDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloadingArtifact, setDownloadingArtifact] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!buildId || !supabase) {
      setIsLoading(false);
      return;
    }

    const fetchBuild = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .eq('id', buildId)
        .single();

      if (error) {
        console.error('Failed to fetch build:', error);
        setBuild(null);
      } else if (data) {
        setBuild({
          id: data.id,
          projectName: data.main_file || "Untitled",
          status: data.status as "completed" | "failed" | "running" | "pending",
          engine: data.engine,
          mainFile: data.main_file || "main.tex",
          shellEscape: data.shell_escape,
          createdAt: data.created_at,
          completedAt: data.status === "completed" ? data.updated_at : undefined,
          logs: data.build_log || "No logs available",
          errorMessage: data.error_message,
          artifacts: data.status === "completed" ? [
            { type: "pdf", size: data.storage_bytes || 0 },
            { type: "log", size: (data.build_log || "").length },
          ] : [],
        });
      }
      setIsLoading(false);
    };

    fetchBuild();
  }, [buildId]);

  const copyBuildId = () => {
    if (build) {
      navigator.clipboard.writeText(build.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = async (type: 'pdf' | 'logs' | 'synctex') => {
    if (!build) return;
    setDownloadingArtifact(type);
    setDownloadError(null);
    try {
      await downloadArtifact(build.id, type);
    } catch (err) {
      console.error('Download failed:', err);
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
      setTimeout(() => setDownloadError(null), 3000);
    } finally {
      setDownloadingArtifact(null);
    }
  };

  const getStatusIcon = () => {
    if (!build) return null;
    switch (build.status) {
      case "completed":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-6 w-6 text-[var(--destructive)]" />;
      case "running":
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="h-6 w-6 text-[var(--primary)]" />
          </motion.div>
        );
      default:
        return <Clock className="h-6 w-6 text-[var(--muted-foreground)]" />;
    }
  };

  const getStatusColor = () => {
    if (!build) return "";
    switch (build.status) {
      case "completed":
        return "text-green-600 dark:text-green-400";
      case "failed":
        return "text-[var(--destructive)]";
      case "running":
        return "text-[var(--primary)]";
      default:
        return "text-[var(--muted-foreground)]";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  if (isGuest()) {
    return (
      <motion.div
        className="min-h-screen bg-[var(--background)] flex items-center justify-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem} className="text-center max-w-md px-6">
          <CloudOff className="h-16 w-16 mx-auto mb-4 text-[var(--muted-foreground)]" />
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
            Cloud Features Unavailable
          </h1>
          <p className="text-[var(--muted-foreground)] mb-6">
            Sign in to view build details and access your cloud builds.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>
            Go Home
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="h-8 w-8 text-[var(--primary)]" />
        </motion.div>
      </div>
    );
  }

  if (!build) {
    return (
      <motion.div
        className="min-h-screen bg-[var(--background)]"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm"
          variants={staggerItem}
        >
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/dashboard" })}
                className="rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                Build Not Found
              </h1>
            </div>
          </div>
        </motion.div>
        <div className="max-w-4xl mx-auto px-6 py-8 text-center">
          <p className="text-[var(--muted-foreground)]">
            The build you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-[var(--background)]"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        className="border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-sm sticky top-0 z-10"
        variants={staggerItem}
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/dashboard" })}
              className="rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              Build Details
            </h1>
          </div>

          {/* Build Status */}
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className={cn("font-semibold text-lg", getStatusColor())}>
                {build.status.charAt(0).toUpperCase() + build.status.slice(1)}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {build.projectName}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Metadata Grid */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={staggerContainer}
        >
          <motion.div
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
            variants={staggerItem}
          >
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Engine
            </p>
            <p className="font-semibold text-[var(--foreground)]">
              {build.engine}
            </p>
          </motion.div>

          <motion.div
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
            variants={staggerItem}
          >
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Duration
            </p>
            <p className="font-semibold text-[var(--foreground)]">
              {formatDuration(build.duration)}
            </p>
          </motion.div>

          <motion.div
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
            variants={staggerItem}
          >
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Created
            </p>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {formatDate(build.createdAt)}
            </p>
          </motion.div>

          <motion.div
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
            variants={staggerItem}
          >
            <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">
              Build ID
            </p>
            <button
              onClick={copyBuildId}
              className="text-sm font-mono text-[var(--primary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1"
              title="Copy build ID"
            >
              {build.id.slice(0, 12)}...
              <Copy className="h-3 w-3" />
            </button>
            {copied && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Copied!
              </p>
            )}
          </motion.div>
        </motion.div>

        {/* Download Error */}
        {downloadError && (
          <motion.div
            className="mb-6 rounded-lg border border-[var(--destructive)]/50 bg-red-50 dark:bg-red-950 p-4"
            variants={staggerItem}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm text-[var(--destructive)]">
              {downloadError}
            </p>
          </motion.div>
        )}

        {/* Artifacts */}
        {build.artifacts.length > 0 && (
          <motion.div
            className="mb-8"
            variants={staggerItem}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">
                Artifacts
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Generated files ({build.artifacts.length})
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* PDF Artifact */}
              {build.status === "completed" && (
                <motion.div
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
                  variants={staggerItem}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[var(--primary)]" />
                      <p className="font-medium text-[var(--foreground)]">
                        PDF Document
                      </p>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Main output file
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload('pdf')}
                    disabled={downloadingArtifact === 'pdf'}
                    className="rounded-lg"
                  >
                    {downloadingArtifact === 'pdf' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Clock className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span className="ml-2">Download PDF</span>
                  </Button>
                </motion.div>
              )}

              {/* Log Artifact */}
              <motion.div
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
                variants={staggerItem}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <p className="font-medium text-[var(--foreground)]">
                      Build Logs
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Compilation output
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload('logs')}
                  disabled={downloadingArtifact === 'logs'}
                  className="rounded-lg"
                >
                  {downloadingArtifact === 'logs' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Logs */}
        <motion.div variants={staggerItem}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Compilation Logs
            </h2>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-4 overflow-auto max-h-96">
            <pre className="text-xs font-mono text-[var(--foreground)] whitespace-pre-wrap break-words">
              {build.logs}
            </pre>
          </div>
        </motion.div>

        {/* Error Message (if any) */}
        {build.status === "failed" && build.errorMessage && (
          <motion.div
            className="mt-8 rounded-lg border border-[var(--destructive)]/50 bg-red-50 dark:bg-red-950 p-4"
            variants={staggerItem}
          >
            <p className="font-semibold text-[var(--destructive)] mb-2">
              Build Error
            </p>
            <p className="text-sm text-[var(--foreground)]">
              {build.errorMessage}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}