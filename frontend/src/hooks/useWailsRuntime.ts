import { useEffect } from "react";

// Declare Wails runtime types
interface WailsRuntime {
  WindowMinimise?: () => void;
  WindowMaximise?: () => void;
  WindowUnmaximise?: () => void;
  WindowToggleMaximise?: () => void;
  WindowClose?: () => void;
  WindowIsMaximised?: () => Promise<boolean>;
}

declare global {
  interface Window {
    runtime?: WailsRuntime;
  }
}

export function useWailsRuntime() {
  const runtime = typeof window !== "undefined" ? window.runtime : null;

  return {
    minimize: () => {
      runtime?.WindowMinimise?.();
    },
    maximize: () => {
      runtime?.WindowToggleMaximise?.();
    },
    close: () => {
      runtime?.WindowClose?.();
    },
    isAvailable: !!runtime,
  };
}
