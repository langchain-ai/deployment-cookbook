# Deployment Cookbook

Reference implementations for running LangChain agents in production. Each example is a full-stack chat app — streaming UI, subagents, thread history — deployed on a different platform using the same [Agent Streaming Protocol](https://github.com/langchain-ai/agent-protocol/tree/main/streaming).

Use these projects as starting points when you need to ship an agent-backed product: copy the stack that matches your hosting environment, swap in your own tools and models, and upgrade persistence when you move beyond a single instance.

## What goes into an agent deployment

Every example in this cookbook follows the same shape. The framework and hosting change; the responsibilities do not.

### 1. Agent runtime

The agent itself, typically a LangGraph graph or [`deepagents`](https://www.npmjs.com/package/deepagents) coordinator, with tools, optional subagents, and middleware. It is compiled with a **checkpointer** so conversation state survives across turns. Examples start with an in-memory `MemorySaver` for simplicity; production deployments swap in Redis ([`@langchain/langgraph-checkpoint-redis`](https://www.npmjs.com/package/@langchain/langgraph-checkpoint-redis)), Postgres ([`@langchain/langgraph-checkpoint-postgres`](https://www.npmjs.com/package/@langchain/langgraph-checkpoint-postgres)), SQLite ([`@langchain/langgraph-checkpoint-sqlite`](https://www.npmjs.com/package/@langchain/langgraph-checkpoint-sqlite)), or platform-specific storage.

### 2. Protocol server

HTTP route handlers implement the [Agent Streaming Protocol](https://github.com/langchain-ai/agent-protocol/tree/main/streaming) under `/api/threads/...`.

#### Minimum (streaming chat)

These three endpoints are enough to run a single-threaded streaming chat with
`HttpAgentServerAdapter`:

| Method         | Path                              | Purpose                                         |
| -------------- | --------------------------------- | ----------------------------------------------- |
| `POST`         | `/api/threads/:threadId/commands` | Accept commands (`run.start`, …) and start runs |
| `POST`         | `/api/threads/:threadId/stream`   | SSE stream of protocol events for a run         |
| `GET` / `POST` | `/api/threads/:threadId/state`    | Read and bootstrap checkpointed thread state    |

#### Thread sidebar (all examples)

Every example here also implements endpoints for the thread-history sidebar:

| Method   | Path                             | Purpose                                   |
| -------- | -------------------------------- | ----------------------------------------- |
| `GET`    | `/api/threads`                   | List threads known to the checkpointer    |
| `DELETE` | `/api/threads/:threadId`         | Delete a thread's session and checkpoints |
| `POST`   | `/api/threads/:threadId/history` | Paginated checkpoint history              |

### 3. Session and run management

Server-side logic that tracks active runs, bridges commands to the agent, and fans out live events over SSE. A registry or session store lets clients reconnect to in-flight streams. On serverless or multi-instance hosts, this layer must be shared or colocated with the checkpointer.

### 4. Chat frontend

A browser UI wired to the protocol through `HttpAgentServerAdapter`, from [`@langchain/react`](https://www.npmjs.com/package/@langchain/react), [`@langchain/vue`](https://www.npmjs.com/package/@langchain/vue), [`@langchain/svelte`](https://www.npmjs.com/package/@langchain/svelte) or [`@langchain/angular`](https://www.npmjs.com/package/@langchain/angular). The client bootstraps thread state, submits messages, consumes the SSE stream, and renders tokens, tool calls, reasoning, and subagent activity.

These bindings ship no components of their own — they are UI-agnostic. Hooks like `useStream` return plain reactive state (messages, tool calls, loading flags, thread metadata) that you wire to whatever visual layer you prefer. The examples here use hand-rolled markup, but you can drop in any component library such as [AI Elements](https://elements.ai-sdk.dev/) or [Nuxt UI](https://ui.nuxt.com/), or hand rendering to a generative-UI framework like [OpenUI](https://www.openui.com/) or [CopilotKit](https://www.copilotkit.ai/). See the [frontend integrations overview](https://docs.langchain.com/oss/python/langchain/frontend/integrations/overview) for adapter patterns and trade-offs.

## Examples

Each directory is a self-contained app with its own README, env setup, and deploy instructions.

<table width="100%">
  <tr>
    <td align="center" width="33%">
      <a href="./js-langsmith">
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v16/icons/langchaincorporate.svg" width="64" height="64" alt="LangSmith" />
        <br />
        <strong>LangSmith Deployment</strong>
      </a>
      <br />
      <sub>LangGraph Agent Server · UI on Vercel</sub>
    </td>
    <td align="center" width="33%">
      <a href="./js-cloudflare">
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/cloudflare.svg" width="64" height="64" alt="Cloudflare" />
        <br />
        <strong>Cloudflare Workers</strong>
      </a>
      <br />
      <sub>Vite + React · Durable Objects</sub>
    </td>
    <td align="center" width="33%">
      <a href="./js-next">
        <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg" width="64" height="64" alt="Next.js" />
        <br />
        <strong>Next.js</strong>
      </a>
      <br />
      <sub>App Router · <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flangchain-ai%2Fdeployment-cookbook&root-directory=js-next&env=OPENAI_API_KEY">Deploy to Vercel</a></sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <a href="./js-sveltekit">
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/svelte.svg" width="64" height="64" alt="SvelteKit" />
        <br />
        <strong>SvelteKit</strong>
      </a>
      <br />
      <sub>Svelte · Cloudflare adapter</sub>
    </td>
    <td align="center" width="33%">
      <a href="./js-deno">
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/deno.svg" width="64" height="64" alt="Deno" />
        <br />
        <strong>Deno Deploy</strong>
      </a>
      <br />
      <sub>Vite + React · Hono</sub>
    </td>
    <td align="center" width="33%">
      <a href="./js-nuxt">
        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@v11/icons/nuxtdotjs.svg" width="64" height="64" alt="Nuxt" />
        <br />
        <strong>Nuxt</strong>
      </a>
      <br />
      <sub>Vue · Nitro server</sub>
    </td>
  </tr>
</table>

All examples share the same demo agent: a coordinator that delegates to `researcher` and `math-whiz` subagents with mock tools, so you can compare hosting choices without changing application behavior. Two of them target LangSmith specifically: [`js-langsmith`](./js-langsmith) hosts the agent graph on the **LangGraph Agent Server** (you own the runtime), while [`js-langsmith-managed`](./js-langsmith-managed) deploys the same coordinator as a fully **Managed Deep Agent** (LangChain hosts it; tools become MCP servers).

## References

- [Agent Streaming Protocol](https://github.com/langchain-ai/agent-protocol/tree/main/streaming) — wire format consumed by `HttpAgentServerAdapter`
- [`react-custom-backend`](https://github.com/langchain-ai/streaming-cookbook) — original Vite + Hono reference for a custom protocol server
- [LangGraph checkpointers](https://docs.langchain.com/oss/javascript/langgraph/checkpointers#checkpointer-libraries) — durable persistence for production
