import React, { createContext, useContext, useEffect, useState } from "react";
import type { Variants } from "motion/react";
import { ANIMATION_DURATIONS, createSafeVariant } from "./animations";

// ============================================================================
// TYPES
// ============================================================================

type AnimationIntensity = "fast" | "normal" | "slow";

export interface AnimationContextType {
  /** Whether animations are enabled globally */
  animationsEnabled: boolean;

  /** Animation intensity/speed preset */
  intensity: AnimationIntensity;

  /** Whether user prefers reduced motion */
  prefersReducedMotion: boolean;

  /** Get animation duration based on intensity */
  getDuration: (base?: number) => number;

  /** Enable/disable animations */
  setAnimationsEnabled: (enabled: boolean) => void;

  /** Set animation intensity */
  setIntensity: (intensity: AnimationIntensity) => void;
}

export interface AnimationProviderProps {
  children: React.ReactNode;
  initialAnimationsEnabled?: boolean;
  initialIntensity?: AnimationIntensity;
}

// ============================================================================
// CONTEXT & PROVIDER
// ============================================================================

const AnimationContext = createContext<AnimationContextType | undefined>(
  undefined,
);

export function AnimationProvider({
  children,
  initialAnimationsEnabled = true,
  initialIntensity = "normal",
}: AnimationProviderProps) {
  const [animationsEnabled, setAnimationsEnabled] = useState(
    initialAnimationsEnabled,
  );
  const [intensity, setIntensity] =
    useState<AnimationIntensity>(initialIntensity);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  // Detect prefers-reduced-motion on mount
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  const getDuration = (base: number = ANIMATION_DURATIONS.normal): number => {
    if (!animationsEnabled || prefersReducedMotion) return 0;

    const multipliers: Record<AnimationIntensity, number> = {
      fast: 0.7, // 70% of normal duration
      normal: 1, // 100% of normal duration
      slow: 1.3, // 130% of normal duration
    };

    return base * multipliers[intensity];
  };

  return (
    <AnimationContext.Provider
      value={{
        animationsEnabled,
        intensity,
        prefersReducedMotion,
        getDuration,
        setAnimationsEnabled,
        setIntensity,
      }}
    >
      {children}
    </AnimationContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access animation context
 * @returns Animation context value
 * @throws Error if used outside AnimationProvider
 */
export function useAnimation(): AnimationContextType {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error("useAnimation must be used within AnimationProvider");
  }
  return context;
}

/**
 * Hook to detect if user prefers reduced motion
 * @returns Boolean indicating if reduced motion is preferred
 */
export function useReducedMotion(): boolean {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error("useReducedMotion must be used within AnimationProvider");
  }
  return context.prefersReducedMotion;
}

/**
 * Hook to check if component is in a nested animated context
 * This is a simple implementation - in real apps, you might want to
 * track this more explicitly via a provider prop
 * @returns Boolean indicating if inside animated parent
 */
export function useNestedAnimation(): boolean {
  // This hook can be expanded to track actual nested animation state
  // For now, it's a placeholder for future implementation
  return false;
}

/**
 * Hook to apply animation variant with context awareness
 * Automatically respects reduced motion preference
 * @param variant - Animation variant to apply
 * @param skipAnimation - Whether to skip animation entirely
 * @returns Animation-safe variant
 */
export function useAnimationVariant(
  variant: Variants,
  skipAnimation: boolean = false,
): Variants {
  const { prefersReducedMotion, animationsEnabled } = useAnimation();

  if (skipAnimation || !animationsEnabled || prefersReducedMotion) {
    return createSafeVariant(variant);
  }

  return variant;
}

/**
 * Hook to get animation duration with context multiplier
 * @param baseDuration - Base duration in seconds
 * @returns Adjusted duration based on intensity setting
 */
export function useAnimationDuration(baseDuration: number): number {
  const { getDuration } = useAnimation();
  return getDuration(baseDuration);
}
