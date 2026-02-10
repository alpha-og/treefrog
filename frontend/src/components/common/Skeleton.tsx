import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Skeleton as ShadcnSkeleton } from "@/components/ui/skeleton";

interface SkeletonProps {
  className?: string;
  count?: number;
}

const Skeleton = ({ className, count = 1 }: SkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
          }}
        >
          <ShadcnSkeleton className={className} />
        </motion.div>
      ))}
    </>
  );
};

// Card skeleton with avatar, title, and content
const CardSkeleton = () => {
  return (
    <div className="rounded-2xl border p-6 space-y-4">
      <div className="flex items-center gap-4">
        <ShadcnSkeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <ShadcnSkeleton className="h-4 w-3/4" />
          <ShadcnSkeleton className="h-3 w-1/2" />
        </div>
      </div>
      <ShadcnSkeleton className="h-20 w-full" />
      <div className="flex justify-between items-center pt-2">
        <ShadcnSkeleton className="h-3 w-24" />
        <ShadcnSkeleton className="h-3 w-16" />
      </div>
    </div>
  );
};

// Text skeleton for content loading
const TextSkeleton = ({ lines = 3 }: { lines?: number }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.1,
          }}
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
const AvatarSkeleton = ({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <ShadcnSkeleton className={cn("rounded-full", sizeClasses[size])} />
    </motion.div>
  );
};

export { Skeleton, CardSkeleton, TextSkeleton, AvatarSkeleton };
