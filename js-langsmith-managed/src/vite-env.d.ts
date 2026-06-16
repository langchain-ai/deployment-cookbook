/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Both exposed to the client via `envPrefix` in vite.config.ts; LANGSMITH_API_KEY
  // is shared with the `deepagents deploy` step.
  readonly LANGSMITH_MANAGED_AGENT_ID?: string;
  readonly LANGSMITH_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
