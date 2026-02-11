import React, { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import { TreeNode as TreeNodeType } from "../../utils/treeUtils";
import { getFileIcon } from "../../utils/icons";
import { cn } from "../../lib/utils";

interface TreeNodeProps {
  node: TreeNodeType;
  isExpanded: boolean;
  isActive: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

export const TreeNode = memo(function TreeNode({
  node,
  isExpanded,
  isActive,
  isSelected,
  onToggle,
  onOpen,
  onSelect,
  onContextMenu,
  children,
}: TreeNodeProps) {
  const handleClick = (e: React.MouseEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const hasModifier = isCtrl || isShift;
    
    if (node.isDir) {
      // Folder: toggle expand/collapse, or toggle select if modifier key
      if (hasModifier) {
        // Only toggle selection if clicking on the folder itself, not the chevron
        const isChevronClick = (e.target as HTMLElement)?.closest('button');
        if (!isChevronClick) {
          onSelect(e);
        }
      } else {
        // Clear selection when clicking folder without modifier
        onSelect(e);
        onToggle();
      }
    } else {
      // File: open it, or toggle select if modifier key
      if (hasModifier) {
        onSelect(e);
      } else {
        // Clear selection when clicking file without modifier, then open
        onSelect(e);
        onOpen();
      }
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

   return (
     <div className={cn("overflow-visible", isSelected && "my-1")}>
         <motion.div
           className={cn(
             "group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 mr-2 w-full tree-node-motion",
             // Styling based on state
             isActive
               ? "bg-primary/25 font-semibold shadow-lg ring-1.5 ring-primary/60 text-primary hover:bg-primary/35"
               : isSelected
               ? "bg-primary/10 ring-1 ring-primary/25 text-foreground/95 hover:bg-primary/18 shadow-sm"
               : "hover:bg-accent/50"
           )}
           style={{ paddingLeft: `${0.75 + node.depth * 1}rem` }}
           onClick={handleClick}
           onContextMenu={onContextMenu}
           initial={{ opacity: 0, x: -2 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.2, ease: "easeOut" }}
         >
        {/* Expand/collapse chevron for folders */}
        {node.isDir && (
          <button
            onClick={handleChevronClick}
            className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
            style={{ touchAction: 'none' }}
          >
            <ChevronRight
              size={14}
              className={cn(
                "text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        )}
        {!node.isDir && <div className="w-5" />}

         {/* File/Folder icon and name */}
         <div className="flex-1 flex items-center gap-2 min-w-0">
           <span className={cn("shrink-0", isActive && "text-primary")}>
             {node.isDir ? (
               isExpanded ? (
                 <FolderOpen size={16} className="text-amber-500" />
               ) : (
                 <Folder size={16} className="text-amber-500" />
               )
             ) : (
               getFileIcon(node.name, false)
             )}
           </span>
            <span
              className={cn(
                "truncate text-sm",
                node.isDir ? "font-medium" : "",
                isActive ? "text-primary font-semibold" : "text-foreground/90"
              )}
            >
            {node.name}
           </span>
         </div>
       </motion.div>

       {/* Children with smooth container animation */}
       <AnimatePresence mode="wait">
         {children && isExpanded && (
           <motion.div
             key={`expanded-${node.path}`}
             layoutId={`children-${node.path}`}
             initial={{ opacity: 0, height: 0 }}
             animate={{ opacity: 1, height: "auto" }}
             exit={{ opacity: 0, height: 0 }}
             transition={{ 
               duration: 0.4,
               ease: "easeInOut"
             }}
             className="overflow-hidden"
           >
             {children}
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
});
