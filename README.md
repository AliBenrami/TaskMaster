# TaskMaster Data Agent (API-Only)

Next.js + AI SDK `ToolLoopAgent` for data parsing workflows.

The project is currently API-only (GUI intentionally disabled).

## Project Status (WIP)

This repository is **in-progress** and not final.

- We are using the **Vercel AI SDK** as the foundation for agentic work.
- We are currently using **Gemini** specifically (`@ai-sdk/google`) as the model provider.
- This is an early baseline that will be expanded and refactored as specific functionality is defined.
- Most architecture, tools, and behavior are expected to evolve in later iterations.

## Model Provider

- Provider: `@ai-sdk/google`
- Model: `gemini-2.5-flash-lite`
- Env var: `GOOGLE_GENERATIVE_AI_API_KEY`

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Set your API key in `.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_studio_api_key
```

4. Start dev server:

```bash
pnpm dev
```

## API

- Route: `POST /api/chat`
- Handler: `app/api/chat/route.ts`
- Agent definition: `agent/data-parsing-agent.ts`
- Stream format: AI SDK UI message stream (SSE)
