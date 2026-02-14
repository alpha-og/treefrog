import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Skeleton as ShadcnSkeleton } from "@/components/ui/skeleton";
import { ANIMATION_DURATIONS } from "@/utils/animations";
import { useAnimation, useReducedMotion } from "@/utils/animation-context";

interface SkeletonProps {
  className?: string;
  count?: number;
  animated?: boolean;
}

const Skeleton = ({ className, count = 1, animated = true }: SkeletonProps) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && animationsEnabled && !prefersReducedMotion;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={shouldAnimate ? { opacity: 0.4 } : undefined}
          animate={shouldAnimate ? { opacity: [0.4, 0.8, 0.4] } : undefined}
          transition={
            shouldAnimate
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1,
                }
              : undefined
          }
        >
          <ShadcnSkeleton className={className} />
        </motion.div>
      ))}
    </>
  );
};

// Card skeleton with avatar, title, and content
const CardSkeleton = ({ animated = true }: { animated?: boolean }) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate =
    animated && animationsEnabled && !prefersReducedMotion;

  return (
    <div className="rounded-2xl border p-6 space-y-4">
      <motion.div
        className="flex items-center gap-4"
        initial={shouldAnimate ? { opacity: 0 } : undefined}
        animate={shouldAnimate ? { opacity: 1 } : undefined}
        transition={
          shouldAnimate
            ? { duration: ANIMATION_DURATIONS.normal }
            : undefined
        }
      >
        <motion.div
          initial={
            shouldAnimate
              ? { opacity: 0.4 }
              : undefined
          }
          animate={
            shouldAnimate
              ? { opacity: [0.4, 0.8, 0.4] }
              : undefined
          }
          transition={
            shouldAnimate
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        >
          <ShadcnSkeleton className="h-12 w-12 rounded-xl" />
        </motion.div>
        <div className="space-y-2 flex-1">
          <motion.div
            initial={
              shouldAnimate
                ? { opacity: 0.4 }
                : undefined
            }
            animate={
              shouldAnimate
                ? { opacity: [0.4, 0.8, 0.4] }
                : undefined
            }
            transition={
              shouldAnimate
                ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.1,
                  }
                : undefined
            }
          >
            <ShadcnSkeleton className="h-4 w-3/4" />
          </motion.div>
          <motion.div
            initial={
              shouldAnimate
                ? { opacity: 0.4 }
                : undefined
            }
            animate={
              shouldAnimate
                ? { opacity: [0.4, 0.8, 0.4] }
                : undefined
            }
            transition={
              shouldAnimate
                ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.2,
                  }
                : undefined
            }
          >
            <ShadcnSkeleton className="h-3 w-1/2" />
          </motion.div>
        </div>
      </motion.div>
      <motion.div
        initial={
          shouldAnimate
            ? { opacity: 0.4 }
            : undefined
        }
        animate={
          shouldAnimate
            ? { opacity: [0.4, 0.8, 0.4] }
            : undefined
        }
        transition={
          shouldAnimate
            ? {
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }
            : undefined
        }
      >
        <ShadcnSkeleton className="h-20 w-full" />
      </motion.div>
      <motion.div
        className="flex justify-between items-center pt-2"
        initial={
          shouldAnimate
            ? { opacity: 0 }
            : undefined
        }
        animate={
          shouldAnimate
            ? { opacity: 1 }
            : undefined
        }
        transition={
          shouldAnimate
            ? { duration: ANIMATION_DURATIONS.normal, delay: 0.1 }
            : undefined
        }
      >
        <motion.div
          initial={
            shouldAnimate
              ? { opacity: 0.4 }
              : undefined
          }
          animate={
            shouldAnimate
              ? { opacity: [0.4, 0.8, 0.4] }
              : undefined
          }
          transition={
            shouldAnimate
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4,
                }
              : undefined
          }
        >
          <ShadcnSkeleton className="h-3 w-24" />
        </motion.div>
        <motion.div
          initial={
            shouldAnimate
              ? { opacity: 0.4 }
              : undefined
          }
          animate={
            shouldAnimate
              ? { opacity: [0.4, 0.8, 0.4] }
              : undefined
          }
          transition={
            shouldAnimate
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }
              : undefined
          }
        >
          <ShadcnSkeleton className="h-3 w-16" />
        </motion.div>
      </motion.div>
    </div>
  );
};

// Text skeleton for content loading
const TextSkeleton = ({
  lines = 3,
  animated = true,
}: {
  lines?: number;
  animated?: boolean;
}) => {
  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate =
    animated && animationsEnabled && !prefersReducedMotion;

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          initial={
            shouldAnimate
              ? { opacity: 0.4 }
              : undefined
          }
          animate={
            shouldAnimate
              ? { opacity: [0.4, 0.8, 0.4] }
              : undefined
          }
          transition={
            shouldAnimate
              ? {
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.1,
                }
              : undefined
          }
        >
          <ShadcnSkeleton
            className={cn(
              "h-4",
              i === lines - 1 ? "w-2/3" : "w-full"
            )}
          />
        </motion.div>
      ))}
    </div>
  );
};

// Avatar skeleton
const AvatarSkeleton = ({
  size = "md",
  animated = true,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
}) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const { animationsEnabled } = useAnimation();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate =
    animated && animationsEnabled && !prefersReducedMotion;

  return (
    <motion.div
      initial={
        shouldAnimate
          ? { opacity: 0.4 }
          : undefined
      }
      animate={
        shouldAnimate
          ? { opacity: [0.4, 0.8, 0.4] }
          : undefined
      }
      transition={
        shouldAnimate
          ? {
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
    >
      <ShadcnSkeleton className={cn("rounded-full", sizeClasses[size])} />
    </motion.div>
  );
};

export { Skeleton, CardSkeleton, TextSkeleton, AvatarSkeleton };
