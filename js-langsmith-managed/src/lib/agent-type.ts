/**
 * State shape passed to `useStreamContext`. A Managed Deep Agent resolves its
 * state schema at runtime, so a permissive record is sufficient for the UI.
 */
export type Agent = Record<string, unknown>;
