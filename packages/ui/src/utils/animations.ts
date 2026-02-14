export const ANIMATION_DURATIONS = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const errorShake = {
  x: [0, -10, 10, -10, 10, 0],
  transition: { duration: 0.4 },
};

export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}