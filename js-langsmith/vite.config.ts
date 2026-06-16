import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import { createLangGraphViteProxy } from "./scripts/vite-langgraph-proxy.js";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: createLangGraphViteProxy(),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
