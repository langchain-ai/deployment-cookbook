import type { ReactAgent } from "langchain";

/** Type shim for `useStreamContext` — mirrors the server deep agent. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Agent = ReactAgent<any>;
