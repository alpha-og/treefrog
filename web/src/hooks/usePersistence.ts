import { useState, useEffect } from "react";

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);

    if (stored === null) return initial;

    try {
      return JSON.parse(stored);
    } catch {
      console.warn(`[Persistence] Invalid JSON for "${key}", resetting`);
      localStorage.removeItem(key);
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`[Persistence] Failed to store "${key}"`, err);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
