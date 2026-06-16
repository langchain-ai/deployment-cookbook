"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { StreamProvider } from "@langchain/react";

import {
  type ThreadSummary,
  createStreamClient,
  createThread,
  deleteThread,
  fetchThreads,
  getManagedAgentId,
  getManagedAgentIdError,
} from "@/lib/chat/threads-client";
import { Chat } from "./Chat";
import { ThreadHistory } from "./ThreadHistory";
import { MoonIcon, SunIcon } from "./ThemeIcons";

export function ChatApp() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadId, setThreadId] = useState<string>("");
  const initStarted = useRef(false);
  const agentId = getManagedAgentId();
  const agentIdError = getManagedAgentIdError();
  // Stable streaming client bound to the hosted Managed Deep Agent.
  const client = useMemo(() => (agentId ? createStreamClient() : null), [agentId]);

  const refreshThreads = useCallback(async () => {
    setThreads(await fetchThreads());
  }, []);

  useEffect(() => {
    if (initStarted.current || !agentId) return;
    initStarted.current = true;
    void (async () => {
      const list = await fetchThreads();
      if (list.length > 0) {
        setThreads(list);
        setThreadId(list[0].id);
      } else {
        const id = await createThread();
        setThreads(await fetchThreads());
        setThreadId(id);
      }
      setMounted(true);
    })();
  }, [agentId]);

  const handleSelect = useCallback(
    (id: string) => {
      if (id !== threadId) setThreadId(id);
    },
    [threadId]
  );

  const handleCreate = useCallback(async () => {
    const id = await createThread();
    await refreshThreads();
    setThreadId(id);
  }, [refreshThreads]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteThread(id);
      const list = await fetchThreads();
      setThreads(list);
      if (id !== threadId) return;
      if (list.length > 0) {
        setThreadId(list[0].id);
      } else {
        const freshId = await createThread();
        setThreads(await fetchThreads());
        setThreadId(freshId);
      }
    },
    [threadId]
  );

  const shellClassName = `app-shell ${theme === "light" ? "light" : ""}`;

  if (!agentId) {
    return (
      <div className={shellClassName}>
        <div className="empty-state center">
          {agentIdError ?? (
            <>
              Set <code>LANGSMITH_MANAGED_AGENT_ID</code> (and{" "}
              <code>LANGSMITH_API_KEY</code>) to connect to your deployed Managed
              Deep Agent. Deploy it with <code>pnpm run deploy</code>.
            </>
          )}
        </div>
      </div>
    );
  }

  if (!mounted || !threadId || !client) {
    return (
      <div className={shellClassName}>
        <div className="empty-state center">Preparing chat…</div>
      </div>
    );
  }

  return (
    <div className={shellClassName}>
      <button
        aria-label={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
        className="theme-toggle"
        onClick={() => setTheme((cur) => (cur === "dark" ? "light" : "dark"))}
        type="button"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <ThreadHistory
        activeThreadId={threadId}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onSelect={handleSelect}
        threads={threads}
      />

      <StreamProvider
        key={threadId}
        assistantId={agentId}
        client={client}
        threadId={threadId}
      >
        <Chat onRunSettled={refreshThreads} threadId={threadId} />
      </StreamProvider>
    </div>
  );
}
