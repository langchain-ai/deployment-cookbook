/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENT_API_URL?: string;
  readonly VITE_LANGSMITH_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
