import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "wailsjs-fallback",
      resolveId(id) {
        // Handle all wailsjs imports with a virtual empty module
        if (id.startsWith("wailsjs")) {
          return "\0wailsjs-empty:" + id;
        }
      },
      load(id) {
        if (id.startsWith("\0wailsjs-empty:")) {
          return "export {};";
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@treefrog/types": path.resolve(__dirname, "../../packages/types/src"),
      "@treefrog/services": path.resolve(__dirname, "../../packages/services/src"),
      "@treefrog/hooks": path.resolve(__dirname, "../../packages/hooks/src"),
      "@treefrog/ui": path.resolve(__dirname, "../../packages/ui/src"),
    },
  },
});

