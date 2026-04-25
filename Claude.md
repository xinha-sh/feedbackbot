# FeedbackBot

## What this project is
Zero-signup feedback platform. One-paragraph summary from PLAN.md §1.
Full context in PLAN.md.

## Golden rules
1. Never invent APIs. If a Cloudflare binding, Better Auth method, or
   library function isn't in the docs, stop and ask.
2. All D1 queries scope by workspace_id. Always. Enforced by the
   query helper layer in packages/db/client.ts. Never write raw
   D1 queries in route handlers.
3. No secrets in code, no secrets in commits. Use env bindings.
4. Every new route gets: input validation (Zod schema from
   packages/schema), auth check (for admin routes), workspace
   scoping check, typed response.
5. Run `pnpm typecheck` and `pnpm test` before declaring a task done.

## Stack locks (do not swap without asking)
- Runtime: Cloudflare Workers
- Framework: TanStack Start for app, raw Hono or itty-router for api
- DB: D1 via drizzle-orm
- Auth: Better Auth with organization + magic-link + github + sso plugins
- Widget: Preact + htm, Shadow DOM, Vite build
- IaC: Alchemy (alchemy.run.ts at root)
- Styling: Tailwind + shadcn-style patterns, lucide-react icons

## File conventions
- kebab-case for files, PascalCase for React components
- One route handler per file under apps/api/src/routes/
- Shared types live in packages/schema; never duplicate types
- Migrations are numbered SQL files in packages/db/migrations/,
  never edited after commit — always add a new one

## Decision protocol
When you encounter a choice not specified in PLAN.md:
- If it's reversible and low-stakes: decide, log to DECISIONS.md, proceed
- If it affects data model, wire format, or security: stop and ask
- If you're unsure which bucket it falls into: ask

## Testing expectations
- Unit tests for: lib/ functions, integrations, queue consumers
- Integration tests for: API routes with miniflare
- No tests for: UI components (for MVP)
- Coverage target: meaningful coverage on lib/ and routes/, not %

## What "done" means for a task
- Code compiles, typechecks, tests pass
- Behavior matches the task's acceptance criteria
- DECISIONS.md updated if any non-obvious choice was made
- TASKS.md updated with ✅ and a one-line summary of what changed
- Brief commit message following conventional commits

## Things I will push back on
- Adding dependencies not already in package.json (ask first)
- Changing the data model (ask first)
- Skipping workspace_id scoping (never)
- Catch-and-ignore on errors (log and propagate)
- any types (use unknown + narrow, or fix the actual type)

## Reference docs
- Full plan: PLAN.md
- Task list: TASKS.md
- Decision log: DECISIONS.md
- Cloudflare: https://developers.cloudflare.com/workers/
- Better Auth: https://better-auth.com/docs
- Alchemy: https://alchemy.run/
- TanStack Start: https://tanstack.com/start
