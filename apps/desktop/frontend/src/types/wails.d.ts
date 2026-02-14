declare global {
  interface Window {
    go?: {
      main?: {
        App?: Record<string, (...args: unknown[]) => Promise<unknown>>;
      };
    };
    runtime?: {
      on: (event: string, callback: (data: unknown) => void) => void;
      emit: (event: string, data?: unknown) => void;
    };
  }
}

export {};