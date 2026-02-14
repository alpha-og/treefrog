import * as React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import {
  cardHover,
  cardHoverGlow,
  tightStaggerContainer,
  tightStaggerItem,
} from "@/utils/animations";
import { useAnimation, useReducedMotion } from "@/utils/animation-context";

interface CardProps extends Partial<HTMLMotionProps<"div">> {
  glow?: boolean;
  lift?: boolean;
  animated?: boolean;
  animateOnMount?: boolean;
  staggerChildren?: boolean;
  disableHover?: boolean;
  clickable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      glow = false,
      lift = true,
      animated = true,
      animateOnMount = true,
      staggerChildren = true,
      disableHover = false,
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    const { animationsEnabled } = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

    const hoverVariant = glow ? cardHoverGlow : cardHover;

    // For staggered children animations
    const containerVariants = staggerChildren
      ? tightStaggerContainer
      : undefined;

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-2xl bg-card text-card-foreground border shadow-sm overflow-hidden",
          glow && "glow-card",
          clickable && "cursor-pointer",
          className
        )}
        initial={shouldAnimate && animateOnMount ? "initial" : "rest"}
        animate={shouldAnimate ? (staggerChildren ? "animate" : "rest") : "rest"}
        whileHover={shouldAnimate && lift && !disableHover ? "hover" : undefined}
        variants={shouldAnimate ? (staggerChildren ? containerVariants : hoverVariant) : undefined}
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
  Partial<HTMLMotionProps<"div">> & { animated?: boolean }
>(({ className, animated = true, ...props }, ref) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

  return (
    <motion.div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      initial={shouldAnimate ? "initial" : undefined}
      animate={shouldAnimate ? "animate" : undefined}
      variants={shouldAnimate ? tightStaggerItem : undefined}
      {...props}
    />
  );
});
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  Partial<HTMLMotionProps<"h3">> & { animated?: boolean }
>(({ className, animated = true, ...props }, ref) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

  return (
    <motion.h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      initial={shouldAnimate ? "initial" : undefined}
      animate={shouldAnimate ? "animate" : undefined}
      variants={shouldAnimate ? tightStaggerItem : undefined}
      {...props}
    />
  );
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  Partial<HTMLMotionProps<"p">> & { animated?: boolean }
>(({ className, animated = true, ...props }, ref) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

  return (
    <motion.p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      initial={shouldAnimate ? "initial" : undefined}
      animate={shouldAnimate ? "animate" : undefined}
      variants={shouldAnimate ? tightStaggerItem : undefined}
      {...props}
    />
  );
});
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  Partial<HTMLMotionProps<"div">> & { animated?: boolean }
>(({ className, animated = true, ...props }, ref) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

  return (
    <motion.div
      ref={ref}
      className={cn("p-6 pt-0", className)}
      initial={shouldAnimate ? "initial" : undefined}
      animate={shouldAnimate ? "animate" : undefined}
      variants={shouldAnimate ? tightStaggerItem : undefined}
      {...props}
    />
  );
});
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  Partial<HTMLMotionProps<"div">> & { animated?: boolean }
>(({ className, animated = true, ...props }, ref) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

  return (
    <motion.div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      initial={shouldAnimate ? "initial" : undefined}
      animate={shouldAnimate ? "animate" : undefined}
      variants={shouldAnimate ? tightStaggerItem : undefined}
      {...props}
    />
  );
});
CardFooter.displayName = "CardFooter";

// Glow card variant with enhanced effects
const GlowCard = React.forwardRef<
  HTMLDivElement,
  CardProps & { animated?: boolean; animateOnMount?: boolean }
>(
  (
    {
      className,
      animated = true,
      animateOnMount = true,
      staggerChildren = false,
      disableHover = false,
      clickable = false,
      children,
      ...props
    },
    ref
  ) => {
    const { animationsEnabled } = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

    const containerVariants = staggerChildren
      ? tightStaggerContainer
      : undefined;

    return (
      <motion.div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-background border border-primary/20 p-6 md:p-8",
          clickable && "cursor-pointer",
          className
        )}
        initial={shouldAnimate && animateOnMount ? "initial" : "rest"}
        animate={shouldAnimate ? (staggerChildren ? "animate" : "rest") : "rest"}
        whileHover={shouldAnimate && !disableHover ? "hover" : undefined}
        variants={shouldAnimate ? (staggerChildren ? containerVariants : cardHoverGlow) : undefined}
        {...props}
       >
         {children}
      </motion.div>
    );
  }
);
GlowCard.displayName = "GlowCard";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  GlowCard,
};
