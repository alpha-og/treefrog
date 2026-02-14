import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spinner } from "@/utils/animations";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the spinner */
  size?: "xs" | "sm" | "md" | "lg";
  
  /** Color variant */
  variant?: "primary" | "secondary" | "destructive" | "muted" | "inherit";
  
  /** Show label text next to spinner */
  label?: string;
  
  /** Whether spinner is inline or centered */
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
    // If there's a label, wrap in flex container
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
            variants={spinner}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>
      );
    }

    // Without label, just return the spinner element
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
        variants={spinner}
        {...props}
      />
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner };
