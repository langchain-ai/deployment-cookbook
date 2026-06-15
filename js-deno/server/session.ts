import type { ReactAgent } from "langchain";
import {
  StreamChannel,
  matchesSubscription,
  type ProtocolEvent,
} from "@langchain/langgraph/stream";
import type {
  Command,
  CommandResponse,
  ErrorResponse,
  SubscribeParams,
} from "@langchain/protocol";

import { isRecord, sanitizeForJson } from "./serialize.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReactAgent = ReactAgent<any>;

type AgentRunInput = Parameters<AnyReactAgent["streamEvents"]>[0];

function sanitizeEvent(event: ProtocolEvent): ProtocolEvent {
  const params = event.params as Record<string, unknown>;
  const sanitizedParams: Record<string, unknown> = {
    ...params,
    data: sanitizeForJson(params.data),
  };
  if ("interrupts" in params) {
    sanitizedParams.interrupts = sanitizeForJson(params.interrupts);
  }
  return { ...event, params: sanitizedParams } as ProtocolEvent;
}

function encodeSse(event: ProtocolEvent) {
  const eventId = (event as { event_id?: string }).event_id;
  const id = eventId ?? (typeof event.seq === "number" ? `${event.seq}` : "");
  const idLine = id ? `id: ${id}\n` : "";
  return new TextEncoder().encode(
    `${idLine}event: message\ndata: ${JSON.stringify(event)}\n\n`
  );
}

/**
 * Minimal in-memory Agent Streaming Protocol session for the example.
 *
 * This class is the server-side counterpart to `HttpAgentServerAdapter`:
 *
 * - `POST /threads/:thread_id/commands` sends a JSON `Command` and receives a
 *   `CommandResponse` or `ErrorResponse`.
 * - `POST /threads/:thread_id/stream` opens a connection-scoped SSE
 *   subscription described by `SubscribeParams`.
 * - Events are buffered by `seq` and replayed to later subscriptions.
 */
export class LocalThreadSession {
  readonly #agent: AnyReactAgent;
  readonly #threadId: string;
  readonly #log = StreamChannel.local<ProtocolEvent>();
  #nextSeq = 0;
  #activeRun:
    | {
        abort(reason?: unknown): void;
      }
    | undefined;

  constructor(agent: AnyReactAgent, threadId: string) {
    this.#agent = agent;
    this.#threadId = threadId;
  }

  async handleCommand(
    command: Command
  ): Promise<CommandResponse | ErrorResponse> {
    if (command.method !== "run.start") {
      return {
        type: "error",
        id: command.id,
        error: "unknown_command",
        message: `Unsupported command: ${command.method}`,
      } as ErrorResponse;
    }

    const params = isRecord(command.params)
      ? (command.params as { input?: unknown })
      : {};
    const runId = crypto.randomUUID();
    void this.#startRun(params.input as AgentRunInput, runId);

    return {
      type: "success",
      id: command.id,
      result: { run_id: runId },
    } as CommandResponse;
  }

  stream(params: SubscribeParams) {
    const cursor = this.#log.iterate();

    return new ReadableStream<Uint8Array>({
      pull: async (controller) => {
        for (;;) {
          const { value: event, done } = await cursor.next();
          if (done) {
            controller.close();
            return;
          }
          if (matchesSubscription(event, params)) {
            controller.enqueue(encodeSse(event));
            return;
          }
        }
      },
      cancel: () => {
        void cursor.return?.(undefined);
      },
    });
  }

  #publish(rawEvent: ProtocolEvent) {
    const seq = this.#nextSeq;
    this.#nextSeq += 1;
    const event = sanitizeEvent({
      ...rawEvent,
      type: "event",
      seq,
    } as ProtocolEvent);
    this.#log.push(event);
  }

  async #startRun(input: AgentRunInput, runId: string) {
    this.#activeRun?.abort("Starting a new run.");
    const run = await this.#agent.streamEvents(input, {
      version: "v3",
      configurable: { thread_id: this.#threadId, run_id: runId },
    });
    this.#activeRun = run;

    try {
      for await (const rawEvent of run) {
        this.#publish(rawEvent as ProtocolEvent);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (this.#activeRun === run) {
        this.#activeRun = undefined;
      }
    }
  }
}
