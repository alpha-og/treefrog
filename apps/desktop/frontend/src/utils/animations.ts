import { type Variants, type Transition } from "motion/react";

// ============================================================================
// EASING CURVES - Smooth animations
// ============================================================================

export const easeOutQuint: Transition["ease"] = [0.23, 1, 0.32, 1];
export const easeBounce: Transition["ease"] = [0.34, 1.56, 0.64, 1];
export const easeInOutQuad: Transition["ease"] = [0.45, 0, 0.55, 1];
export const easeOutCubic: Transition["ease"] = [0.33, 1, 0.68, 1];

// ============================================================================
// ANIMATION TIMING PRESETS
// ============================================================================

export const ANIMATION_DURATIONS = {
  fast: 0.15,      // Quick feedback (100-150ms)
  normal: 0.3,     // Standard (300ms - smooth)
  slow: 0.4,       // Relaxed (400ms)
  verySlow: 0.5,   // Leisurely (500ms)
};

export const ANIMATION_DELAYS = {
  none: 0,
  xs: 0.02,
  sm: 0.05,
  md: 0.1,
  lg: 0.15,
};

// ============================================================================
// ENTRANCE ANIMATIONS - For component mount
// ============================================================================

// Fade in from bottom
export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// Fade in from top
export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    y: 10,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// Fade in from left
export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    x: -10,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// Fade in from right
export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    x: 10,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// Fade in only
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// Scale fade for modals/dialogs
export const scaleFade: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// Scale in (from small to full)
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutCubic 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutCubic 
    }
  }
};

// Slide in from right (for toasts/sidebars)
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 100 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    x: 100,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// ============================================================================
// INTERACTIVE STATE ANIMATIONS
// ============================================================================

// Card hover effect
export const cardHover: Variants = {
  rest: { 
    y: 0, 
    boxShadow: "0 4px 20px -8px oklch(0 0 0 / 0.15)" 
  },
  hover: { 
    y: -4, 
    boxShadow: "0 12px 32px -10px oklch(0 0 0 / 0.2)",
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: "easeOut" 
    }
  }
};

// Enhanced card hover with glow
export const cardHoverGlow: Variants = {
  rest: { 
    y: 0, 
    boxShadow: "0 4px 20px -8px oklch(0 0 0 / 0.15)",
    borderColor: "oklch(0.65 0.15 45 / 0.2)"
  },
  hover: { 
    y: -6, 
    boxShadow: "0 20px 40px -12px oklch(0.65 0.15 45 / 0.2)",
    borderColor: "oklch(0.65 0.15 45 / 0.4)",
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  }
};

// Button press effect
export const buttonPress: Variants = {
  rest: { scale: 1 },
  press: { 
    scale: 0.98,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// Button hover effect
export const buttonHover: Variants = {
  rest: { 
    scale: 1,
    boxShadow: "0 4px 12px -4px oklch(0 0 0 / 0.1)"
  },
  hover: { 
    scale: 1.02,
    boxShadow: "0 8px 20px -6px oklch(0 0 0 / 0.15)",
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  }
};

// Disabled state
export const disabledState: Variants = {
  rest: { 
    opacity: 1, 
    scale: 1 
  },
  disabled: { 
    opacity: 0.5, 
    scale: 0.98,
    transition: { 
      duration: ANIMATION_DURATIONS.fast 
    }
  }
};

// Error state - subtle shake
export const errorShake: Variants = {
  animate: {
    x: [-2, 2, -2, 0],
    transition: {
      duration: 0.3,
      ease: easeOutQuint
    }
  }
};

// Success state - gentle scale up
export const successPulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.4,
      ease: easeOutQuint
    }
  }
};

// Focus ring animation
export const focusRing: Variants = {
  rest: {
    boxShadow: "0 0 0 0px oklch(0.65 0.15 30 / 0)"
  },
  focus: {
    boxShadow: "0 0 0 3px oklch(0.65 0.15 30 / 0.1)",
    transition: {
      duration: ANIMATION_DURATIONS.fast
    }
  }
};

// ============================================================================
// LIST & STAGGER ANIMATIONS
// ============================================================================

// Stagger container for lists
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: ANIMATION_DELAYS.sm,
      delayChildren: ANIMATION_DELAYS.md
    }
  }
};

// Stagger item
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  }
};

// Stagger container - tight (for nested components in cards)
export const tightStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: ANIMATION_DELAYS.xs,
      delayChildren: 0
    }
  }
};

// Stagger item - tight (for nested components in cards)
export const tightStaggerItem: Variants = {
  initial: { opacity: 0, y: 5 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// ============================================================================
// PAGE & MODAL ANIMATIONS
// ============================================================================

// Page transition
export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// Modal backdrop
export const backdropFade: Variants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { 
      duration: ANIMATION_DURATIONS.normal 
    }
  },
  exit: { 
    opacity: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.fast 
    }
  }
};

// Modal content slide up
export const modalSlideUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: ANIMATION_DURATIONS.normal, 
      ease: easeOutQuint 
    }
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: { 
      duration: ANIMATION_DURATIONS.fast, 
      ease: easeOutQuint 
    }
  }
};

// ============================================================================
// LOADING & CONTINUOUS ANIMATIONS
// ============================================================================

// Loading spinner
export const spinner: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Pulse animation for loading states
export const pulse: Variants = {
  animate: {
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Subtle pulse (for badges, notifications)
export const subtlePulse: Variants = {
  animate: {
    scale: [1, 1.03, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Shimmer animation for skeletons
export const shimmer: Variants = {
  animate: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Glow pulse for cards
export const glowPulse: Variants = {
  rest: {
    boxShadow: "0 0 0 0 oklch(0 0 0 / 0)"
  },
  hover: {
    boxShadow: [
      "0 0 0 0 oklch(0.65 0.15 30 / 0.1)",
      "0 0 20px 2px oklch(0.65 0.15 30 / 0.15)",
      "0 0 0 0 oklch(0.65 0.15 30 / 0.1)"
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wraps an animation variant to respect prefers-reduced-motion
 * If motion is reduced, returns an instant version of the animation
 * @param variant - The animation variant to wrap
 * @returns Motion-safe variant
 */
export function createSafeVariant(variant: Variants): Variants {
  const safeVariant: Variants = {};

  for (const key in variant) {
    const state = variant[key as keyof Variants];
    safeVariant[key as keyof Variants] = {
      ...state,
      transition: {
        ...((state as { transition?: object }).transition ?? {}),
        duration: 0, // Instant
      },
    };
  }

  return safeVariant;
}

/**
 * Calculate stagger delay for nested animations
 * @param index - Child index
 * @param baseDelay - Base delay in seconds
 * @param staggerAmount - Stagger increment in seconds
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
 * Merge animation variants, preferring custom over defaults
 * @param defaultVariant - Default animation variant
 * @param customVariant - Custom animation variant to merge in
 * @returns Merged variant
 */
export function mergeAnimationVariants(
  defaultVariant: Variants,
  customVariant?: Variants
): Variants {
  if (!customVariant) return defaultVariant;
  return { ...defaultVariant, ...customVariant };
}
