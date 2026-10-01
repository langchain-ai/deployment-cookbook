# Deploying a LangChain Agent as a Managed Deep Agent

This example gets you from a local checkout to a hosted LangChain agent with a working chat UI. The agent runs as a **Managed Deep Agent**: you deploy instructions and configuration, and LangChain hosts the agent runtime for you.

Use this page when you want the fastest path to a deployed agent. The setup has two parts:

1. Deploy the Managed Deep Agent from `managed-agent/`.
2. Run or deploy the React chat UI from `src/`.

## Start Here

### What you are deploying

A **Managed Deep Agent** is a hosted deep agent. You do not run a LangGraph Agent Server yourself. Instead, you deploy a small project made of files:

- `agent.json` names the agent, model, and backend.
- `AGENTS.md` gives the agent its instructions.
- `subagents/` defines specialist agents the coordinator can delegate to.
- `skills/` packages reusable procedures the agent loads on demand.
- `tools.json` lists MCP-backed tools, if your agent needs tools.

This project deploys the same cookbook agent pattern used elsewhere in this repo: a coordinator delegates research tasks to `researcher`, math tasks to `math-whiz`, then combines the results.

### How the pieces fit

The flow is simple:

1. `pnpm run deploy` uploads `managed-agent/` to LangChain.
2. LangChain creates or updates the hosted Managed Deep Agent.
3. The React UI streams chat responses from that hosted agent.

Deploy the agent first because the UI needs the hosted agent's `agent_id`.

### What you need

- Managed Deep Agents [private-preview access](https://www.langchain.com/langsmith-managed-deep-agents-waitlist) in LangSmith Cloud, US region.
- A [LangSmith API key](https://docs.langchain.com/langsmith/create-account-api-key) for a workspace with that access.
- `pnpm`.
- The `deepagents` CLI, version `0.2.2` or later.

Install or update the CLI:

```bash
uv tool install "deepagents-cli>=0.2.2"
# or
pip install -U "deepagents-cli>=0.2.2"

deepagents --version
```

If `deepagents --version` shows an older version, another `deepagents` executable may be earlier on your `PATH`.

## Deploy In 5 Steps

### 1. Install dependencies

```bash
cd js-langsmith-managed
pnpm install
```

### 2. Create your local environment file

```bash
cp .env.example .env
```

Open `.env` and set:

```bash
LANGSMITH_API_KEY=<your LangSmith API key>
```

This key is used by both the deploy command and the local demo UI.

> [!WARNING]
> The demo exposes `LANGSMITH_API_KEY` to the browser bundle so the UI can call the hosted agent directly. That is convenient for local testing, but not production-safe. For a real app, proxy requests through your own backend and keep the key server-side.

### 3. Deploy the Managed Deep Agent

```bash
pnpm run deploy
```

This runs:

```bash
deepagents deploy --dir managed-agent
```

On the first successful deploy, the CLI creates the hosted agent and prints an `agent_id`, revision, agent URL, and MCP health check:

```text
Deployed: deployment-cookbook-coordinator
  agent_id: 585b5f3c-3409-4923-b0ed-79b86a8425e8
  revision: 7ca95573
  https://smith.langchain.com/o/-/agents/585b5f3c-3409-4923-b0ed-79b86a8425e8
  health:   {'agent_id': '585b5f3c-3409-4923-b0ed-79b86a8425e8', 'mcp_check': {'ok': True, 'servers': []}, 'checked_at': '2026-06-16T22:03:34.107200203Z'}
```

Save the `agent_id`; the UI needs it in the next step.

To inspect what will be deployed before creating or updating the hosted agent, run:

```bash
deepagents deploy --dir managed-agent --dry-run
```

### 4. Point the UI at the deployed agent

Add the `agent_id` from the deploy output to `.env`:

```bash
LANGSMITH_MANAGED_AGENT_ID=<agent_id from deploy>
```

Your `.env` should now contain:

```bash
LANGSMITH_API_KEY=<your LangSmith API key>
LANGSMITH_MANAGED_AGENT_ID=<agent_id from deploy>
```

### 5. Run the chat UI

```bash
pnpm dev
```

Open the Vite dev server at [http://localhost:5173](http://localhost:5173). Try a prompt that uses both subagents:

```text
Research LangGraph streaming, and separately calculate 42 * 17.
```

If `LANGSMITH_MANAGED_AGENT_ID` is missing, the app shows a setup message instead of the chat.

## Deploy The Frontend

The agent is already hosted by LangChain after `pnpm run deploy`. Vercel only needs to host the static React app.

1. Create a Vercel project from this repo.
2. Set **Root Directory** to `js-langsmith-managed`.
3. Use the default Vite build. The build output is `dist/`.
4. Set these environment variables in Vercel:
   - `LANGSMITH_MANAGED_AGENT_ID`: the deployed Managed Deep Agent id.
   - `LANGSMITH_API_KEY`: the LangSmith API key used by the demo client.

For production, replace the direct browser API-key flow with your own backend proxy before publishing to users.

## Troubleshooting

- `deepagents` is not found: install the CLI with `uv tool install "deepagents-cli>=0.2.2"` or `pip install -U "deepagents-cli>=0.2.2"`.
- Deploy says you do not have access: confirm your LangSmith workspace has Managed Deep Agents private-preview access and that `LANGSMITH_API_KEY` belongs to that workspace.
- The UI shows a configuration message: set `LANGSMITH_MANAGED_AGENT_ID` in `.env` and restart `pnpm dev`.
- Past threads or generated titles are missing: this is expected in private preview for some Managed Deep Agents endpoints. Streaming chat still works.
- You changed files in `managed-agent/` but the hosted agent did not change: run `pnpm run deploy` again.

## Learn The Project

### Managed Deep Agent files

Deploy syncs every file in `managed-agent/` to the hosted agent's managed file tree:

```text
managed-agent/
├── agent.json
├── AGENTS.md
├── tools.json
├── skills/
│   └── combined-report/
│       ├── SKILL.md
│       └── templates/
│           └── report.md
└── subagents/
    ├── researcher/
    │   ├── agent.json
    │   └── AGENTS.md
    └── math-whiz/
        ├── agent.json
        └── AGENTS.md
```

The top-level `agent.json` declares the model in `{provider}:{model_id}` form and selects the backend:

```json
{
  "name": "deployment-cookbook-coordinator",
  "description": "Coordinator deep agent that delegates lookups to the researcher subagent and math to the math-whiz subagent, then combines their results into a short, labeled answer.",
  "model": "openai:gpt-5.4-mini",
  "backend": {
    "type": "state"
  }
}
```

See the [CLI project file reference](https://docs.langchain.com/langsmith/managed-deep-agents-cli#project-file-reference) for every supported field, and [Choose a backend](https://docs.langchain.com/langsmith/managed-deep-agents-deploy#choose-a-backend) for the `sandbox` backend option.

### Tools are MCP-backed

Managed Deep Agents can only call tools from registered **MCP servers**. They cannot run local code tools like the LangGraph example's mock `search_web` or `calculator` functions.

This project ships with an empty `tools.json` so the first deploy succeeds. To add tools, register an MCP server for your workspace, print its tool snippet, add that snippet to the right `tools.json`, and redeploy:

```bash
deepagents mcp-servers add --url https://example.com/mcp --name my-tools
deepagents mcp-servers tools my-tools
```

Example `tools.json`:

```json
{
  "tools": [
    {
      "name": "search_web",
      "mcp_server_url": "https://example.com/mcp",
      "mcp_server_name": "my-tools"
    }
  ]
}
```

Use `managed-agent/tools.json` for coordinator-level tools. Use `managed-agent/subagents/<name>/tools.json` for tools that should only be available to one subagent. Deploy validates referenced MCP server URLs before updating the hosted agent.

### Skills are loaded on demand

Skills package reusable procedures, domain knowledge, and reference assets that the agent reads only when a task needs them. Unlike tools, skills are not MCP-backed — they are plain files — so they are a good fit for a Managed Deep Agent that cannot run local code tools.

Each skill is a directory under `skills/<name>/` containing a `SKILL.md` with YAML frontmatter (`name` and `description`) followed by markdown instructions. The skill directory can also hold supporting files such as templates, scripts, or reference docs, which deploy syncs recursively. Skills follow the [Agent Skills specification](https://agentskills.io/specification).

Deep agents load skills with **progressive disclosure**: at startup the agent reads only each skill's `name` and `description` into its system prompt, then reads the full `SKILL.md` (and any files it references) only when a request matches that description. This keeps startup context small while still making rich capabilities available on demand.

This project ships one skill, `combined-report`, which the coordinator uses to format a labeled final answer whenever more than one subagent ran. `managed-agent/AGENTS.md` tells the coordinator to reach for it, and its `templates/report.md` asset shows how supporting files travel with the skill:

```text
skills/
└── combined-report/
    ├── SKILL.md          # frontmatter + instructions (always discovered)
    └── templates/
        └── report.md     # supporting asset, read only when the skill loads
```

The demo prompt (`Research LangGraph streaming, and separately calculate 42 * 17.`) runs both subagents, so the coordinator activates this skill. In the chat UI you will see the agent read `SKILL.md` as a file-read tool call before it writes the formatted answer. Use `managed-agent/skills/` for coordinator-level skills and `managed-agent/subagents/<name>/skills/` for skills scoped to a single subagent.

### Chat UI

The React app in `src/` talks to the hosted agent with [`@langchain/managed-deepagents`](https://www.npmjs.com/package/@langchain/managed-deepagents). It uses native Managed Deep Agents thread endpoints for the sidebar and `@langchain/react` for streaming chat.

The UI builds a LangGraph-compatible client with:

```ts
new Client({ apiKey }).getLangGraphClient({ agentId });
```

The adapter keeps `@langchain/react` streaming compatible with the Managed Deep Agents `/v1/deepagents` routes. Thread listing, creation, and deletion use the Managed Deep Agents SDK client directly. The wiring lives in `src/lib/chat/threads-client.ts`.

Both client variables use the `LANGSMITH_` prefix. `vite.config.ts` exposes that prefix to the browser with `envPrefix`, so the demo does not need a duplicate `VITE_LANGSMITH_API_KEY`.

> [!NOTE]
> Managed Deep Agents are hosted-only. There is no local agent runtime for this example, so the UI always streams from a deployed agent.

### Managed Deep Agent vs. LangSmith Deployment

This example is a **Managed Deep Agent**. LangChain hosts the agent runtime, and you deploy declarative files from `managed-agent/`.

The sibling [`../js-langsmith`](../js-langsmith) example deploys the same agent as a **LangSmith Deployment**. In that version, you define the graph in code and run it on the LangGraph Agent Server.

Use this example when you want the least infrastructure, your agent behavior fits instructions plus subagents, and your tools come from MCP servers. Use [`../js-langsmith`](../js-langsmith) when you need custom graph code, custom code tools, middleware, checkpointer control, or the standard Agent Server API surface.

### Private-preview limitations

Managed Deep Agents are currently in private preview, and the API does not mirror every LangGraph Agent Server endpoint yet. This demo uses the Managed Deep Agents thread list endpoint for history, so titles may be empty when the API does not return one. Streaming chat, subagents, and tool-call rendering work.

## Run From The SDK

You do not need the UI to run the agent. Stream a response with the [TypeScript SDK](https://docs.langchain.com/langsmith/managed-deep-agents-sdk):

```ts
import { Client } from "@langchain/managed-deepagents";

const agentId = process.env.LANGSMITH_MANAGED_AGENT_ID!;
const client = new Client({ apiKey: process.env.LANGSMITH_API_KEY });

const thread = await client.threads.create({ agent_id: agentId });
const lg = client.getLangGraphClient({ agentId });

const stream = lg.runs.stream(thread.id, agentId, {
  input: {
    messages: [
      {
        role: "user",
        content:
          "Research LangGraph streaming, and separately calculate 42 * 17.",
      },
    ],
  },
  streamMode: ["values", "updates", "messages-tuple"],
  streamSubgraphs: true,
});

for await (const event of stream) {
  console.log(event.event, event.data);
}
```

## Project Layout

```text
js-langsmith-managed/
├── package.json
├── managed-agent/         # Managed Deep Agent project
├── vite.config.ts         # exposes LANGSMITH_* to the demo client
├── index.html
├── tsconfig*.json
├── src/                   # Vite + React chat UI
└── .env.example
```

## References

- [Deploy a Managed Deep Agent](https://docs.langchain.com/langsmith/managed-deep-agents-deploy)
- [Managed Deep Agents overview](https://docs.langchain.com/langsmith/managed-deep-agents-overview)
- [Managed Deep Agents quickstart](https://docs.langchain.com/langsmith/managed-deep-agents-quickstart)
- [Managed Deep Agents CLI reference](https://docs.langchain.com/langsmith/managed-deep-agents-cli)
- [Managed Deep Agents SDKs](https://docs.langchain.com/langsmith/managed-deep-agents-sdk)
- [Connect tools with MCP](https://docs.langchain.com/langsmith/managed-deep-agents-mcp)
- [`js-langsmith`](../js-langsmith) for the same agent as a LangSmith Deployment
