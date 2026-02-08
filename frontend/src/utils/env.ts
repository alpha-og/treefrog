// Environment detection for shared frontend code
export const isWails = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as any).go !== undefined;
};

export const getEnvironment = (): 'wails' | 'web' => {
  return isWails() ? 'wails' : 'web';
};
