import { Trash2, FolderOpen, Calendar } from "lucide-react";
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
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const getProjectInitials = (name: string) => {
    return name
      .split(/[\s\-_]/)
      .filter((word) => word.length > 0)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("");
  };

  const initials = getProjectInitials(project.name);

  return (
    <div className="group w-full text-left">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-base-100 to-base-100/50 border border-base-content/5 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 cursor-pointer" onClick={() => onSelect(project.path)}>
        {/* Top accent bar */}
         <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-primary via-secondary to-primary opacity-0 group-hover:opacity-100 transition-opacity" />

         {/* Main content */}
         <div className="p-5">
           {/* Header with icon and actions */}
           <div className="flex items-start justify-between gap-3 mb-4">
             {/* Icon with gradient background */}
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary/25 via-primary/15 to-secondary/20 flex items-center justify-center shrink-0 group-hover:from-primary/35 group-hover:via-primary/25 group-hover:to-secondary/30 transition-all duration-300 shadow-md">
                 {initials ? (
                   <span className="text-sm font-bold text-primary">{initials}</span>
                 ) : (
                   <FolderOpen size={20} className="text-primary" />
                 )}
               </div>

               {/* Title - Primary content */}
               <div className="flex-1 min-w-0">
                 <h3 className="font-semibold text-base text-base-content group-hover:text-primary transition-colors truncate leading-tight">
                   {project.name}
                 </h3>
               </div>
             </div>

             {/* Delete button - On hover */}
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 onRemove(project.path);
               }}
                className="shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-error/15 hover:text-error text-base-content/40"
               title="Remove from recent"
             >
               <Trash2 size={16} />
             </button>
           </div>

           {/* Path - Secondary content */}
           <div className="mb-4 px-0.5">
             <p className="text-xs font-mono text-base-content/50 truncate hover:text-base-content/70 transition-colors break-all line-clamp-2">
               {project.path}
             </p>
           </div>

           {/* Footer with metadata */}
           <div className="flex items-center justify-between pt-3 border-t border-base-content/5">
              <div className="flex items-center gap-2 text-xs text-base-content/50">
                <Calendar size={14} className="shrink-0" />
               <span>{formatDate(project.timestamp)}</span>
             </div>

             {/* Time hint on hover */}
             <div className="text-xs text-base-content/40 opacity-0 group-hover:opacity-100 transition-opacity">
               <span className="text-primary font-medium">Open</span>
             </div>
           </div>
         </div>

         {/* Loading state overlay */}
         {isLoading && (
           <div className="absolute inset-0 bg-base-100/50 backdrop-blur-sm flex items-center justify-center">
             <span className="loading loading-spinner loading-sm text-primary"></span>
           </div>
         )}
       </div>
     </div>
   );
}
