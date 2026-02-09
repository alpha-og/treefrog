import { useState, useEffect } from "react";
import { createLogger } from "../utils/logger";

const log = createLogger("Persistence");

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);

    if (stored === null) return initial;

    try {
      return JSON.parse(stored);
    } catch {
      log.warn(`Invalid JSON for "${key}", resetting`);
      localStorage.removeItem(key);
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      log.error(`Failed to store "${key}"`, { error: err });
    }
  }, [key, value]);

  return [value, setValue] as const;
}
