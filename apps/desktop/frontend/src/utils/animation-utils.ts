import type { Variants } from "motion/react";
import { ANIMATION_DELAYS, ANIMATION_DURATIONS } from "./animations";

// ============================================================================
// ANIMATION CONFIGURATION
// ============================================================================

export interface AnimationConfig {
  /** Whether this component should animate */
  enabled?: boolean;
  
  /** Skip animation if inside animated parent */
  skipIfNested?: boolean;
  
  /** Custom duration in seconds */
  duration?: number;
  
  /** Custom delay in seconds */
  delay?: number;
  
  /** Whether to animate on mount */
  animateOnMount?: boolean;
  
  /** Stagger configuration for children */
  stagger?: {
    enabled: boolean;
    delay: number;
    amount: number;
  };
}

// ============================================================================
// STAGGER UTILITIES
// ============================================================================

/**
 * Calculate stagger delay for children in a list
 * @param index - Child index (0-based)
 * @param baseDelay - Base delay before stagger starts
 * @param staggerAmount - Delay between each child
 * @returns Total delay in seconds
 */
export function calculateStaggerDelay(
  index: number,
  baseDelay: number = ANIMATION_DELAYS.md,
  staggerAmount: number = ANIMATION_DELAYS.sm
): number {
  return baseDelay + index * staggerAmount;
}

/**
 * Create stagger animation configuration for a list
 * @param childCount - Total number of children
 * @param baseDelay - Base delay before stagger starts
 * @param staggerAmount - Delay between each child
 * @returns Object with stagger configuration
 */
export function createStaggerConfig(
  _childCount: number,
  baseDelay: number = ANIMATION_DELAYS.md,
  staggerAmount: number = ANIMATION_DELAYS.sm
) {
  return {
    staggerChildren: staggerAmount,
    delayChildren: baseDelay,
  };
}

/**
 * Get stagger delay for a specific child
 * @param index - Child index
 * @param staggerAmount - Delay between children
 * @returns Delay in seconds
 */
export function getChildStaggerDelay(
  index: number,
  staggerAmount: number = ANIMATION_DELAYS.sm
): number {
  return index * staggerAmount;
}

// ============================================================================
// VARIANT UTILITIES
// ============================================================================

/**
 * Create instant animation variant (for reduced motion)
 * Sets all transition durations to 0
 * @param variant - Original variant
 * @returns Instant variant
 */
export function createInstantVariant(variant: Variants): Variants {
  const instantVariant: Variants = {};

  for (const key in variant) {
    const state = variant[key as keyof Variants];
    if (state && typeof state === "object") {
      instantVariant[key as keyof Variants] = {
        ...state,
        transition: {
          ...(state as any).transition,
          duration: 0,
          delay: 0,
        },
      };
    }
  }

  return instantVariant;
}

/**
 * Merge animation variants, with custom taking precedence
 * @param defaultVariant - Default animation variant
 * @param customVariant - Custom overrides
 * @returns Merged variant
 */
export function mergeAnimationVariants(
  defaultVariant: Variants,
  customVariant?: Variants
): Variants {
  if (!customVariant) return defaultVariant;
  return { ...defaultVariant, ...customVariant };
}

/**
 * Create a variant with custom duration
 * @param variant - Original variant
 * @param duration - New duration in seconds
 * @returns Variant with updated duration
 */
export function createVariantWithDuration(
  variant: Variants,
  duration: number
): Variants {
  const newVariant: Variants = {};

  for (const key in variant) {
    const state = variant[key as keyof Variants];
    if (state && typeof state === "object") {
      newVariant[key as keyof Variants] = {
        ...state,
        transition: {
          ...(state as any).transition,
          duration,
        },
      };
    }
  }

  return newVariant;
}

/**
 * Create a variant with custom delay
 * @param variant - Original variant
 * @param delay - New delay in seconds
 * @returns Variant with updated delay
 */
export function createVariantWithDelay(
  variant: Variants,
  delay: number
): Variants {
  const newVariant: Variants = {};

  for (const key in variant) {
    const state = variant[key as keyof Variants];
    if (state && typeof state === "object") {
      newVariant[key as keyof Variants] = {
        ...state,
        transition: {
          ...(state as any).transition,
          delay,
        },
      };
    }
  }

  return newVariant;
}

// ============================================================================
// ANIMATION STATE UTILITIES
// ============================================================================

/**
 * Get animation state based on component state
 * @param isLoading - Whether component is loading
 * @param isError - Whether component has error
 * @param isSuccess - Whether component has success state
 * @param isDisabled - Whether component is disabled
 * @returns Animation state name
 */
export function getAnimationState(
  isLoading?: boolean,
  isError?: boolean,
  isSuccess?: boolean,
  isDisabled?: boolean
): string {
  if (isLoading) return "loading";
  if (isError) return "error";
  if (isSuccess) return "success";
  if (isDisabled) return "disabled";
  return "rest";
}

/**
 * Create loading animation transition
 * @param duration - Duration in seconds
 * @returns Loading animation object
 */
export function createLoadingAnimation(duration: number = ANIMATION_DURATIONS.normal) {
  return {
    duration,
    repeat: Infinity,
    ease: "easeInOut",
  };
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Create CSS properties for GPU-accelerated animations
 * Uses transform and opacity for best performance
 * @returns CSS object for will-change optimization
 */
export function getGPUAccelerationStyles() {
  return {
    willChange: "transform, opacity",
  };
}

/**
 * Check if animation is safe to run (respects user preferences)
 * @param prefersReducedMotion - User preference for reduced motion
 * @param animationsEnabled - Whether animations are enabled globally
 * @returns Boolean indicating if animation should run
 */
export function isSafeToAnimate(
  prefersReducedMotion: boolean,
  animationsEnabled: boolean = true
): boolean {
  return !prefersReducedMotion && animationsEnabled;
}

/**
 * Get optimal animation duration based on device
 * Reduces animations on lower-end devices
 * @param duration - Base duration in seconds
 * @param isLowEnd - Whether device is low-end
 * @returns Adjusted duration
 */
export function getOptimalDuration(
  duration: number,
  isLowEnd: boolean = false
): number {
  if (isLowEnd) {
    return duration * 0.5; // 50% faster for low-end devices
  }
  return duration;
}

// ============================================================================
// COMPONENT ANIMATION HELPERS
// ============================================================================

/**
 * Create animation props for a component with defaults
 * @param config - Animation configuration
 * @returns Object with animation props
 */
export function createAnimationProps(config: AnimationConfig) {
  return {
    initial: "initial",
    animate: config.enabled !== false ? "animate" : "initial",
    exit: "exit",
    transition: {
      duration: config.duration ?? ANIMATION_DURATIONS.normal,
      delay: config.delay ?? 0,
    },
  };
}

/**
 * Create variants for a component state machine
 * @param baseVariant - Base variant definition
 * @param config - Animation configuration
 * @returns Configured variant
 */
export function createConfiguredVariant(
  baseVariant: Variants,
  config: AnimationConfig
): Variants {
  if (config.duration) {
    return createVariantWithDuration(baseVariant, config.duration);
  }
  return baseVariant;
}
