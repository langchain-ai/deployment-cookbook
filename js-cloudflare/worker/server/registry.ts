import { agent, checkpointer } from "../agent";

/**
 * Worker-level registry for the compiled agent and checkpointer.
 *
 * Unlike Next.js route handlers (one Node process), Cloudflare Workers are
 * short-lived isolates. The agent and `MemorySaver` checkpointer live here so
 * thread state routes can read/write checkpoints. SSE replay buffers live in
 * per-thread Durable Objects (see `durable-objects/thread-session.ts`).
 */
export function getAgent() {
  return agent;
}

export function getCheckpointer() {
  return checkpointer;
}

export async function deleteThread(
  env: Env,
  threadId: string
): Promise<void> {
  await checkpointer.deleteThread(threadId);
  const stub = getSessionStub(env, threadId);
  await stub.fetch(new Request("https://session/clear", { method: "POST" }));
}

export function getSessionStub(env: Env, threadId: string) {
  const id = env.SESSIONS.idFromName(threadId);
  return env.SESSIONS.get(id);
}
