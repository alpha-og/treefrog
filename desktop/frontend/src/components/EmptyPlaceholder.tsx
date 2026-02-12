import { Settings } from "lucide-react";
import { motion } from "motion/react";

export default function EmptyPlaceholder() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      <motion.div
        animate={{ 
          rotate: [0, 10, -10, 0],
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Settings size={48} className="opacity-30" />
      </motion.div>
      <div className="text-center">
        <div className="text-sm font-semibold mb-1">
          All panes hidden
        </div>
        <div className="text-xs opacity-70">
          Use the panel icons in the toolbar to show panes
        </div>
      </div>
    </motion.div>
  );
}
