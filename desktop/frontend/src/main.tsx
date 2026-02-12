import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { router } from "./router";
import { createLogger } from "./utils/logger";
import { AnimationProvider } from "./utils/animation-context";
import { useAuthStore } from "./stores/authStore";
import "./globals.css";

const log = createLogger("Main");

const initializeFirstLaunch = () => {
  const authStoreExists = localStorage.getItem('treefrog-auth');
  if (!authStoreExists) {
    log.debug('First app launch detected');
  } else {
    try {
      const parsed = JSON.parse(authStoreExists);
      if (parsed.state?.isFirstLaunch === undefined) {
        const store = useAuthStore.getState();
        store.markFirstLaunchComplete();
        log.debug('Migrated old auth store format');
      }
    } catch {
      log.debug('Could not parse auth store');
    }
  }
};

initializeFirstLaunch();

const initializeTheme = () => {
  const storedTheme = localStorage.getItem("treefrog-app");
  let theme = "dark";
  
  if (storedTheme) {
    try {
      const parsed = JSON.parse(storedTheme);
      theme = parsed.state?.theme || "dark";
    } catch {}
  }
  
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else if (theme === "light") {
    document.documentElement.classList.remove("dark");
  } else if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isDark);
  }
};

initializeTheme();

import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    if (label === "json") return new JsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new CssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker();
    if (label === "typescript" || label === "javascript") return new TsWorker();
    return new EditorWorker();
  },
};

function isWailsEnvironment(): boolean {
  return typeof window !== 'undefined' && 
    (window.location.protocol === 'wails:' || 
     (window as any).go !== undefined);
}

function AppContent() {
  const { setMode, setSessionToken, setUser, mode } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const isWails = isWailsEnvironment();
    
    if (isWails) {
      log.info("Wails environment detected - using browser-based auth");
      
      // Check if user is already authenticated via Go backend
      const checkAuth = async () => {
        try {
          const { GetAuthState } = (window as any).go?.main?.App || {};
          if (GetAuthState) {
            const state = await GetAuthState();
            if (state?.isAuthenticated && state?.user) {
              setMode('clerk');
              setUser({
                id: state.user.id,
                email: state.user.email,
                name: state.user.firstName,
              });
              log.info("Restored authenticated session from Go backend");
            } else {
              setMode('guest');
            }
          } else {
            setMode('guest');
          }
        } catch (error) {
          log.warn("Could not check auth state:", error);
          setMode('guest');
        }
        setIsReady(true);
      };
      
      checkAuth();
      
      // Listen for auth callbacks from Go backend
      const { EventsOn } = (window as any).runtime || {};
      if (EventsOn) {
        EventsOn("auth:callback", (data: any) => {
          log.info("Auth callback received", data);
          if (data?.success) {
            setMode('clerk');
            toast.success("Signed in successfully");
            // Refresh auth state
            checkAuth();
          }
        });
        
        EventsOn("auth:signout", () => {
          log.info("Sign out event received");
          setMode('guest');
          setSessionToken(null);
          setUser(null);
        });
      }
    } else {
      // Web environment - could use Clerk SDK here later
      setMode('guest');
      setIsReady(true);
    }
  }, [setMode, setSessionToken, setUser]);

  if (!isReady) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AnimationProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </AnimationProvider>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AppContent />
    </React.StrictMode>
  );
}
