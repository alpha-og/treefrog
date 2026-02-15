import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ANIMATION_DURATIONS } from "@/utils/animations";
import { useAnimation, useReducedMotion } from "@/utils/animation-context";

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  animated?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "secondary" | "success" | "warning" | "error";
}

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      label,
      description,
      animated = true,
      size = "md",
      disabled,
      ...props
    },
    ref
  ) => {
    const { animationsEnabled } = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

    const sizeClasses = {
      sm: "h-5 w-9",
      md: "h-6 w-11",
      lg: "h-7 w-13",
    };

    const toggleSizeClasses = {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
    };

    const translateValues = {
      sm: 16,
      md: 20,
      lg: 24,
    };

  return (
    <div className={cn("flex items-center gap-3", label && "justify-between")}>
      {(label || description) && (
        <div>
          {label && (
            <label className="text-sm font-medium text-foreground cursor-pointer mb-1 block">
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <motion.label
        className={cn(
          "relative inline-flex items-center cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        whileHover={
          !disabled && shouldAnimate
            ? { scale: 1.05 }
            : undefined
        }
        whileTap={
          !disabled && shouldAnimate
            ? { scale: 0.95 }
            : undefined
        }
        transition={
          shouldAnimate
            ? { duration: ANIMATION_DURATIONS.fast }
            : undefined
        }
      >
          <input
            type="checkbox"
            className="sr-only peer"
            disabled={disabled}
            ref={ref}
            checked={props.checked}
            onChange={props.onChange}
            onClick={(e) => e.stopPropagation()}
          />

        <motion.div
          className={cn(
            "relative rounded-full transition-all duration-300",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
            sizeClasses[size],
            "bg-muted peer-checked:bg-primary"
          )}
          initial={shouldAnimate ? { opacity: 0.5 } : undefined}
          animate={
            shouldAnimate ? { opacity: 1 } : undefined
          }
          transition={
            shouldAnimate
              ? { duration: ANIMATION_DURATIONS.normal }
              : undefined
          }
        >
          <motion.div
            className={cn(
              "absolute top-0.5 left-0.5 rounded-full bg-background shadow-md",
              toggleSizeClasses[size]
            )}
            animate={{ x: props.checked ? translateValues[size] : 0 }}
            layout
            transition={
              shouldAnimate
                ? { duration: ANIMATION_DURATIONS.fast, type: "spring", stiffness: 500, damping: 30 }
                : undefined
            }
          />
        </motion.div>
      </motion.label>
    </div>
  );
  }
);
Toggle.displayName = "Toggle";

export { Toggle };
