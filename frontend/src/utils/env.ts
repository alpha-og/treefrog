// Environment detection for shared frontend code
export const isWails = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check for window.go (standard Wails binding)
  if ((window as any).go !== undefined) {
    return true;
  }
  
  // Check for wails runtime markers
  if ((window as any).wails !== undefined) {
    return true;
  }
  
  // In dev mode, check if runtime might be available later
  // This is more permissive but safer for dev environments
  if (typeof (window as any).__wailsRuntime === 'object') {
    return true;
  }
  
  return false;
};

export const getEnvironment = (): 'wails' | 'web' => {
  return isWails() ? 'wails' : 'web';
};
