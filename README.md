# TaskMaster (WIP)

This repository is actively evolving and not final.

- We are using the **Vercel AI SDK** as the foundation for agentic workflows.
- We are currently using **Gemini** (`@ai-sdk/google`) as the LLM provider.
- We are also integrating **Better Auth + Drizzle** for authentication and database-backed user/session handling.
- Most architecture and implementation details will continue to change as feature requirements are refined.

## Current Scope

- Next.js App Router app
- Agentic base API endpoint at `POST /api/chat`
- Better Auth route base at `/api/auth/*`
- Drizzle migrations + PostgreSQL/Neon wiring
- `parse-test` for Gemini-based syllabus parsing
- `docling-test` for experimental Docling-based document parsing and artifact inspection

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create local env file:

```bash
cp .env.example .env.local
```

3. Fill required values in `.env.local`.

## Environment Variables

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_studio_api_key
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskmaster
DB_DRIVER=neon-http
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Development Commands

```bash
pnpm dev
pnpm lint
pnpm build
pnpm test
pnpm auth:generate
pnpm db:generate
pnpm db:migrate
```

## DoclingTest

`docling-test` is an experimental parsing workspace separate from `parse-test`. It accepts `PDF` and `DOCX`, runs a local Python Docling wrapper, persists the normalized academic preview to SQL, and also saves the literal Docling markdown plus raw JSON artifact for inspection.

Local prerequisite:

```bash
pip install docling
```

Relevant environment variables:

```env
ENABLE_DOCLING_TEST=true
DOCLING_BACKEND=local-python
DOCLING_PYTHON_BIN=python
DOCLING_TIMEOUT_MS=120000
```

## API Example (`/api/chat`)

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "u1",
        "role": "user",
        "parts": [{ "type": "text", "text": "Help me plan an implementation for a new TaskMaster module." }]
      }
    ]
  }'
```

## AI SDK Foundation Notes

- The current agent implementation is intentionally minimal and generic.
- No domain-specific tools are pre-wired yet.
- Extend from `agent/base-agent.ts` as product-specific functionality is defined.
