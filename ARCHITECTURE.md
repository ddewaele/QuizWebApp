# Architecture

## High-Level Overview

QuizWebApp is a full-stack monorepo with three packages:

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────┐
│   Browser (SPA) │────▶│  Vite Dev Server  │────▶│  Static    │
│   React + TS    │     │  (dev) / Nginx    │     │  Assets    │
└────────┬────────┘     └──────────────────┘     └────────────┘
         │
         │  /api/* (proxied in dev)
         ▼
┌──────────────────────────────────────┐
│          Fastify Server              │
│  ┌──────────┐  ┌──────────────────┐  │
│  │  Auth    │  │  Route Handlers  │  │
│  │  Plugin  │  │  + Zod Schemas   │  │
│  └────┬─────┘  └───────┬──────────┘  │
│       │                │             │
│  ┌────▼────────────────▼──────────┐  │
│  │       Service Layer            │  │
│  └───────────┬────────────────────┘  │
│              │                       │
│  ┌───────────▼────────────────────┐  │
│  │        Prisma ORM              │  │
│  └───────────┬────────────────────┘  │
└──────────────┼───────────────────────┘
               ▼
       ┌───────────────┐
       │  PostgreSQL   │
       └───────────────┘
```

### Package Structure

| Package | Purpose | Key Dependencies |
|---------|---------|-----------------|
| `client/` | React SPA | Vite, React Router, TanStack Query, Tailwind CSS |
| `server/` | REST API | Fastify, Prisma, Zod, @fastify/oauth2, @fastify/secure-session |
| `shared/` | Shared schemas | Zod (quiz file format validation) |

---

## Server Architecture

### Layers

The server follows a **three-layer architecture**:

```
Routes (HTTP) → Services (Business Logic) → Prisma (Data Access)
```

**Routes** (`server/src/routes/`) handle HTTP concerns: parsing requests, calling services, formatting responses. Validation happens here via Zod schemas.

**Services** (`server/src/services/`) contain business logic: ownership checks, scoring, quiz import validation. Services receive a `PrismaClient` via constructor injection.

**Prisma** provides type-safe database access. The schema defines 6 models (see Database section).

### Plugin System

Fastify plugins encapsulate cross-cutting concerns:

| Plugin | File | Responsibility |
|--------|------|---------------|
| `prisma` | `plugins/prisma.ts` | PrismaClient lifecycle, decorates `fastify.prisma` |
| `auth` | `plugins/auth.ts` | Session management, Google OAuth2, `request.userId` extraction |

### Middleware

`requireAuth` is a Fastify `onRequest` hook applied to all protected route groups. It checks `request.userId` (set by the auth plugin from the session cookie) and returns 401 if absent.

### Error Handling

Custom error classes (`AppError`, `ValidationError`, `NotFoundError`, `ForbiddenError`) carry HTTP status codes. The quiz import route catches `ValidationError` explicitly to include structured `details` in the response (Fastify's default error serializer strips custom fields).

---

## Client Architecture

### State Management

**Server state** is managed entirely by **TanStack Query**. There is no Redux, Zustand, or Context-based global state. Each API entity has a dedicated hooks file:

| File | Hooks |
|------|-------|
| `api/auth.ts` | `useCurrentUser`, `useLogout` |
| `api/quizzes.ts` | `useQuizzes`, `useQuiz`, `useCreateQuiz`, `useUpdateQuiz`, `useDeleteQuiz`, `useImportQuiz` |
| `api/attempts.ts` | `useAttempts`, `useAttempt`, `useSubmitAttempt` |

**Local state** (form inputs, UI toggles) uses React `useState`. Derived values use `useMemo` where computation is non-trivial (e.g., average score on dashboard).

### Routing

React Router v7 with a flat route configuration in `routes.tsx`. All authenticated routes are wrapped in `ProtectedRoute` (redirects to `/login` if no session) and `AppShell` (navbar + layout).

### API Client

`api/client.ts` provides a thin `fetch` wrapper that:
- Prepends `/api` to all paths
- Includes `credentials: "include"` for session cookies
- Sets `Content-Type: application/json`
- Throws `ApiError` with `status`, `message`, and `details` on non-2xx responses

The Vite dev server proxies `/api/*` to the Fastify backend (port 3000), so the client never needs to know the backend URL.

### Component Organization

```
components/
├── layout/        # AppShell, Navbar, ProtectedRoute
├── quiz/          # QuizCard, QuizForm, QuestionEditor, QuizPlayer, QuizUploader
├── results/       # ScoreDisplay, ResultReview
└── ui/            # ConfirmDialog, ErrorBoundary
```

Page components (`pages/`) are route-level entry points that compose these building blocks. They handle data fetching (via hooks) and pass data down as props.

---

## Database Schema

### Entity Relationship

```
User 1──* AuthAccount
User 1──* Quiz
User 1──* QuizAttempt
Quiz 1──* QuizQuestion
Quiz 1──* QuizAttempt
QuizQuestion 1──* QuizAttemptAnswer
QuizAttempt 1──* QuizAttemptAnswer
```

### Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| `User` | Application user | `email` (unique), `name`, `avatarUrl` |
| `AuthAccount` | OAuth provider link | `provider`, `providerAccountId`, unique per provider+account |
| `Quiz` | Quiz container | `title`, `description`, `userId` (owner), `sourceJson` (original import) |
| `QuizQuestion` | Individual question | `questionId`, `questionText`, `questionType`, `options` (JSON), `correctAnswer` (JSON), `sortOrder` |
| `QuizAttempt` | Completed quiz session | `score`, `totalQuestions`, `percentage`, `completedAt` |
| `QuizAttemptAnswer` | Per-question answer | `selectedKeys` (JSON), `isCorrect` |

### Design Decisions

**`options` and `correctAnswer` as JSON columns:** Options are always accessed as a group with their question. A separate `Option` table would add joins without benefit — options are never queried independently. `correctAnswer` supports both `"a"` (string) and `["a","c"]` (array) for single/multi-select.

**`sourceJson` on Quiz:** Stores the original uploaded JSON blob for exact round-trip export. Normalized `QuizQuestion` rows enable editing and querying. Both are kept.

**`sortOrder` on QuizQuestion:** Preserves the original array order from the JSON file, as specified in the quiz format.

**`AuthAccount` separate from `User`:** Allows adding more OAuth providers (GitHub, Microsoft, etc.) without schema changes.

---

## Authentication & Authorization

### Authentication Flow

1. Browser navigates to `/api/auth/google`
2. `@fastify/oauth2` redirects to Google with PKCE challenge (S256)
3. Google redirects back to `/api/auth/google/callback` with authorization code
4. Server exchanges code for access token, fetches user info from Google
5. Server creates/updates `User` + `AuthAccount`, sets encrypted session cookie
6. Browser redirected to `CLIENT_URL/`

### Session

Sessions use `@fastify/secure-session` — an encrypted cookie with no server-side store. The cookie contains only the user ID. On every request, the auth plugin decrypts the cookie and sets `request.userId`.

### Authorization

All resource access is scoped to the authenticated user:

| Operation | Authorization |
|-----------|--------------|
| List quizzes | `WHERE userId = currentUser` |
| View/edit/delete quiz | Ownership check (`quiz.userId === currentUser`) |
| Export quiz | Ownership check |
| Submit attempt | Ownership check (currently owner-only) |
| List attempts | `WHERE userId = currentUser` |
| View attempt | Ownership check |

---

## Quiz File Format

The app imports and exports quizzes as a JSON array:

```json
[
  {
    "question_id": 1,
    "question_text": "What is 2 + 2?",
    "options": {
      "a": { "text": "3", "is_true": false, "explanation": "Wrong" },
      "b": { "text": "4", "is_true": true, "explanation": "Correct" }
    },
    "correct_answer": "b"
  }
]
```

### Validation Rules

The Zod schema (`shared/quiz-file.schema.ts`) enforces:
- At least 1 question, no duplicate `question_id` values
- At least 2 options per question, keys must be single lowercase letters
- `correct_answer` must reference existing option keys
- `is_true` must be consistent with `correct_answer`
- `question_type: "multiple_select"` requires `correct_answer` to be an array
- All options must have non-empty `text` and `explanation`

### Scoring Rules

- **Single-select:** Correct if selected key equals `correct_answer`
- **Multiple-select:** Correct only if selected keys match `correct_answer` exactly (same keys, no extras, no omissions). No partial credit.

---

## Development Environment

### Services

| Service | Port | Purpose |
|---------|------|---------|
| Vite dev server | 5174 | Serves React SPA, proxies `/api/*` to backend |
| Fastify server | 3000 | REST API |
| PostgreSQL | 5433 | Database (Docker, mapped from container port 5432) |

### Running Locally

```bash
docker compose up -d          # PostgreSQL
cd server && npm run dev      # Backend (tsx watch)
cd client && npm run dev      # Frontend (Vite HMR)
```

### Testing

| Type | Tool | Location | Command |
|------|------|----------|---------|
| Unit tests | Vitest | `server/tests/` | `cd server && npm test` |
| E2E tests | Playwright | `client/tests/e2e/` | `cd client && npm run test:e2e` |

### Key Configuration

- **Google OAuth:** Requires credentials from Google Cloud Console. Redirect URI: `http://localhost:5174/api/auth/google/callback`
- **Session secret:** 32-byte hex string, generated with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Environment:** All config via `.env` file in `server/`, validated by Zod on startup
