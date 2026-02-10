import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { cardHover, glowPulse } from "@/lib/animations";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  lift?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow = false, lift = false, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-2xl bg-card text-card-foreground border shadow-sm overflow-hidden",
          glow && "glow-card",
          className
        )}
        initial="rest"
        whileHover={lift ? "hover" : undefined}
        variants={lift ? cardHover : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// Glow card variant with enhanced effects
const GlowCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-background border border-primary/20 p-6 md:p-8 cursor-pointer",
          className
        )}
        initial="rest"
        whileHover="hover"
        variants={{
          rest: { 
            y: 0, 
            borderColor: "oklch(0.65 0.15 45 / 0.2)",
            boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)"
          },
          hover: { 
            y: -4, 
            borderColor: "oklch(0.65 0.15 45 / 0.4)",
            boxShadow: "0 20px 40px -15px rgba(0,0,0,0.15)",
            transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] }
          }
        }}
        {...props}
      >
        {/* Top accent bar */}
        <motion.div 
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary"
          initial={{ opacity: 0 }}
          variants={{
            rest: { opacity: 0 },
            hover: { opacity: 1, transition: { duration: 0.3 } }
          }}
        />
        {children}
      </motion.div>
    );
  }
);
GlowCard.displayName = "GlowCard";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, GlowCard };
