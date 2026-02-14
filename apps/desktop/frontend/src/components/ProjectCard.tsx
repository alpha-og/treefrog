import { Trash2, FolderOpen, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { RecentProject } from "@/stores/recentProjectsStore";
import { cn } from "@/lib/utils";

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
    <motion.div
      className="group w-full text-left"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      whileHover="hover"
    >
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-card border cursor-pointer",
          "transition-all duration-300"
        )}
        onClick={() => onSelect(project.path)}
        variants={{
          hover: {
            y: -4,
            boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15)",
            transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
          }
        }}
      >
        {/* Top accent bar */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary"
          initial={{ opacity: 0 }}
          variants={{
            hover: { opacity: 1 }
          }}
        />

         {/* Main content */}
         <div className="p-5">
           {/* Header with icon and actions */}
           <div className="flex items-start justify-between gap-3 mb-4 min-w-0">
             {/* Icon with gradient background */}
             <div className="flex items-center gap-3 min-w-0 flex-1">
               <motion.div 
                 className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/25 via-primary/15 to-secondary/20 flex items-center justify-center shrink-0 shadow-md"
                 variants={{
                   hover: {
                     background: "linear-gradient(135deg, oklch(0.65 0.15 45 / 0.35), oklch(0.65 0.15 45 / 0.25), oklch(0.75 0.1 60 / 0.3))"
                   }
                 }}
               >
                 {initials ? (
                   <span className="text-sm font-bold text-primary">{initials}</span>
                 ) : (
                   <FolderOpen size={20} className="text-primary" />
                 )}
               </motion.div>

               {/* Title - Primary content */}
               <div className="flex-1 min-w-0">
                 <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate leading-tight" title={project.name}>
                   {project.name}
                 </h3>
               </div>
             </div>

             {/* Delete button - On hover */}
             <motion.button
               onClick={(e) => {
                 e.stopPropagation();
                 onRemove(project.path);
               }}
               className="shrink-0 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-destructive/15 hover:text-destructive text-muted-foreground"
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               title="Remove from recent"
             >
               <Trash2 size={16} />
             </motion.button>
           </div>

           {/* Path - Secondary content */}
           <div className="mb-4 px-0.5 min-w-0">
             <p className="text-xs font-mono text-muted-foreground hover:text-foreground/70 transition-colors truncate" title={project.path}>
               {project.path}
             </p>
           </div>

          {/* Footer with metadata */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar size={14} className="shrink-0" />
              <span>{formatDate(project.timestamp)}</span>
            </div>

            {/* Time hint on hover */}
            <motion.div 
              className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              initial={{ x: -5 }}
              variants={{
                hover: { x: 0 }
              }}
            >
              <span className="text-primary font-medium">Open</span>
            </motion.div>
          </div>
        </div>

        {/* Loading state overlay */}
        {isLoading && (
          <motion.div 
            className="absolute inset-0 bg-card/50 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
