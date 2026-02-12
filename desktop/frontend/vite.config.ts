import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@treefrog/types": path.resolve(__dirname, "../../packages/types/src"),
      "@treefrog/services": path.resolve(__dirname, "../../packages/services/src"),
      "@treefrog/hooks": path.resolve(__dirname, "../../packages/hooks/src"),
      "wailsjs": path.resolve(__dirname, "./wailsjs/wailsjs"),
    },
  },
});

