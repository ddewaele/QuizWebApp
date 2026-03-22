# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Server (run from `server/`)
```bash
npm run dev              # Start dev server (tsx watch, port 3000)
npm run build            # TypeScript compile
npm test                 # Run tests (vitest)
npm run test:watch       # Run tests in watch mode
npm run lint             # ESLint
npm run format           # Prettier
npx prisma migrate dev   # Create and apply migration
npx prisma db push       # Push schema to DB (no migration file)
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Visual database editor
```

### Client (run from `client/`)
```bash
npm run dev              # Start Vite dev server (port 5174)
npm run build            # TypeScript + Vite build
npm run lint             # ESLint
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # Playwright with UI
```

### Infrastructure
```bash
docker compose up -d     # Start PostgreSQL (port 5433)
docker compose down      # Stop PostgreSQL
```

### Custom skill
- `/fresh-start` — Kill all dev processes, regenerate Prisma client, restart backend + frontend, verify health

## Architecture

Monorepo with three packages: `server/`, `client/`, `shared/`.

**Server** follows three-layer architecture: Routes → Services → Prisma. Routes handle HTTP + Zod validation. Services contain business logic and ownership checks. Prisma handles data access.

**Client** is a React SPA. All server state managed by TanStack Query hooks in `client/src/api/`. No Redux or Context-based global state. Local state with useState. React Router v7 with `ProtectedRoute` wrapper for auth gating.

**Shared** contains the quiz file Zod schema, imported by both server and client.

### Server plugin registration order (in `app.ts`)
CORS → Prisma → Auth (sessions + OAuth) → Routes → Error handler

### Auth flow
Google OAuth2 with PKCE (S256) → encrypted session cookie (`quiz_session`) containing userId → `request.userId` set on every request by auth plugin → `requireAuth` middleware on protected routes.

## Key conventions

### Quiz format
- `correct_answer` is **always `string[]`** — single-select uses `["b"]`, multiple-select uses `["a", "c"]`
- There is no `question_type` field — derive from `correct_answer.length > 1`
- Option keys are single lowercase letters (`a`, `b`, `c`, ...)
- Each option has `text`, `is_true`, and `explanation` (all required)
- `is_true` must be consistent with `correct_answer`

### Scoring
- Exact match only — selected keys must equal correct_answer exactly
- No partial credit for multiple-select

### Authorization
- All quiz/attempt resources are scoped to the authenticated user
- Ownership checked at the service layer via `findOwnedQuiz()`

### Error handling
- Custom error classes in `server/src/utils/errors.ts`: `ValidationError`, `NotFoundError`, `ForbiddenError`
- Quiz import route catches `ValidationError` directly (Fastify's default error handler strips the `details` field)

### Shared schema imports
Server tsconfig uses `rootDirs: ["src", "../shared"]` to allow importing from `shared/`. Import path: `../../../shared/quiz-file.schema.js`.

## Dev environment

| Service | Port |
|---------|------|
| PostgreSQL (Docker) | 5433 |
| Fastify backend | 3000 |
| Vite frontend | 5174 |

Vite proxies `/api/*` to `localhost:3000`. Frontend never knows the backend URL.

**After changing Prisma schema:** run `npx prisma generate` and restart the server, or use `/fresh-start`.

**Environment:** copy `server/.env.example` to `server/.env`. Requires Google OAuth credentials, a 32-byte hex session secret, and an Anthropic API key for AI quiz generation.
