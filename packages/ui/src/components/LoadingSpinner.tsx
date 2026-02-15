import { motion, type Variants } from "motion/react";
import { cn } from "../lib/utils";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "destructive" | "muted" | "inherit";
  label?: string;
  inline?: boolean;
  className?: string;
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

const spinnerVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear" as const,
    },
  },
};

function LoadingSpinner({
  size = "md",
  variant = "primary",
  label,
  inline = true,
  className,
}: LoadingSpinnerProps) {
  if (label) {
    return (
      <div
        className={cn(
          "flex items-center gap-2",
          !inline && "justify-center",
          className
        )}
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
      className={cn(
        "border-2 border-transparent rounded-full inline-flex",
        sizeClasses[size],
        variantClasses[variant],
        "border-t-current border-l-current",
        className
      )}
      animate="animate"
      variants={spinnerVariants}
    />
  );
}

export { LoadingSpinner, type LoadingSpinnerProps };