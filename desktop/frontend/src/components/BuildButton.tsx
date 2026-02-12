import { Zap, Check, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenuWrapper,
  DropdownMenuTrigger,
  DropdownMenuContentWrapper,
  MenuItem,
  DropdownMenuRadioGroup,
  MenuRadioItem,
  DropdownMenuSeparator,
  MenuIcon,
} from "@/components/common/Menu";

interface BuildButtonProps {
  onBuild: () => void;
  engine: string;
  onEngineChange: (engine: string) => void;
  shell: boolean;
  onShellChange: (shell: boolean) => void;
}

const ENGINES = ["pdflatex", "xelatex", "lualatex"];

export default function BuildButton({
  onBuild,
  engine,
  onEngineChange,
  shell,
  onShellChange,
}: BuildButtonProps) {
  return (
    <div style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
      <div className="flex items-center rounded-lg bg-primary overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
         {/* Main Build Button */}
         <motion.button
           className={cn(
             "flex items-center gap-2 px-4 py-2 flex-1 cursor-pointer",
             "text-primary-foreground font-medium text-sm",
             "hover:bg-primary/90 transition-all duration-150",
             "active:scale-95"
           )}
           onClick={onBuild}
           whileHover={{ backgroundColor: "var(--color-primary-/0.9)" }}
           whileTap={{ scale: 0.98 }}
           title="Build document (⌘B)"
         >
           <motion.div
             whileHover={{ scale: 1.15, rotate: 10 }}
             whileTap={{ scale: 0.9 }}
             transition={{ type: "spring", stiffness: 400, damping: 10 }}
           >
             <Zap size={16} className="shrink-0" />
           </motion.div>
           <span>Build</span>
         </motion.button>

        {/* Divider */}
        <div className="w-px h-6 bg-primary-foreground/20" />

         {/* Dropdown Trigger with Chevron */}
         <DropdownMenuWrapper>
           <DropdownMenuTrigger asChild>
             <motion.button
               className={cn(
                 "flex items-center justify-center px-2 py-2 cursor-pointer",
                 "text-primary-foreground",
                 "hover:bg-primary/80 transition-all duration-150",
                 "active:scale-95"
               )}
               whileHover={{ backgroundColor: "var(--color-primary-/0.8)" }}
               whileTap={{ scale: 0.98 }}
               title="Build settings"
             >
               <ChevronDown size={16} className="shrink-0" />
             </motion.button>
           </DropdownMenuTrigger>
          <DropdownMenuContentWrapper align="end" className="w-56">
            {/* Engine Selection */}
            <div className="px-3 py-2">
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                LaTeX Engine
              </div>
            </div>

            <DropdownMenuRadioGroup value={engine} onValueChange={onEngineChange}>
              {ENGINES.map((eng) => (
                <MenuRadioItem 
                  key={eng} 
                  value={eng}
                  className={cn(
                    "flex items-center gap-2",
                    engine === eng && "bg-primary/20 text-primary font-semibold"
                  )}
                >
                  <MenuIcon name="engine" size={16} />
                  <span className="flex-1">{eng}</span>
                  {engine === eng && <Check size={14} className="ml-auto" />}
                </MenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />

            {/* Shell Escape Option */}
            <MenuItem
              onClick={() => onShellChange(!shell)}
              className={cn(
                "flex items-center justify-between",
                shell && "bg-primary/20 text-primary font-semibold"
              )}
            >
              <div className="flex items-center gap-2">
                <MenuIcon name="shell-escape" size={16} />
                <span>Shell-escape</span>
              </div>
              <div className="flex items-center gap-2">
                {shell && <Check size={14} />}
                <span className={cn("text-xs", shell ? "text-primary font-semibold" : "text-muted-foreground")}>{shell ? "On" : "Off"}</span>
              </div>
            </MenuItem>
          </DropdownMenuContentWrapper>
        </DropdownMenuWrapper>
      </div>
    </div>
  );
}
