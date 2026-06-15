/**
 * Process-local registry for the agent and its per-thread sessions.
 *
 * Under Deno Deploy each isolate keeps its own in-memory registry. For
 * production, swap the checkpointer in `server/agent/index.ts` for a durable
 * backend and use a shared session/replay store.
 */

import { agent, checkpointer } from "./agent/index.ts";
import { LocalThreadSession } from "./session.ts";

const sessions = new Map<string, LocalThreadSession>();

export function getAgent() {
  return agent;
}

export function getCheckpointer() {
  return checkpointer;
}

export function getSession(threadId: string): LocalThreadSession {
  let session = sessions.get(threadId);
  if (session == null) {
    session = new LocalThreadSession(agent, threadId);
    sessions.set(threadId, session);
  }
  return session;
}

export async function deleteThread(threadId: string): Promise<void> {
  sessions.delete(threadId);
  await checkpointer.deleteThread(threadId);
}
