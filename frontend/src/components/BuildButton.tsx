import { useState } from "react";
import { Zap, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/common/Button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface BuildButtonProps {
  onBuild: () => void;
  engine: string;
  onEngineChange: (engine: string) => void;
  shell: boolean;
  onShellChange: (shell: boolean) => void;
}

export default function BuildButton({
  onBuild,
  engine,
  onEngineChange,
  shell,
  onShellChange,
}: BuildButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const engines = ["pdflatex", "xelatex", "lualatex"];

  return (
    <div className="relative flex items-center" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
      {/* Main Build Button */}
      <Button
        onClick={onBuild}
        className="rounded-r-none border-r-0"
        title="Build document"
      >
        <Zap size={16} />
        Build
      </Button>

      {/* Dropdown Trigger */}
      <Button
        onClick={() => setShowMenu(!showMenu)}
        className="rounded-l-none px-2"
        title="Build settings"
      >
        <ChevronDown size={16} />
      </Button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              className="absolute right-0 top-full mt-2 w-64 bg-card border rounded-xl shadow-xl z-50 overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            >
              {/* Engine Selection */}
              <div className="p-4 border-b">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                  LaTeX Engine
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {engines.map((eng) => (
                    <motion.button
                      key={eng}
                      onClick={() => {
                        onEngineChange(eng);
                        setShowMenu(false);
                      }}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-medium transition-all",
                        engine === eng
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {eng}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Shell Escape Option */}
              <div className="p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Switch
                    checked={shell}
                    onCheckedChange={onShellChange}
                  />
                  <span className="text-sm font-medium">Enable shell-escape</span>
                </label>
              </div>
            </motion.div>

            {/* Backdrop to close menu */}
            <motion.div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
