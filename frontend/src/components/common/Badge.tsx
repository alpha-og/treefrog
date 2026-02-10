import * as React from "react";
import { motion } from "motion/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

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
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, pulse, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        initial={pulse ? { scale: 1 } : undefined}
        animate={pulse ? { 
          scale: [1, 1.05, 1],
        } : undefined}
        transition={pulse ? {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        } : undefined}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
