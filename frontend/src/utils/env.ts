// Environment detection for shared frontend code
// In Wails mode, the generated modules from wailsjs/go/* should be available
export const isWails = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as any).go !== undefined;
};

export const getEnvironment = (): 'wails' | 'web' => {
  return isWails() ? 'wails' : 'web';
};
