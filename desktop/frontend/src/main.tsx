import React from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { router } from "./router";
import { createLogger } from "./utils/logger";
import { AnimationProvider } from "@treefrog/ui";
import "./globals.css";

const log = createLogger("Main");

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  log.warn("VITE_CLERK_PUBLISHABLE_KEY is not set. Authentication may not work properly.");
}

// Initialize theme on app startup to prevent flash
const initializeTheme = () => {
  const storedTheme = localStorage.getItem("treefrog-app");
  let theme = "dark"; // Default to dark
  
  if (storedTheme) {
    try {
      const parsed = JSON.parse(storedTheme);
      theme = parsed.state?.theme || "dark";
    } catch (e) {
      // Fallback to default
    }
  }
  
  // Apply theme to DOM
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else if (theme === "light") {
    document.documentElement.classList.remove("dark");
  } else if (theme === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
};

initializeTheme();

// Import Wails runtime to ensure window.go is available in dev mode
// Use dynamic import to handle missing bindings on fresh clones
import("wailsjs/runtime").catch(() => {
  // Bindings will be generated during build
  log.debug("Wails runtime bindings not yet generated");
});

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

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPubKey}>
        <AnimationProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors closeButton />
        </AnimationProvider>
      </ClerkProvider>
    </React.StrictMode>
  );
}
