// Environment detection for shared frontend code
// In Wails mode, the generated modules from wailsjs/go/* should be available
export const isWails = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as { go?: unknown }).go !== undefined;
};

export const getEnvironment = (): 'wails' | 'web' => {
  return isWails() ? 'wails' : 'web';
};

/**
 * Get the Wails app context (window.go)
 * This is available after Wails runtime is loaded
 */
export const getWailsApp = (): { OpenAuthURL?: () => Promise<void>; SignOut?: () => Promise<void> } | null => {
  if (typeof window !== 'undefined' && (window as { go?: { main?: { App?: unknown } } }).go) {
    return (window as { go?: { main?: { App?: { OpenAuthURL?: () => Promise<void>; SignOut?: () => Promise<void> } } } }).go?.main?.App ?? null;
  }
  return null;
};

// Wait for Wails runtime to be ready (window.runtime to be injected)
// Returns true if Wails is available, false if timeout
export const waitForWails = async (maxWaitMs: number = 3000): Promise<boolean> => {
  if (isWails()) return true;
  
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    if (isWails()) return true;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return isWails();
};
