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
| `QuizQuestion` | Individual question | `questionId`, `questionText`, `options` (JSON), `correctAnswer` (JSON, always `string[]`), `sortOrder` |
| `QuizAttempt` | Completed quiz session | `score`, `totalQuestions`, `percentage`, `completedAt` |
| `QuizAttemptAnswer` | Per-question answer | `selectedKeys` (JSON), `isCorrect` |

### Design Decisions

**`options` and `correctAnswer` as JSON columns:** Options are always accessed as a group with their question. A separate `Option` table would add joins without benefit — options are never queried independently. `correctAnswer` is always stored as a `string[]` (e.g., `["b"]` or `["a","c"]`).

**`sourceJson` on Quiz:** Stores the original uploaded JSON blob for exact round-trip export. Normalized `QuizQuestion` rows enable editing and querying. Both are kept.

**`sortOrder` on QuizQuestion:** Preserves the original array order from the JSON file, as specified in the quiz format.

**`AuthAccount` separate from `User`:** Allows adding more OAuth providers (GitHub, Microsoft, etc.) without schema changes.

---

## Authentication & Authorization

### Why Cookie-Based Sessions (Not JWTs)

This app uses **server-side encrypted session cookies**, not JSON Web Tokens. This is a deliberate choice with significant implications for both security and deployment.

#### How each approach works

**Cookie-based sessions (what we use):**
```
Login → Server creates session → Server sets encrypted cookie → Browser stores cookie
       → Every request: browser sends cookie automatically → Server decrypts, reads userId
```

**JWT-based auth (what we don't use):**
```
Login → Server creates JWT → Server returns JWT in response body → Client stores in localStorage
       → Every request: client adds Authorization header manually → Server verifies JWT signature
```

#### Why cookies win for this app

| Concern | Cookie Sessions | JWTs |
|---------|----------------|------|
| **Storage** | Browser manages automatically | Client must store (localStorage, memory) and attach to every request |
| **XSS risk** | `httpOnly` cookie — JavaScript cannot read or steal it | Stored in localStorage — any XSS vulnerability can steal the token |
| **CSRF risk** | Mitigated with `sameSite: lax` — browser only sends cookie on same-site requests and top-level navigations | Not vulnerable to CSRF (token must be explicitly attached) |
| **Revocation** | Delete the cookie, or change the encryption key to invalidate all sessions | Cannot revoke a JWT before expiry without maintaining a server-side blocklist (which defeats the purpose of JWTs) |
| **Size** | Small — just an encrypted userId (~100 bytes) | Larger — contains claims, signature, often user data (~500+ bytes), sent with every request |
| **Complexity** | No refresh token flow, no token rotation, no client-side storage logic | Requires access + refresh token management, silent refresh, token rotation |
| **Server state** | Stateless — the encrypted cookie IS the session, no session store needed | Stateless — but revocation requires server state anyway |

**The bottom line:** For a single-domain web app where the frontend and API share the same origin, cookies are simpler, more secure against XSS, and require less client-side code. JWTs make sense when you need to authenticate across multiple domains, support mobile clients, or build a public API — none of which apply here.

#### When you'd switch to JWTs

- Adding a mobile app (React Native, Flutter) — mobile apps can't use cookies naturally
- Building a public API consumed by third parties
- Implementing microservices where multiple backends need to verify authentication independently
- Supporting cross-domain single sign-on (SSO)

### OAuth 2.0 Flow with Google

The app uses the **OAuth 2.0 Authorization Code flow with PKCE** (Proof Key for Code Exchange). Here's what happens step by step:

```
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Browser  │     │  Fastify │     │  Google  │     │ Database │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │ 1. Click "Sign in with Google"  │                │
     │───────────────▶│                │                │
     │                │                │                │
     │ 2. Redirect to Google (with PKCE challenge)      │
     │◀───────────────│                │                │
     │─────────────────────────────────▶                │
     │                │                │                │
     │ 3. User signs in at Google      │                │
     │◀────────────────────────────────│                │
     │                │                │                │
     │ 4. Google redirects back with authorization code │
     │───────────────▶│                │                │
     │                │                │                │
     │                │ 5. Exchange code for access token│
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │ 6. Fetch user info (email, name) │
     │                │───────────────▶│                │
     │                │◀───────────────│                │
     │                │                │                │
     │                │ 7. Create/update User + AuthAccount
     │                │────────────────────────────────▶│
     │                │◀────────────────────────────────│
     │                │                │                │
     │ 8. Set encrypted session cookie (quiz_session)   │
     │◀───────────────│                │                │
     │                │                │                │
     │ 9. Redirect to app homepage     │                │
     │◀───────────────│                │                │
```

**Key security features:**

- **PKCE (S256):** Prevents authorization code interception attacks. The server generates a random `code_verifier`, hashes it to create a `code_challenge` sent to Google, then proves possession of the original verifier when exchanging the code. This protects against malicious apps intercepting the callback URL.

- **Server-side token exchange:** The access token from Google never touches the browser. The server exchanges the authorization code for the token directly with Google's token endpoint (step 5), fetches user info (step 6), then discards the token. Only the encrypted session cookie goes to the browser.

- **No Google tokens stored:** We don't store Google access tokens or refresh tokens. We only need Google for the initial identity verification — after that, our own session cookie handles authentication.

### Session Cookie Mechanics

The session is implemented by `@fastify/secure-session`:

```
┌─────────────────────────────────────────────────┐
│ Cookie: quiz_session=<encrypted blob>           │
│                                                 │
│ Decrypted contents: { userId: "clx9abc123..." } │
│                                                 │
│ Properties:                                     │
│   httpOnly: true    ← JS cannot read/write it   │
│   secure: true      ← HTTPS only (in production)│
│   sameSite: lax     ← sent on same-site + nav   │
│   maxAge: 7 days    ← auto-expires              │
│   path: /           ← sent for all paths        │
└─────────────────────────────────────────────────┘
```

**How it works on each request:**

1. Browser automatically includes the `quiz_session` cookie with every request to the same origin
2. The auth plugin's `onRequest` hook decrypts the cookie using the `SESSION_SECRET` key
3. If decryption succeeds, `request.userId` is set to the stored user ID
4. If the cookie is missing, expired, or tampered with, `request.userId` remains `undefined`
5. The `requireAuth` middleware checks `request.userId` — if undefined, returns 401

**Encryption:** The cookie is encrypted (not just signed) using `sodium` (libsodium) with the `SESSION_SECRET` (a 32-byte key). This means:
- The contents cannot be read by the browser or any JavaScript
- The contents cannot be modified without the key — any tampering invalidates the cookie
- There is no way to forge a session without knowing the secret key

**No server-side session store:** Unlike traditional sessions (stored in Redis or a database), the entire session lives in the cookie. This means:
- No session table to query on every request
- No Redis dependency
- Sessions survive server restarts
- Horizontal scaling works without sticky sessions
- Trade-off: you cannot revoke an individual session (to force-logout a specific user, you'd need to change the `SESSION_SECRET`, which invalidates ALL sessions)

### Same-Origin Requirement and Deployment Impact

Session cookies only work when the frontend and backend share the same origin (protocol + domain + port). This is enforced by the browser, not by our code.

**In development:**
```
Browser → http://localhost:5174 (Vite)
          Vite proxies /api/* → http://localhost:3000 (Fastify)

From the browser's perspective, everything is http://localhost:5174.
The cookie is set for localhost, and sent with /api/* requests because
they go through the Vite proxy — same origin.
```

**In production (correct setup):**
```
Browser → https://quizapp.example.com
          Caddy/Nginx routes:
            /           → React static files
            /api/*      → Fastify backend

Everything is https://quizapp.example.com — same origin.
Cookie works naturally.
```

**In production (broken setup):**
```
Browser → https://quizapp.vercel.app      (frontend)
API     → https://quizapp-api.railway.app  (backend)

Different origins! The browser will NOT send the cookie from
quizapp.vercel.app to quizapp-api.railway.app.

Even with credentials: "include", the browser blocks this because:
- sameSite: lax prevents the cookie from being sent cross-origin
- Even if you set sameSite: none + secure, many browsers restrict
  third-party cookies
- Google OAuth callback URL must match one specific origin
```

**This is why the deployment guide recommends serving everything from one domain** — either a single server (VPS + Docker Compose) or a PaaS where the frontend and API share a domain (Heroku, Railway serving the Vite build from Fastify).

If you need split-hosting (e.g., Vercel for frontend), you'd need to either:
1. Set up reverse proxy rewrites in Vercel to forward `/api/*` to your backend (makes it appear same-origin)
2. Switch to JWT-based auth (stored in `Authorization` header, not cookies)
3. Use a custom domain for both services with proper cookie configuration

Option 1 adds latency and complexity. Option 2 is a significant architectural change. Option 3 requires DNS configuration and careful cookie domain settings. For a personal project, serving from one domain is far simpler.

### Authorization Model

All resource access is scoped to the authenticated user:

| Operation | Authorization |
|-----------|--------------|
| List quizzes | `WHERE userId = currentUser` |
| View/edit/delete quiz | Ownership check (`quiz.userId === currentUser`) |
| Export quiz | Ownership check |
| Submit attempt | Ownership check (currently owner-only) |
| List attempts | `WHERE userId = currentUser` |
| View attempt | Ownership check |

**Where authorization is enforced:**

- **Not in the frontend.** The frontend's `ProtectedRoute` redirects unauthenticated users to `/login`, but this is a UX convenience. A user can bypass it with browser dev tools. It provides no security.

- **In the backend middleware.** `requireAuth` checks `request.userId` on every protected route. This is the real authentication gate — no valid session cookie, no access.

- **In the service layer.** Each service method (e.g., `QuizService.getById()`, `AttemptService.submit()`) verifies that the resource belongs to the requesting user. This is the authorization check — even with a valid session, you can only access your own data. This runs inside the business logic, not at the HTTP layer, so it can't be bypassed by crafting requests.

---

## Quiz File Format

The app imports and exports quizzes as a JSON array. `correct_answer` is always a `string[]` — single-select questions have one element, multiple-select have two or more. There is no `question_type` field; it is derived from `correct_answer.length`.

```json
[
  {
    "question_id": 1,
    "question_text": "What is 2 + 2?",
    "options": {
      "a": { "text": "3", "is_true": false, "explanation": "Wrong" },
      "b": { "text": "4", "is_true": true, "explanation": "Correct" }
    },
    "correct_answer": ["b"]
  },
  {
    "question_id": 2,
    "question_text": "Which are prime?",
    "options": {
      "a": { "text": "2", "is_true": true, "explanation": "2 is prime" },
      "b": { "text": "4", "is_true": false, "explanation": "4 = 2x2" },
      "c": { "text": "7", "is_true": true, "explanation": "7 is prime" }
    },
    "correct_answer": ["a", "c"]
  }
]
```

### Validation Rules

The Zod schema (`shared/quiz-file.schema.ts`) enforces:
- At least 1 question, no duplicate `question_id` values
- At least 2 options per question, keys must be single lowercase letters
- `correct_answer` must be a non-empty array referencing existing option keys
- `is_true` on each option must be consistent with `correct_answer`
- All options must have non-empty `text` and `explanation`

### Scoring Rules

- **Single-select** (`correct_answer.length === 1`): Correct if the user's single selection matches.
- **Multiple-select** (`correct_answer.length > 1`): Correct only if the user's selections match `correct_answer` exactly — same keys, no extras, no omissions. No partial credit.

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
