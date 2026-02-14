import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

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
      "wailsjs": path.resolve(__dirname, "./wailsjs/wailsjs"),
    },
  },
  define: {
    // Define a fake origin for Clerk to use
    'import.meta.env.VITE_APP_URL': JSON.stringify('http://localhost:5173'),
  },
});
