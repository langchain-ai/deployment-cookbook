import path from "node:path";

import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  environments: {
    js_cloudflare: {
      resolve: {
        // Cloudflare Workers support node:async_hooks with nodejs_compat. Use
        // LangGraph's node entry for the Worker bundle so DeepAgents' task tool
        // can read AsyncLocalStorage-backed runtime config.
        conditions: ["module", "node", "production"],
        noExternal: ["@langchain/langgraph", "deepagents", "langchain"],
      },
    },
  },
});
