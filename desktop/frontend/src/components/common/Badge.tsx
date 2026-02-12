import * as React from "react";
import { motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { scaleIn, subtlePulse, ANIMATION_DURATIONS } from "@/utils/animations";
import { useAnimation, useReducedMotion } from "@/utils/animation-context";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-white hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
        warning: "border-transparent bg-amber-500/10 text-amber-600 hover:bg-amber-500/20",
        info: "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;
  animated?: boolean;
  animateOnMount?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      className,
      variant,
      pulse = false,
      animated = true,
      animateOnMount = true,
      ...props
    },
    ref
  ) => {
    const { animationsEnabled } = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

    // Combine entrance animation with pulse for better effect
    const badgeMotionVariants = {
      initial: { opacity: 0, scale: 0.8 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: ANIMATION_DURATIONS.normal,
          ease: [0.33, 1, 0.68, 1],
        },
      },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        initial={shouldAnimate && animateOnMount ? "initial" : undefined}
        animate={
          shouldAnimate && (animateOnMount || pulse) ? "animate" : undefined
        }
        whileHover={
          shouldAnimate && !pulse
            ? {
                scale: 1.05,
                transition: { duration: ANIMATION_DURATIONS.normal },
              }
            : undefined
        }
        variants={
          shouldAnimate && animateOnMount ? badgeMotionVariants : undefined
        }
        transition={
          shouldAnimate && pulse
            ? {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : undefined
        }
        {...(pulse && shouldAnimate ? { animate: { scale: [1, 1.04, 1] } } : {})}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
