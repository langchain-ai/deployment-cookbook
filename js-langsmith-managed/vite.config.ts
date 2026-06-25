import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Expose `LANGSMITH_*` env vars (not just `VITE_*`) to the client so a single
  // LANGSMITH_API_KEY serves both `deepagents deploy` and the browser client.
  envPrefix: ["VITE_", "LANGSMITH_"],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
