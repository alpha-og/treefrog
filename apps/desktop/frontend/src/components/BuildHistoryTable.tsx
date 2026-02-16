import { motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/common";
import { downloadArtifact } from "@/services/buildService";
import { cn } from "@/lib/utils";

export interface BuildHistoryItem {
  id: string;
  projectName: string;
  status: "completed" | "failed" | "running" | "queued";
  engine?: string;
  createdAt?: string;
  duration?: number;
  artifacts?: number;
}

interface BuildHistoryTableProps {
  builds: BuildHistoryItem[];
  isLoading?: boolean;
  onBuildClick?: (buildId: string) => void;
  onDownloadError?: (error: string) => void;
  className?: string;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-[var(--destructive)]" />;
    case "running":
      return (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="h-4 w-4 text-[var(--primary)]" />
        </motion.div>
      );
    case "queued":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />;
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "running":
      return "Running";
    case "queued":
      return "Queued";
    default:
      return "Unknown";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950";
    case "failed":
      return "text-[var(--destructive)] bg-red-50 dark:bg-red-950";
    case "running":
      return "text-[var(--primary)] bg-[var(--primary)]/10";
    case "queued":
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950";
    default:
      return "text-[var(--muted-foreground)] bg-[var(--muted)]";
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function BuildHistoryTable({
  builds,
  isLoading = false,
  onBuildClick,
  onDownloadError,
  className,
}: BuildHistoryTableProps) {
  const navigate = useNavigate();
  const [downloadingBuildId, setDownloadingBuildId] = useState<string | null>(null);

  const handleDownload = async (buildId: string) => {
    setDownloadingBuildId(buildId);
    try {
      await downloadArtifact(buildId, 'pdf');
    } catch (err) {
      console.error('Download failed:', err);
      onDownloadError?.(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingBuildId(null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("rounded-lg border border-[var(--border)]", className)}>
        <div className="p-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Clock className="h-8 w-8 text-[var(--primary)] mx-auto mb-2" />
          </motion.div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Loading build history...
          </p>
        </div>
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className={cn("rounded-lg border border-[var(--border)]", className)}>
        <div className="p-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            No builds yet. Start building to see your history!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] overflow-hidden",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                Project
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                Engine
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                Duration
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                Created
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                Actions
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {builds.map((build, idx) => (
              <motion.tr
                key={build.id}
                className="border-b border-[var(--border)] hover:bg-[var(--muted)]/30 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.2 }}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-[var(--foreground)]">
                    {build.projectName}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {build.id}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="text-[var(--foreground)]">
                    {build.engine}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div
                    className={cn(
                      "inline-flex items-center gap-2 px-2 py-1 rounded-md text-xs font-medium",
                      getStatusColor(build.status)
                    )}
                  >
                    {getStatusIcon(build.status)}
                    {getStatusText(build.status)}
                  </div>
                </td>

                <td className="px-4 py-3 text-[var(--foreground)]">
                  {formatDuration(build.duration)}
                </td>

                <td className="px-4 py-3 text-[var(--muted-foreground)]">
                  {build.createdAt ? formatDate(build.createdAt) : "—"}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {build.status === "completed" && build.artifacts !== undefined && build.artifacts > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Download PDF"
                        onClick={() => handleDownload(build.id)}
                        disabled={downloadingBuildId === build.id}
                      >
                        {downloadingBuildId === build.id ? (
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
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        onBuildClick?.(build.id);
                        navigate({ to: `/build/${build.id}` });
                      }}
                      title="View details"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
