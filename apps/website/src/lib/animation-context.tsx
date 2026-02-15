import React, { createContext, useContext, useEffect, useState } from "react";
import type { Variants } from "motion/react";
import { ANIMATION_DURATIONS, createSafeVariant } from "./animations";

interface AnimationContextType {
  animationsEnabled: boolean;
  prefersReducedMotion: boolean;
  getDuration: (base?: number) => number;
}

const AnimationContext = createContext<AnimationContextType>({
  animationsEnabled: true,
  prefersReducedMotion: false,
  getDuration: () => ANIMATION_DURATIONS.normal,
});

function getInitialReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialReducedMotion);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.("change", handler);
    return () => mediaQuery.removeEventListener?.("change", handler);
  }, []);

  const getDuration = (base = ANIMATION_DURATIONS.normal): number =>
    prefersReducedMotion ? 0 : base;

  return (
    <AnimationContext.Provider value={{ animationsEnabled: true, prefersReducedMotion, getDuration }}>
      {children}
    </AnimationContext.Provider>
  );
}

export const useAnimation = () => useContext(AnimationContext);
export const useReducedMotion = () => useAnimation().prefersReducedMotion;

export function useAnimationVariant(variant: Variants, skip = false): Variants {
  const { prefersReducedMotion, animationsEnabled } = useAnimation();
  return skip || !animationsEnabled || prefersReducedMotion ? createSafeVariant(variant) : variant;
}
