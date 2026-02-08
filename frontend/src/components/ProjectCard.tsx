import { Trash2, FolderOpen, ArrowRight, Calendar } from "lucide-react";
import { RecentProject } from "../stores/recentProjectsStore";

interface ProjectCardProps {
  project: RecentProject;
  onSelect: (path: string) => void;
  onRemove: (path: string) => void;
  isLoading?: boolean;
}

export default function ProjectCard({
  project,
  onSelect,
  onRemove,
  isLoading,
}: ProjectCardProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today at " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday at " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  return (
    <button
      onClick={() => onSelect(project.path)}
      disabled={isLoading}
      className="group w-full text-left relative"
    >
      <div className="bg-base-100 border border-base-content/10 hover:border-primary/50 hover:bg-primary/5 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-stretch gap-4">
        {/* Icon Container */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/40 group-hover:to-secondary/40 transition-colors">
          <FolderOpen size={18} className="text-primary" />
        </div>

        {/* Content - Flexible */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-semibold text-base-content truncate group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-base-content/60 truncate mt-1 font-mono">
            {project.path}
          </p>
          <div className="flex items-center gap-1 text-xs text-base-content/50 mt-2">
            <Calendar size={12} />
            {formatDate(project.timestamp)}
          </div>
        </div>

        {/* Arrow - Always visible on right */}
        <ArrowRight
          size={18}
          className="text-base-content/30 flex-shrink-0 self-center group-hover:text-primary group-hover:translate-x-1 transition-all"
        />

        {/* Delete button on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(project.path);
          }}
          className="absolute top-3 right-3 btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/20 hover:text-error"
          title="Remove from recent"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </button>
  );
}
