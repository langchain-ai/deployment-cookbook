/**
 * Browser-side thread helpers for a Managed Deep Agent.
 *
 * The sidebar and setup helpers use the native `/v1/deepagents` thread
 * endpoints exposed by `@langchain/managed-deepagents`. The chat stream still
 * creates the SDK's LangGraph-compatible adapter because `@langchain/react`
 * consumes that generic client shape.
 */

import {
  Client as ManagedClient,
  type ThreadSummary as ManagedThreadSummary,
} from "@langchain/managed-deepagents";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readManagedAgentIdEnv(): string | undefined {
  return import.meta.env.LANGSMITH_MANAGED_AGENT_ID?.trim() || undefined;
}

/** Managed Deep Agent id (UUID) printed by `pnpm run deploy`. */
export function getManagedAgentId(): string | undefined {
  const value = readManagedAgentIdEnv();
  if (!value || !UUID_RE.test(value)) return undefined;
  return value;
}

/** Human-readable config error when the env var is set but not a UUID. */
export function getManagedAgentIdError(): string | undefined {
  const value = readManagedAgentIdEnv();
  if (!value || UUID_RE.test(value)) return undefined;
  return `LANGSMITH_MANAGED_AGENT_ID must be the UUID printed by \`pnpm run deploy\`, not the agent name. Got "${value}".`;
}

export function getApiKey(): string | undefined {
  return import.meta.env.LANGSMITH_API_KEY?.trim() || undefined;
}

function requireManagedAgentId(): string {
  const agentId = getManagedAgentId();
  if (!agentId) {
    const configError = getManagedAgentIdError();
    throw new Error(
      configError ??
        "LANGSMITH_MANAGED_AGENT_ID is not set. Deploy with `pnpm run deploy` and set the printed agent id."
    );
  }
  return agentId;
}

function createManagedClient(): ManagedClient {
  return new ManagedClient({ apiKey: getApiKey() });
}

/**
 * Build the LangGraph SDK client the UI streams from, bound to the hosted
 * Managed Deep Agent.
 *
 * NOTE: shipping a LangSmith API key to the browser is fine for a local demo,
 * but in production route requests through your own backend with a custom
 * `fetch` instead of exposing the key.
 */
export function createStreamClient() {
  return createManagedClient().getLangGraphClient({
    agentId: requireManagedAgentId(),
  });
}

/** Summary of a thread for the history sidebar. */
export type ThreadSummary = {
  id: string;
  title: string;
  updatedAt: string | null;
};

const UNTITLED = "New conversation";
const THREAD_PAGE_SIZE = 20;
const MAX_THREADS = 100;

function readStringField(
  value: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const field = value[key];
    if (typeof field === "string" && field.trim()) return field;
  }
  return undefined;
}

function titleFromThread(thread: ManagedThreadSummary): string {
  const title = readStringField(thread, ["title", "name"]);
  if (title) return title.slice(0, 80);

  const metadata = thread.metadata;
  if (typeof metadata === "object" && metadata != null) {
    const metadataTitle = readStringField(metadata, ["title", "name"]);
    if (metadataTitle) return metadataTitle.slice(0, 80);
  }
  return UNTITLED;
}

function toThreadSummary(thread: ManagedThreadSummary): ThreadSummary | undefined {
  const id = readStringField(thread, ["id", "thread_id", "threadId"]);
  if (!id) return undefined;
  return {
    id,
    title: titleFromThread(thread),
    updatedAt:
      readStringField(thread, ["updated_at", "state_updated_at", "created_at"]) ??
      null,
  };
}

/**
 * Fetch Managed Deep Agent threads, newest first when the API returns them that
 * way. List failures yield an empty sidebar instead of blocking chat startup.
 */
export async function fetchThreads(): Promise<ThreadSummary[]> {
  const client = createManagedClient();
  const agentId = requireManagedAgentId();
  const threads: ManagedThreadSummary[] = [];
  try {
    let cursor: string | undefined;
    do {
      const response = await client.threads.list({
        agentId,
        pageSize: THREAD_PAGE_SIZE,
        cursor,
      });
      threads.push(...(response.threads ?? []));
      cursor = response.next_cursor ?? undefined;
    } while (cursor && threads.length < MAX_THREADS);
  } catch {
    return [];
  }

  return threads
    .slice(0, MAX_THREADS)
    .map(toThreadSummary)
    .filter((thread): thread is ThreadSummary => thread !== undefined);
}

/** Create a thread on the hosted agent. */
export async function createThread(): Promise<string> {
  const thread = await createManagedClient().threads.create({
    agent_id: requireManagedAgentId(),
  });
  return thread.id;
}

/** Delete a thread. Managed preview may not support deletion, so ignore failures. */
export async function deleteThread(threadId: string): Promise<void> {
  try {
    await createManagedClient().threads.delete(threadId);
  } catch {
    // Managed preview may not expose thread deletion.
  }
}
