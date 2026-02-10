import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import {
  errorShake,
  fadeInUp,
  ANIMATION_DURATIONS,
} from "@/lib/animations";
import { LoadingSpinner } from "./LoadingSpinner";
import { useAnimation, useReducedMotion } from "@/lib/animation-context";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  error?: string;
  label?: string;
  description?: string;
  loading?: boolean;
  animated?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      icon: Icon,
      error,
      label,
      description,
      loading,
      animated = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const { animationsEnabled } = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

    return (
      <div className="w-full">
        {label && (
          <div className="mb-2">
            <label className="text-sm font-medium text-foreground">
              {label}
            </label>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        )}
        <div className="relative">
          {Icon && !loading && (
            <motion.div
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
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

          {loading && (
            <motion.div
              className="absolute right-3 top-1/2 -translate-y-1/2"
              initial={shouldAnimate ? { scale: 0, opacity: 0 } : undefined}
              animate={shouldAnimate ? { scale: 1, opacity: 1 } : undefined}
              transition={
                shouldAnimate
                  ? { duration: ANIMATION_DURATIONS.fast }
                  : undefined
              }
            >
              <LoadingSpinner size="sm" variant="inherit" />
            </motion.div>
          )}

          <motion.input
            type={type}
            className={cn(
              "flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
              Icon && !loading && "pl-10",
              loading && "pr-10",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            disabled={disabled || loading}
            initial={shouldAnimate ? { opacity: 0, y: 5 } : undefined}
            animate={
              shouldAnimate && error
                ? "error"
                : shouldAnimate
                  ? { opacity: 1, y: 0 }
                  : undefined
            }
            whileFocus={
              shouldAnimate
                ? {
                    boxShadow: "0 0 0 3px oklch(0.65 0.15 30 / 0.1)",
                    scale: 1.002,
                  }
                : undefined
            }
            variants={shouldAnimate ? { error: errorShake } : undefined}
            transition={
              shouldAnimate && !error
                ? { duration: ANIMATION_DURATIONS.normal }
                : undefined
            }
            {...props}
          />
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
Input.displayName = "Input";

export { Input };
