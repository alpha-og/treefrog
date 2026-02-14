import { motion } from "motion/react";
import { HardDrive, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StorageUsageWidgetProps {
  usedGB: number;
  limitGB: number;
  className?: string;
}

export function StorageUsageWidget({
  usedGB,
  limitGB,
  className,
}: StorageUsageWidgetProps) {
  const percentage = Math.min((usedGB / limitGB) * 100, 100);
  const isWarning = percentage > 80;
  const isCritical = percentage > 95;

  const getColor = () => {
    if (isCritical) return "from-[var(--destructive)]";
    if (isWarning) return "from-orange-500";
    return "from-[var(--primary)]";
  };

  const getTextColor = () => {
    if (isCritical) return "text-[var(--destructive)]";
    if (isWarning) return "text-orange-500";
    return "text-[var(--primary)]";
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--card)] p-4",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-[var(--muted-foreground)]" />
          <span className="text-sm font-medium">Storage Usage</span>
        </div>
        {(isWarning || isCritical) && (
          <AlertCircle className={cn("h-4 w-4", getTextColor())} />
        )}
      </div>

      <div className="space-y-2">
        {/* Progress bar */}
        <div className="relative w-full h-2 rounded-full bg-[var(--muted)] overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full bg-gradient-to-r to-[var(--accent)]",
              getColor()
            )}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>

        {/* Usage text */}
        <div className="flex items-center justify-between text-xs">
          <span className={cn("font-medium", getTextColor())}>
            {usedGB.toFixed(2)} GB used
          </span>
          <span className="text-[var(--muted-foreground)]">
            of {limitGB} GB
          </span>
        </div>

        {/* Status message */}
        {isCritical && (
          <p className="text-xs text-[var(--destructive)] mt-2">
            Storage nearly full. Please clean up or upgrade.
          </p>
        )}
        {isWarning && !isCritical && (
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
            Storage usage is high. Consider upgrading soon.
          </p>
        )}
      </div>

      {/* Percentage display */}
      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <div className="text-center">
          <span className={cn("text-2xl font-bold", getTextColor())}>
            {percentage.toFixed(0)}%
          </span>
          <p className="text-xs text-[var(--muted-foreground)]">used</p>
        </div>
      </div>
    </div>
  );
}
