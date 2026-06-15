import { DurableObject } from "cloudflare:workers";
import {
  StreamChannel,
  matchesSubscription,
  type ProtocolEvent,
} from "@langchain/langgraph/stream";
import type { SubscribeParams } from "@langchain/protocol";

import { isRecord, sanitizeForJson } from "../server/serialize";

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

const SSE_HEADERS = {
  "cache-control": "no-cache, no-transform",
  "content-type": "text/event-stream",
  connection: "keep-alive",
  "x-accel-buffering": "no",
};

/**
 * Per-thread Durable Object that owns the Agent Streaming Protocol event log.
 *
 * The Worker runs the LangGraph agent and POSTs each protocol event here.
 * Browser clients subscribe via `/stream`, which replays buffered events and
 * stays attached for live frames — the Cloudflare-native way to keep SSE replay
 * durable across Worker invocations and isolates.
 */
export class ThreadSession extends DurableObject {
  readonly #log = StreamChannel.local<ProtocolEvent>();
  #nextSeq = 0;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/publish") {
      const event = (await request.json()) as ProtocolEvent;
      this.#publish(event);
      return new Response(null, { status: 204 });
    }

    if (request.method === "POST" && url.pathname === "/stream") {
      const params = (await request.json()) as SubscribeParams;
      return new Response(this.#stream(params), { headers: SSE_HEADERS });
    }

    if (request.method === "POST" && url.pathname === "/clear") {
      this.#nextSeq = 0;
      await this.ctx.storage.deleteAll();
      return new Response(null, { status: 204 });
    }

    return new Response("Not Found", { status: 404 });
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

  #stream(params: SubscribeParams) {
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
}

export default ThreadSession;
