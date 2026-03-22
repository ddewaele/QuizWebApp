# Backend Guide

This guide explains the server-side code for developers who may be new to Fastify, Prisma, or this style of Node.js backend.

---

## What is Fastify?

Fastify is a web framework for Node.js, similar to Express but with a few key differences:

- **Plugin system:** Everything in Fastify is a plugin — routes, database connections, authentication. Plugins encapsulate functionality and can be composed together.
- **Decorators:** You can attach custom properties to the `fastify` instance or to `request`/`reply` objects. For example, we attach `prisma` to the Fastify instance and `userId` to every request.
- **Hooks:** Lifecycle hooks let you run code at specific points in the request lifecycle (e.g., before a route handler runs).
- **Built-in logging:** Fastify includes structured JSON logging via Pino.

If you know Express, think of Fastify plugins as Express middleware + routers combined, but with better encapsulation.

---

## How the Server Starts

### Entry Point: `src/index.ts`

```typescript
import "dotenv/config";        // Load .env file into process.env
import { loadConfig } from "./config.js";
import { buildApp } from "./app.js";

async function main() {
  const config = loadConfig();   // Validate env vars with Zod
  const app = await buildApp(config);  // Create and configure Fastify
  await app.listen({ port: config.PORT, host: config.HOST });
}

main();
```

The `.js` extensions in imports look wrong but are required — TypeScript with ESM modules needs them. The actual files are `.ts`, but Node resolves them at runtime.

### Configuration: `src/config.ts`

Environment variables are validated at startup using a Zod schema. If any required variable is missing or invalid, the server exits immediately with a clear error message. This catches misconfiguration early instead of failing on the first request.

```typescript
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  // ...
});
```

### App Factory: `src/app.ts`

`buildApp()` creates the Fastify instance and registers everything in order:

```typescript
export async function buildApp(config: Env) {
  const fastify = Fastify({ logger: { ... } });

  // 1. CORS — must be first so preflight requests work
  await fastify.register(cors, { ... });

  // 2. Database — makes fastify.prisma available
  await fastify.register(prismaPlugin);

  // 3. Auth — sessions + OAuth, makes request.userId available
  await fastify.register(authPlugin, { config });

  // 4. Routes — API endpoints
  await fastify.register(authRoutes, { config });
  await fastify.register(quizRoutes);
  await fastify.register(attemptRoutes);

  // 5. Error handler — catches errors from all routes
  fastify.setErrorHandler((error, request, reply) => { ... });

  // 6. Health check — simple endpoint for monitoring
  fastify.get("/api/health", async () => ({ status: "ok" }));

  return fastify;
}
```

**Why `await` on every `register`?** Fastify plugins can be async. Using `await` ensures each plugin finishes initializing before the next one starts. This matters because later plugins depend on earlier ones (e.g., routes need `fastify.prisma` from the prisma plugin).

---

## Plugins

Plugins are reusable pieces of functionality. They use `fastify-plugin` (`fp`) to break Fastify's default encapsulation — without `fp`, a plugin's decorators would only be visible within that plugin, not to the rest of the app.

### Prisma Plugin: `src/plugins/prisma.ts`

```typescript
export default fp(async (fastify) => {
  const prisma = new PrismaClient({ ... });
  await prisma.$connect();
  fastify.decorate("prisma", prisma);        // Now fastify.prisma is available everywhere
  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();               // Clean shutdown
  });
});
```

**What `decorate` does:** It attaches a property to the Fastify instance. After this plugin runs, any route handler can access the database via `fastify.prisma`.

**What `fp` does:** Without `fp()`, Fastify would scope the `prisma` decorator to this plugin only. `fp` tells Fastify: "expose this plugin's decorators to the parent scope."

### Auth Plugin: `src/plugins/auth.ts`

This plugin does three things:

**1. Registers secure sessions:**
```typescript
await fastify.register(secureSession, {
  key: Buffer.from(config.SESSION_SECRET, "hex"),  // 32-byte encryption key
  cookieName: "quiz_session",
  cookie: {
    httpOnly: true,    // JavaScript can't read the cookie
    secure: true,      // Only sent over HTTPS (in production)
    sameSite: "lax",   // Prevents CSRF for most cases
  },
});
```

The session is stored entirely in the cookie, encrypted. There's no server-side session store. This means:
- No need for Redis or a session table
- Sessions survive server restarts
- But you can't revoke individual sessions (the cookie is valid until it expires)

**2. Registers Google OAuth2:**
```typescript
await fastify.register(oauth2, {
  name: "googleOAuth2",                    // Creates fastify.googleOAuth2
  startRedirectPath: "/api/auth/google",   // Visiting this URL starts the OAuth flow
  callbackUri: "http://localhost:5174/api/auth/google/callback",
  discovery: { issuer: "https://accounts.google.com" },
  pkce: "S256",                            // Proof Key for Code Exchange (security feature)
});
```

**3. Extracts userId on every request:**
```typescript
fastify.decorateRequest("userId", undefined);  // Add userId property to all requests
fastify.addHook("onRequest", async (request) => {
  const userId = request.session?.get("userId");
  if (userId) {
    request.userId = userId;  // Set it if session has one
  }
});
```

This `onRequest` hook runs before every route handler. After it runs, `request.userId` is either the authenticated user's ID or `undefined`.

---

## Middleware

### `src/middleware/require-auth.ts`

```typescript
export async function requireAuth(request, reply) {
  if (!request.userId) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }
}
```

This is a Fastify `onRequest` hook. Routes that need authentication add it like this:

```typescript
fastify.addHook("onRequest", requireAuth);  // Applies to all routes in this plugin
```

When `requireAuth` sends a 401 response, Fastify stops processing and the route handler never runs.

---

## Routes

Routes define the API endpoints. Each route file exports an async function that receives the Fastify instance.

### Pattern: Route Registration

```typescript
export default async function quizRoutes(fastify: FastifyInstance) {
  const quizService = new QuizService(fastify.prisma);  // Create service with DB access

  fastify.addHook("onRequest", requireAuth);  // All routes here need auth

  fastify.get("/api/quizzes", async (request) => {
    const quizzes = await quizService.listByUser(request.userId!);
    return { quizzes };  // Fastify auto-serializes to JSON
  });
}
```

**The `!` after `request.userId`:** TypeScript thinks `userId` could be `undefined`, but we know `requireAuth` already checked it. The `!` is a non-null assertion — "trust me, this is defined."

**Return vs reply.send:** In Fastify, you can either `return` a value from an async handler (Fastify sends it as JSON) or use `reply.send()`. Both work. We use `return` for simple cases and `reply.status(201).send()` when we need a non-200 status code.

### Auth Routes: `src/routes/auth.ts`

**`GET /api/auth/google`** — Handled automatically by `@fastify/oauth2`. Redirects the browser to Google's login page.

**`GET /api/auth/google/callback`** — After Google authenticates the user, they're redirected here. The handler:
1. Exchanges the authorization code for an access token
2. Fetches the user's email and name from Google
3. Creates or updates the user in the database
4. Sets the session cookie with the user's ID
5. Redirects the browser to the app's homepage

**`GET /api/auth/me`** — Returns the current user's profile, or `{ user: null }` if not authenticated. The frontend calls this on every page load to check auth status.

**`POST /api/auth/logout`** — Deletes the session cookie.

### Quiz Routes: `src/routes/quizzes.ts`

Standard CRUD plus import/export:

| Method | Path | Handler | Notes |
|--------|------|---------|-------|
| `GET` | `/api/quizzes` | List user's quizzes | Includes question/attempt counts |
| `POST` | `/api/quizzes` | Create quiz | Body validated with Zod |
| `GET` | `/api/quizzes/:id` | Get quiz with questions | Ownership check |
| `PUT` | `/api/quizzes/:id` | Update quiz | Replaces all questions in a transaction |
| `DELETE` | `/api/quizzes/:id` | Delete quiz | Cascades to questions and attempts |
| `POST` | `/api/quizzes/import` | Import from JSON | Validates against quiz file schema |
| `GET` | `/api/quizzes/:id/export` | Download as JSON | Returns original `sourceJson` if available |

**The import route's error handling** is notable — it catches `ValidationError` directly instead of relying on Fastify's global error handler:

```typescript
try {
  const quiz = await importService.importFromJson(...);
  return reply.status(201).send({ quiz });
} catch (err) {
  if (err instanceof ValidationError) {
    return reply.status(400).send({
      error: "ValidationError",
      message: err.message,
      details: err.details,  // Contains per-field validation errors
    });
  }
  throw err;  // Re-throw unexpected errors for global handler
}
```

This is because Fastify's default error serializer strips custom fields like `details`. By catching the error in the route, we control the response format.

### Attempt Routes: `src/routes/attempts.ts`

| Method | Path | Handler |
|--------|------|---------|
| `POST` | `/api/quizzes/:id/attempts` | Submit quiz answers, get scored result |
| `GET` | `/api/attempts` | List user's attempt history |
| `GET` | `/api/attempts/:id` | Get attempt with per-question answers |

---

## Services

Services contain business logic, separated from HTTP concerns. They receive a `PrismaClient` in their constructor.

### QuizService: `src/services/quiz.service.ts`

Handles CRUD operations with ownership verification:

```typescript
private async findOwnedQuiz(id: string, userId: string) {
  const quiz = await this.prisma.quiz.findUnique({ where: { id } });
  if (!quiz) throw new NotFoundError("Quiz");
  if (quiz.userId !== userId) throw new ForbiddenError();
  return quiz;
}
```

Every mutating operation calls `findOwnedQuiz` first. This ensures users can only modify their own quizzes.

**Quiz updates use a transaction** because they replace all questions:
```typescript
return this.prisma.$transaction(async (tx) => {
  await tx.quiz.update({ ... });           // Update title/description
  await tx.quizQuestion.deleteMany({ ... });  // Remove old questions
  await tx.quizQuestion.createMany({ ... }); // Insert new questions
  return tx.quiz.findUnique({ ... });      // Return updated quiz
});
```

If any step fails, the entire transaction rolls back — you won't end up with a quiz that has no questions.

### AttemptService: `src/services/attempt.service.ts`

The `submit` method:
1. Loads the quiz with all questions
2. Validates that answers were provided for every question
3. Scores each answer using `checkAnswer()`
4. Calculates the percentage
5. Persists the attempt and individual answers in one create

**Scoring logic:**
```typescript
function checkAnswer(question, selectedKeys) {
  const correctKeys = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
  if (correctKeys.length !== selectedKeys.length) return false;
  const correctSet = new Set(correctKeys);
  return selectedKeys.every((key) => correctSet.has(key));
}
```

For single-select: the user must select exactly the one correct key.
For multiple-select: the user must select exactly all correct keys — no more, no less. No partial credit.

### QuizImportService: `src/services/quiz-import.service.ts`

Validates and imports quiz JSON files:

1. Parse the JSON string
2. Validate against the Zod schema from `shared/quiz-file.schema.ts`
3. If validation fails, throw `ValidationError` with per-field error details
4. Create the quiz with questions, storing the original JSON in `sourceJson`

The export function returns `sourceJson` if available (exact round-trip), otherwise reconstructs the JSON from the normalized database records.

---

## Validation with Zod

Zod schemas define the shape of valid data. We use them in two places:

**Request validation** (in route handlers):
```typescript
const parsed = createQuizSchema.safeParse(request.body);
if (!parsed.success) {
  throw new ValidationError("Invalid quiz data", parsed.error.flatten());
}
// parsed.data is now fully typed
```

`safeParse` returns `{ success: true, data }` or `{ success: false, error }` — it never throws. This lets us return friendly error messages instead of crashing.

**Quiz file validation** (in import service): The shared schema uses `.superRefine()` for cross-field validation (e.g., checking that `correct_answer` references existing option keys).

---

## Database with Prisma

Prisma is an ORM (Object-Relational Mapper) that generates TypeScript types from the database schema.

### Schema: `prisma/schema.prisma`

This file defines the database tables and their relationships:

```prisma
model Quiz {
  id          String   @id @default(cuid())
  title       String
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  questions   QuizQuestion[]
  // ...
}
```

**`@relation`** defines foreign keys. `onDelete: Cascade` means deleting a user deletes all their quizzes.

**`@unique`** creates a unique constraint. `@@unique([quizId, questionId])` means each question ID is unique within a quiz.

**`Json` type** stores arbitrary JSON. We use it for `options` and `correctAnswer` because their structure varies (single string vs array).

### Migrations

After changing `schema.prisma`, run:
```bash
npx prisma migrate dev --name describe_the_change
```

This generates a SQL migration file and applies it. Migration files are committed to git so other developers (and production) can apply the same changes.

### Common Prisma Patterns

**Find with relations:**
```typescript
const quiz = await prisma.quiz.findUnique({
  where: { id },
  include: { questions: { orderBy: { sortOrder: "asc" } } },
});
```

**Aggregate counts without loading data:**
```typescript
const quizzes = await prisma.quiz.findMany({
  include: { _count: { select: { questions: true, attempts: true } } },
});
// quiz._count.questions === 10
```

**Transaction:**
```typescript
await prisma.$transaction(async (tx) => {
  await tx.quizQuestion.deleteMany({ where: { quizId } });
  await tx.quizQuestion.createMany({ data: [...] });
});
```

---

## Error Handling

### Custom Error Classes: `src/utils/errors.ts`

```
AppError (base)
├── NotFoundError    → 404
├── ForbiddenError   → 403
├── UnauthorizedError → 401
└── ValidationError  → 400 (with optional details)
```

Throwing these in service code automatically sends the right HTTP status and a structured JSON error response.

### Global Error Handler

The error handler in `app.ts` catches any error thrown from a route handler:

```typescript
fastify.setErrorHandler((error, request, reply) => {
  if (error.statusCode >= 400 && error.statusCode < 500) {
    // Client errors: send structured response
    return reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
      details: error.details,
    });
  }
  // Server errors: log and send generic message
  fastify.log.error(error);
  return reply.status(500).send({ error: "InternalServerError", message: "..." });
});
```

In production, the 500 error message is generic ("Internal server error") to avoid leaking implementation details.

---

## Request Lifecycle

Here's what happens for a typical authenticated API request:

```
1. HTTP request arrives
2. CORS plugin checks Origin header
3. Auth plugin's onRequest hook:
   - Decrypts session cookie
   - Sets request.userId (or leaves it undefined)
4. Route-level onRequest hook (requireAuth):
   - If no userId → 401 response, STOP
5. Route handler runs:
   - Parses and validates request body (Zod)
   - Calls service method
   - Service checks ownership, performs business logic
   - Returns result
6. Fastify serializes result to JSON
7. Response sent
```

If any step throws an error, the error handler catches it and sends an appropriate response.
