"use client";
import * as React from "react";
import { motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
import {
  fadeIn,
  ANIMATION_DURATIONS,
} from "@treefrog/ui";
import { LoadingSpinner } from "./LoadingSpinner";
import { useAnimation, useReducedMotion } from "@treefrog/ui";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  animationDisabled?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      children,
      disabled,
      animationDisabled = false,
      loadingText,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const { animationsEnabled } = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = !animationDisabled && animationsEnabled;

    // Motion animation variants for button states
    const motionVariants = {
      rest: {
        scale: 1,
        boxShadow: "0 4px 12px -4px oklch(0 0 0 / 0.1)",
      },
      hover: {
        scale: 1.02,
        boxShadow: "0 8px 20px -6px oklch(0 0 0 / 0.15)",
        transition: {
          duration: ANIMATION_DURATIONS.normal,
          ease: [0.23, 1, 0.32, 1],
        },
      },
      press: {
        scale: 0.98,
        transition: {
          duration: ANIMATION_DURATIONS.fast,
          ease: [0.23, 1, 0.32, 1],
        },
      },
      disabled: {
        opacity: 0.6,
        scale: 0.98,
        transition: {
          duration: ANIMATION_DURATIONS.fast,
        },
      },
    };

     return (
       <motion.button
         className={cn(buttonVariants({ variant, size, className }), isDisabled && "cursor-not-allowed")}
         ref={ref}
         disabled={isDisabled}
        initial="rest"
        animate={shouldAnimate ? (isDisabled ? "disabled" : "rest") : undefined}
        whileHover={
          shouldAnimate && !isDisabled && !prefersReducedMotion ? "hover" : undefined
        }
        whileTap={
          shouldAnimate && !isDisabled && !prefersReducedMotion ? "press" : undefined
        }
        variants={shouldAnimate ? motionVariants : undefined}
        {...props}
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" variant="inherit" />
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
