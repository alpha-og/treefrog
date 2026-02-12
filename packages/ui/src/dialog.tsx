"use client";
import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { cn } from "./utils";
import { backdropFade, modalSlideUp } from "@treefrog/ui";
import { useAnimation, useReducedMotion } from "@treefrog/ui";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  animated?: boolean;
}

const Dialog = ({ open, onOpenChange, children, animated = true }: DialogProps) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

  return (
    <AnimatePresence>
      {open && (
        <DialogContent onOpenChange={onOpenChange} animated={shouldAnimate}>
          {children}
        </DialogContent>
      )}
    </AnimatePresence>
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  className?: string;
  animated?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, onOpenChange, className, animated = true }, ref) => {
    const { animationsEnabled } = useAnimation();
    const prefersReducedMotion = useReducedMotion();
    const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          initial={shouldAnimate ? "initial" : undefined}
          animate={shouldAnimate ? "animate" : undefined}
          exit={shouldAnimate ? "exit" : undefined}
          variants={shouldAnimate ? backdropFade : undefined}
          onClick={() => onOpenChange(false)}
        />

        {/* Dialog Content */}
        <motion.div
          ref={ref}
          className={cn(
            "relative z-50 w-full max-w-[calc(100%-2rem)] sm:max-w-lg rounded-2xl bg-card p-6 shadow-xl border",
            className
          )}
          initial={shouldAnimate ? "initial" : undefined}
          animate={shouldAnimate ? "animate" : undefined}
          exit={shouldAnimate ? "exit" : undefined}
          variants={shouldAnimate ? modalSlideUp : undefined}
        >
          {children}

          {/* Close button */}
          <motion.button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            whileHover={
              shouldAnimate ? { scale: 1.1 } : undefined
            }
            whileTap={
              shouldAnimate ? { scale: 0.95 } : undefined
            }
            transition={{ duration: 0.1 }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </motion.button>
        </motion.div>
      </div>
    );
  }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
