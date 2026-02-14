import React from "react";
import {
  Folder,
  X,
  ChevronRight,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/common";
import { SidebarActions } from "./SidebarActions";

interface SidebarHeaderProps {
  projectRoot: string;
  projectName: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onToggleSearch: () => void;
  onToggleFilter: () => void;
  isSearchOpen: boolean;
  isFilterOpen: boolean;
  selectionCount: number;
  onClearSelection: () => void;
  breadcrumbs?: string[];
  onBreadcrumbClick?: (index: number) => void;
}

export function SidebarHeader({
  projectRoot,
  projectName,
  searchQuery,
  onSearchChange,
  onCreateFile,
  onCreateFolder,
  onToggleSearch,
  onToggleFilter,
  isSearchOpen,
  isFilterOpen,
  selectionCount,
  onClearSelection,
  breadcrumbs = [],
  onBreadcrumbClick,
}: SidebarHeaderProps) {
  const hasBreadcrumbs = breadcrumbs.length > 0;

  return (
    <div className="flex flex-col border-b bg-gradient-to-br from-card/50 to-transparent gap-0 contain-layout will-change-auto">
      {/* Top row: Project name + Actions (always visible, never shifts) */}
      <motion.div
        className="px-3 py-2.5 flex items-center justify-between gap-2 flex-shrink-0 will-change-transform"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
       {/* Project name - fixed height */}
         <div className="flex items-center gap-2 min-w-0 flex-1 h-6">
           <motion.div
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ duration: 0.2, delay: 0.05 }}
             className="shrink-0"
           >
             <Folder size={16} className="text-muted-foreground" />
           </motion.div>
           <motion.p
             className="text-xs text-muted-foreground truncate font-medium"
             title={projectRoot}
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.3, delay: 0.1 }}
           >
             {projectName}
           </motion.p>
         </div>

        {/* Actions - fixed height, never moves */}
        <div className="shrink-0 h-6 flex items-center">
          <SidebarActions
            onSearchToggle={onToggleSearch}
            onFilterToggle={onToggleFilter}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            isSearchOpen={isSearchOpen}
            isFilterOpen={isFilterOpen}
          />
        </div>
      </motion.div>

       {/* Breadcrumbs row - Only shown when breadcrumbs exist (expandable section) */}
       <AnimatePresence mode="wait">
         {hasBreadcrumbs && (
           <motion.div
             key="breadcrumbs"
             layoutId="breadcrumbs-section"
             className="border-t border-border/30 bg-muted/20 flex-shrink-0 overflow-hidden will-change-transform"
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             transition={{ duration: 0.4, ease: "easeInOut" }}
           >
             <motion.nav
               className="px-3 py-2 flex items-center gap-1 text-[10px] text-muted-foreground/70 flex-wrap"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.3, delay: 0.08, ease: "easeInOut" }}
             >
              <motion.button
                onClick={() => onBreadcrumbClick?.(-1)}
                className="hover:text-primary transition-colors shrink-0 p-0.5 rounded hover:bg-accent/30"
                title="Go to root"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Home size={10} />
              </motion.button>
               {breadcrumbs.map((crumb, index) => (
                 <React.Fragment key={index}>
                   <motion.div
                     className="shrink-0 opacity-50"
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 0.5, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.8 }}
                     transition={{ delay: 0.15 + index * 0.05, duration: 0.25, ease: "easeInOut" }}
                   >
                     <ChevronRight size={10} />
                   </motion.div>
                   <motion.button
                     onClick={() => onBreadcrumbClick?.(index)}
                     className="hover:text-primary transition-colors truncate px-1 rounded hover:bg-accent/30"
                     title={crumb}
                     initial={{ opacity: 0, x: -4 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -4 }}
                     transition={{ delay: 0.17 + index * 0.05, duration: 0.25, ease: "easeInOut" }}
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                   >
                    {crumb}
                  </motion.button>
                </React.Fragment>
              ))}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

       {/* Search bar - Expandable section */}
       <AnimatePresence mode="wait">
         {isSearchOpen && (
           <motion.div
             key="search-section"
             layoutId="search-section"
             className="border-t border-border/30 flex-shrink-0 overflow-hidden will-change-transform"
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             transition={{ duration: 0.4, ease: "easeInOut" }}
           >
             <motion.div
               className="px-3 py-2 relative"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.3, delay: 0.08, ease: "easeInOut" }}
             >
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search files..."
                className="pl-7 pr-7 h-7 text-xs"
                autoFocus
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    onClick={() => onSearchChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X size={12} />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

       {/* Selection indicator - Expandable section */}
       <AnimatePresence mode="wait">
         {selectionCount > 0 && (
           <motion.div
             key="selection-section"
             layoutId="selection-section"
             className="border-t border-border/30 bg-muted/20 flex items-center justify-between flex-shrink-0 overflow-hidden will-change-transform"
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             transition={{ duration: 0.4, ease: "easeInOut" }}
           >
             <motion.div
               className="px-3 py-2 flex items-center justify-between w-full"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.3, delay: 0.08, ease: "easeInOut" }}
             >
               <motion.span
                 className="text-xs text-muted-foreground"
                 initial={{ opacity: 0, x: -4 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -4 }}
                 transition={{ duration: 0.25, delay: 0.12, ease: "easeInOut" }}
               >
              {selectionCount} selected
            </motion.span>
             <motion.button
               onClick={onClearSelection}
               className="text-xs text-primary hover:underline transition-colors"
               initial={{ opacity: 0, x: 4 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 4 }}
               transition={{ duration: 0.3, delay: 0.15, ease: "easeInOut" }}
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
             >
               Clear
             </motion.button>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}
