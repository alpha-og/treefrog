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
        onToggle();
      }
    } else {
      // File: open it, or toggle select if modifier key
      if (hasModifier) {
        onSelect(e);
      } else {
        onOpen();
      }
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div>
       <motion.div
         className={cn(
           "group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-150",
           isActive
             ? "bg-primary/15 font-medium border-l-2 border-primary shadow-sm"
             : isSelected
             ? "bg-primary/25 border-l-2 border-primary/60 shadow-sm"
             : "hover:bg-accent/50"
         )}
         style={{ paddingLeft: `${0.5 + node.depth * 1}rem` }}
         onClick={handleClick}
         onContextMenu={onContextMenu}
         initial={{ opacity: 0, x: -2 }}
         animate={{ opacity: 1, x: 0, scale: isSelected ? 1.01 : 1 }}
         transition={{ duration: 0.2, ease: "easeOut" }}
         layout
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
          <span className="shrink-0">
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
               isActive 
                 ? "text-foreground" 
                 : isSelected
                 ? "text-foreground font-medium"
                 : "text-foreground/90"
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
