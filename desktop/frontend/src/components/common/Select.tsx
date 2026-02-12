import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { LucideIcon, ChevronDown } from "lucide-react";
import {
  fadeInUp,
  ANIMATION_DURATIONS,
} from "@/utils/animations";
import { useAnimation, useReducedMotion } from "@/utils/animation-context";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: LucideIcon;
  error?: string;
  label?: string;
  animated?: boolean;
  options?: Array<{
    value: string;
    label: string;
    group?: string;
  }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      icon: Icon,
      error,
      label,
      animated = true,
      disabled,
      options,
      children,
      ...props
    },
    ref
  ) => {
    const { animationsEnabled } = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

    // Group options if provided
    const groupedOptions = options
      ? Object.entries(
          options.reduce((acc: Record<string, typeof options>, opt) => {
            const group = opt.group || "default";
            if (!acc[group]) acc[group] = [];
            acc[group].push(opt);
            return acc;
          }, {})
        )
      : [];

    return (
      <div className="w-full">
        {label && (
          <label className="text-sm font-medium text-foreground mb-2 block">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <motion.div
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
              initial={shouldAnimate ? { scale: 0.8, opacity: 0 } : undefined}
              animate={shouldAnimate ? { scale: 1, opacity: 1 } : undefined}
              transition={
                shouldAnimate
                  ? { duration: ANIMATION_DURATIONS.normal }
                  : undefined
              }
            >
              <Icon size={16} />
            </motion.div>
          )}

          <motion.select
            className={cn(
              "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 appearance-none",
              Icon && "pl-10",
              "pr-9",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            disabled={disabled}
            initial={shouldAnimate ? { opacity: 0, y: 5 } : undefined}
            animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            whileFocus={
              shouldAnimate
                ? {
                    boxShadow: "0 0 0 3px oklch(0.65 0.15 30 / 0.1)",
                    scale: 1.002,
                  }
                : undefined
            }
            transition={
              shouldAnimate
                ? { duration: ANIMATION_DURATIONS.normal }
                : undefined
            }
            {...props}
          >
            {options ? (
              groupedOptions.map(([group, opts]) => (
                <optgroup key={group} label={group === "default" ? undefined : group}>
                  {opts.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              children
            )}
          </motion.select>

          {/* Custom chevron icon */}
          <motion.div
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
            initial={shouldAnimate ? { scale: 0.8, opacity: 0 } : undefined}
            animate={shouldAnimate ? { scale: 1, opacity: 1 } : undefined}
            transition={
              shouldAnimate
                ? { duration: ANIMATION_DURATIONS.normal }
                : undefined
            }
          >
            <ChevronDown size={16} />
          </motion.div>
        </div>

        {error && (
          <motion.p
            initial={shouldAnimate ? "initial" : undefined}
            animate={shouldAnimate ? "animate" : undefined}
            exit={shouldAnimate ? "exit" : undefined}
            variants={shouldAnimate ? fadeInUp : undefined}
            transition={
              shouldAnimate
                ? {
                    duration: ANIMATION_DURATIONS.fast,
                  }
                : undefined
            }
            className="text-xs text-destructive font-medium"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
