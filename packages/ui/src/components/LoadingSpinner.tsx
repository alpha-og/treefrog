import * as React from "react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "destructive" | "muted" | "inherit";
  label?: string;
  inline?: boolean;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const variantClasses = {
  primary: "border-primary text-primary",
  secondary: "border-secondary text-secondary",
  destructive: "border-destructive text-destructive",
  muted: "border-muted-foreground text-muted-foreground",
  inherit: "border-current text-current",
};

const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  (
    {
      size = "md",
      variant = "primary",
      label,
      inline = true,
      className,
      ...props
    },
    ref
  ) => {
    if (label) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center gap-2",
            !inline && "justify-center",
            className
          )}
          {...props}
        >
          <motion.div
            className={cn(
              "border-2 border-transparent rounded-full shrink-0",
              sizeClasses[size],
              variantClasses[variant],
              "border-t-current border-l-current"
            )}
            animate="animate"
            variants={spinnerVariants}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "border-2 border-transparent rounded-full inline-flex",
          sizeClasses[size],
          variantClasses[variant],
          "border-t-current border-l-current",
          className
        )}
        animate="animate"
        variants={spinnerVariants}
        {...props}
      />
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner };