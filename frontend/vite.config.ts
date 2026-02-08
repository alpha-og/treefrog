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
        // Handle missing wailsjs module gracefully
        if (id.startsWith("wailsjs")) {
          const resolvedPath = path.resolve(__dirname, "../wails/frontend/wailsjs/wailsjs", id.slice("wailsjs".length));
          if (!fs.existsSync(resolvedPath)) {
            // Return a virtual module that exports nothing
            return "\0wailsjs-empty";
          }
        }
      },
      load(id) {
        if (id === "\0wailsjs-empty") {
          return "export {};";
        }
      },
    },
  ],
  resolve: {
    alias: {
      "wailsjs": path.resolve(__dirname, "../wails/frontend/wailsjs/wailsjs"),
    },
  },
});

