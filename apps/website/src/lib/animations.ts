import type { Variants, Transition } from "motion/react";

export const easeOutQuint: Transition["ease"] = [0.23, 1, 0.32, 1];
export const easeOutCubic: Transition["ease"] = [0.33, 1, 0.68, 1];
export const easeOutExpo: Transition["ease"] = [0.16, 1, 0.3, 1];
export const easeSpring: Transition = { type: "spring", stiffness: 400, damping: 30 };

export const ANIMATION_DURATIONS = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.35,
  slow: 0.5,
  slower: 0.7,
};

export const ANIMATION_DELAYS = {
  xs: 0.03,
  sm: 0.06,
  md: 0.1,
  lg: 0.15,
  xl: 0.2,
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }
  }
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: ANIMATION_DURATIONS.normal, ease: easeOutQuint }
  }
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: ANIMATION_DELAYS.sm, delayChildren: ANIMATION_DELAYS.md }
  }
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }
  }
};

export const cardHover: Variants = {
  rest: { 
    y: 0, 
    scale: 1,
    boxShadow: "0 4px 20px -8px oklch(0 0 0 / 0.08)"
  },
  hover: {
    y: -6,
    scale: 1.015,
    boxShadow: "0 20px 40px -12px oklch(0 0 0 / 0.15)",
    transition: { duration: ANIMATION_DURATIONS.normal, ease: easeOutExpo }
  }
};

export const buttonHover: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.03,
    transition: { duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }
  },
  tap: { 
    scale: 0.97,
    transition: { duration: ANIMATION_DURATIONS.instant, ease: easeOutQuint }
  }
};

export const linkHover: Variants = {
  rest: { x: 0 },
  hover: { 
    x: 3,
    transition: { duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }
  }
};

export const iconHover: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { 
    rotate: 5,
    scale: 1.1,
    transition: { duration: ANIMATION_DURATIONS.fast, ease: easeOutExpo }
  }
};

export function createSafeVariant(variant: Variants): Variants {
  const safeVariant: Variants = {};
  for (const key in variant) {
    const state = variant[key as keyof Variants];
    if (state && typeof state === 'object') {
      safeVariant[key as keyof Variants] = {
        ...state,
        transition: { duration: 0 },
      };
    }
  }
  return safeVariant;
}
