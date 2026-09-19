# InterviewAI

InterviewAI is an AI interview preparation studio that helps candidates practice in context, see measurable readiness signals, and improve through focused repetition.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (managed workflow port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- First-time Replit setup: install dependencies with `pnpm install`, run `pnpm --filter @workspace/db run push`, and use the managed `artifacts/interview-ai: web` and `artifacts/api-server: API Server` workflows.
- Authentication uses Clerk session cookies; keep the configured Clerk secrets in the workspace and do not add bearer-token handling to browser requests.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/interview-ai` — React + Vite web app, routes, Clerk-powered auth screens, and the product theme.
- `artifacts/api-server` — Express API with Clerk middleware and protected dashboard/profile/interview routes.
- `lib/api-spec/openapi.yaml` — source of truth for API contracts.
- `lib/db/src/schema` — Drizzle schema for users, profiles, and interviews.
- `lib/api-client-react/src/generated` — generated React Query hooks and types.

## Architecture decisions

- Clerk owns browser authentication and session cookies; the API does not implement local password storage or bearer-token handling for the web app.
- The browser client is generated from OpenAPI so route payloads and response shapes stay aligned with the Express API.
- User records are provisioned just in time from the Clerk user ID, keeping application profile data relational without duplicating auth credentials.
- Interview scores and readiness are practice metrics only; they are not predictions of hiring outcomes.

## Product

- Public landing page focused on the practice loop and measurable signal.
- Branded Clerk sign-in and sign-up routes.
- Protected dashboard, candidate profile editor, interview history, interview configuration, and interview report surfaces.
- Protected preparation surfaces for interview readiness, the searchable question bank, and a persistent seven-day study plan.
- PostgreSQL-backed profile and interview foundation ready for resume analysis and the AI interview engine.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Regenerate the API client after changing `lib/api-spec/openapi.yaml` with `pnpm --filter @workspace/api-spec run codegen`.
- Browser auth uses Clerk cookies. Do not add `Authorization` headers or mobile-style token getters to the web client.
- The API workflow owns the `/api` service path and the web workflow owns `/`; use their managed workflows rather than starting root-level dev commands.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
