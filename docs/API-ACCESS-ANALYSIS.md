# Programmatic API Access Analysis

How to expose the QuizWebApp API to non-browser clients (CLI tools, mobile apps, other services) given our cookie-based session architecture.

## The Problem

Our current auth design is tightly coupled to the browser:

```
Browser                          Programmatic Client
──────────                       ────────────────────
1. Click "Sign in with Google"   1. ??? (no browser to show Google login)
2. Google login page renders     2. ??? (no UI to interact with)
3. Browser follows redirect      3. ??? (no redirect handling)
4. Server sets Set-Cookie        4. ??? (no cookie jar)
5. Browser sends cookie          5. ??? (must manually manage cookies)
   automatically on every           and set Cookie header
   request
```

Three things make this browser-dependent:

1. **OAuth Authorization Code flow requires user interaction** — Google shows a consent screen. You need a browser (or webview) for the user to sign in. A CLI tool can't do this headlessly.

2. **Cookies are a browser transport mechanism** — Browsers store cookies and send them automatically. A programmatic client must parse `Set-Cookie` headers, store the value, track expiry, and send it back manually. It works, but it's fragile and unnatural for API clients.

3. **Cookie flags restrict non-browser use** — `httpOnly` means JavaScript can't read the cookie (by design). `sameSite: lax` means the cookie isn't sent on cross-origin requests. These are security features for browsers that become obstacles for API clients.

## Options

### Option A: API Keys (Recommended for current scope)

Add a simple API key mechanism alongside the existing cookie auth. The web app keeps cookies unchanged. API clients use a long-lived key.

**How it works:**

```
Web app (unchanged):
  Browser → cookie session → request.userId

API client (new):
  Script → Authorization: Bearer <api-key> → look up key → request.userId
```

**Database change — new `ApiKey` model:**

```prisma
model ApiKey {
  id        String   @id @default(cuid())
  key       String   @unique    // random 256-bit hex string
  name      String              // user-friendly label ("My CLI key")
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  active    Boolean  @default(true)
  lastUsedAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

**Middleware change — check both cookie and API key:**

```typescript
async function requireAuth(request, reply) {
  // Path 1: Existing cookie session
  if (request.userId) return;

  // Path 2: API key in Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const key = authHeader.slice(7);
    const apiKey = await fastify.prisma.apiKey.findUnique({
      where: { key, active: true },
    });
    if (apiKey) {
      request.userId = apiKey.userId;
      // Update lastUsedAt (fire-and-forget, don't block the request)
      fastify.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});
      return;
    }
  }

  return reply.status(401).send({ error: "Unauthorized" });
}
```

**New API routes:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/keys` | List user's API keys (without revealing full key) |
| `POST` | `/api/keys` | Create new API key (returns full key once) |
| `DELETE` | `/api/keys/:id` | Revoke (deactivate) an API key |

**New UI:** A "API Keys" page in the user's settings where they can create, name, and revoke keys. The full key is shown only once at creation time (like GitHub Personal Access Tokens).

**Client usage:**

```bash
# Using curl
curl -H "Authorization: Bearer qk_a1b2c3d4e5f6..." \
  https://quizapp.example.com/api/quizzes

# Using fetch (Node.js script)
const res = await fetch("https://quizapp.example.com/api/quizzes", {
  headers: { Authorization: "Bearer qk_a1b2c3d4e5f6..." },
});
```

**Pros:**
- Smallest change to existing code — additive only, no rearchitecting
- Web app auth completely unchanged
- Simple for API consumers — one header, no OAuth dance
- Easy to revoke — flip `active` to false
- Cross-origin works naturally — no cookie domain issues

**Cons:**
- API keys are long-lived secrets — if leaked, they give full access until manually revoked
- No built-in expiry (could add an `expiresAt` field)
- No scope/permission limiting (key has full user access)
- Need to store keys securely — hash them in the database (store only a prefix for display), compare with timing-safe equality
- One more thing for users to manage

**Security hardening (if going to production):**
- Store keys hashed (bcrypt or SHA-256), not plaintext — display only a prefix (`qk_a1b2...`)
- Use a `qk_` prefix on keys so they're identifiable in logs and secret scanners
- Add rate limiting per API key
- Optional: add `expiresAt` and `scopes` fields for fine-grained control

---

### Option B: OAuth2 Client Credentials (Machine-to-Machine)

The OAuth2 Client Credentials grant is designed for service-to-service communication where there is no user involved. The calling service authenticates with its own client ID + secret and gets an access token.

```
Service A                        QuizWebApp
─────────                        ──────────
1. POST /oauth/token
   grant_type=client_credentials
   client_id=xxx
   client_secret=yyy             2. Validate credentials
                                 3. Issue access token
4. Use token:
   Authorization: Bearer <token> 5. Verify token, process request
```

**When this is appropriate:**
- Backend service accessing your API on its own behalf (not on behalf of a user)
- Scheduled jobs, data pipelines, integrations between systems
- The calling service IS the identity — there's no "user" behind it

**When this is NOT appropriate:**
- When a human user's identity matters (which quiz belongs to whom?)
- CLI tools used by individual users
- Mobile apps where actions are attributed to a person

**For QuizWebApp:** This doesn't fit. Your API is user-scoped — quizzes belong to users, attempts are attributed to users. Client Credentials gives you a service identity, not a user identity. You'd need to either embed a userId in the service's configuration (brittle) or create a dedicated service account (added complexity).

**Verdict:** Skip this unless you have actual service-to-service needs.

---

### Option C: JWT Token Endpoint (Hybrid — Recommended for mobile/public API)

Keep cookies for the web app. Add a token endpoint that exchanges a valid session for a JWT. This is what GitHub, GitLab, and most developer platforms do — you sign in via browser once, then generate tokens for programmatic use.

**How it works:**

```
Step 1 (one-time, in browser):
  User signs in via Google OAuth → gets cookie session → visits Settings
  → clicks "Create Access Token" → server returns JWT

Step 2 (programmatic, no browser needed):
  Client stores the JWT
  Client sends: Authorization: Bearer <jwt>
  Server verifies JWT signature, extracts userId
```

**Alternatively, for mobile apps:**

```
Step 1: Mobile app opens a webview for Google OAuth
Step 2: OAuth callback redirects to a deep link (myapp://callback?code=...)
Step 3: Mobile app sends the authorization code to your server
Step 4: Server exchanges code, creates session, returns JWT
Step 5: Mobile app stores JWT in secure storage, uses it for API calls
```

**New endpoint:**

```typescript
// POST /api/auth/token — exchange session for JWT
fastify.post("/api/auth/token", async (request, reply) => {
  if (!request.userId) return reply.status(401).send({ error: "Unauthorized" });

  const token = jwt.sign(
    { sub: request.userId },
    config.JWT_SECRET,
    { expiresIn: "30d" }
  );

  return {
    access_token: token,
    token_type: "bearer",
    expires_in: 30 * 24 * 60 * 60,
  };
});
```

**Middleware change — accept both cookies and JWTs:**

```typescript
async function requireAuth(request, reply) {
  // Path 1: Cookie session (existing)
  if (request.userId) return;

  // Path 2: JWT in Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(authHeader.slice(7), config.JWT_SECRET);
      request.userId = payload.sub;
      return;
    } catch {
      // Invalid/expired token — fall through to 401
    }
  }

  return reply.status(401).send({ error: "Unauthorized" });
}
```

**Pros:**
- Web app stays on cookies (no changes to existing frontend)
- Programmatic clients get a proper token
- Tokens are self-contained — server doesn't need to look up anything per request (unlike API keys which require a DB query)
- Standard pattern — most developer platforms work this way
- Works cross-origin — no cookie domain issues

**Cons:**
- More complex than API keys
- JWTs can't be revoked before expiry (unless you add a blocklist — but then you lose the "no DB lookup" benefit)
- Need to add `JWT_SECRET` to environment config
- If tokens are long-lived, a leaked token gives prolonged access
- If tokens are short-lived, you need a refresh token flow (more complexity)

**The refresh token problem:**

Short-lived access tokens (e.g., 1 hour) are more secure but require a refresh flow:

```
Client has expired access token
→ POST /api/auth/refresh with refresh_token
→ Server validates refresh token, issues new access + refresh tokens
→ Client stores new tokens, retries original request
```

This is significant additional complexity: refresh token storage, rotation, revocation, and client-side retry logic. For a personal project, long-lived tokens (30 days) with manual revocation are simpler.

---

### Option D: Full JWT Migration (Replace cookies entirely)

Remove cookie sessions. All clients — browser, mobile, CLI — use JWTs via the `Authorization` header.

**What changes everywhere:**

| Component | Current (Cookies) | After (JWTs) |
|-----------|-------------------|--------------|
| OAuth callback | Sets `Set-Cookie`, redirects to app | Returns `{ access_token, refresh_token }` as JSON |
| Frontend storage | Browser cookie jar (automatic) | In-memory variable (manual) |
| Request auth | `credentials: "include"` (automatic) | `headers: { Authorization: "Bearer ..." }` (manual) |
| XSS impact | Cookie is `httpOnly` — JS can't steal it | Token in memory — XSS can read it (but page reload clears it) |
| CSRF protection | `sameSite: lax` needed | Not needed — no cookies to exploit |
| Token refresh | Not needed — cookie auto-expires, user re-logs in | Required — silent refresh before access token expires |
| Cross-origin | Broken without same domain | Works naturally — `Authorization` header is not domain-restricted |
| Server state | None (encrypted cookie) | None (JWT is self-contained), unless you add revocation |

**Frontend changes required:**

```typescript
// Current: cookies sent automatically
const res = await fetch("/api/quizzes", {
  credentials: "include",
});

// After: must manage token manually
let accessToken = null; // stored in memory, not localStorage

const res = await fetch("/api/quizzes", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

// Need to handle 401 → refresh token → retry
// Need to handle page reload → token lost → redirect to login
// Need to handle token expiry → background refresh
```

**OAuth callback change:**

```typescript
// Current: redirect-based, sets cookie
request.session.set("userId", user.id);
return reply.redirect(config.CLIENT_URL);

// After: returns tokens as JSON, frontend must capture them
const accessToken = jwt.sign({ sub: user.id }, secret, { expiresIn: "1h" });
const refreshToken = crypto.randomBytes(32).toString("hex");
await saveRefreshToken(user.id, refreshToken);
return { access_token: accessToken, refresh_token: refreshToken };
// Frontend must be a SPA that can receive this — not a redirect
```

**Pros:**
- One auth mechanism for all clients
- Cross-origin deployment works (Vercel + separate API)
- No cookie configuration (sameSite, secure, domain) to worry about
- Stateless — scales horizontally without sticky sessions (same as cookies, actually)

**Cons:**
- Significantly more complex frontend code (token storage, refresh, retry)
- XSS can steal tokens from memory (mitigated by short expiry + refresh)
- Must implement refresh token flow (storage, rotation, revocation)
- Page reload loses the token — must handle re-authentication gracefully
- Storing in localStorage is insecure (XSS can steal it); storing in memory loses it on reload
- Lost the simplicity of "browser handles everything"
- Every API call needs the Authorization header (easy to forget in new code)

**Verdict:** Don't do this unless you're sure you need cross-origin deployment or multi-platform clients. The added complexity is substantial and the security trade-offs (XSS surface for tokens) are real. Cookie sessions are strictly better for single-domain browser apps.

---

## Comparison Summary

| | API Keys | JWT Endpoint | Full JWT | Client Creds | OAuth2 Server |
|-|----------|-------------|----------|-------------|---------------|
| **Change size** | Small | Medium | Large | Medium | Very large |
| **Web app impact** | None | None | Full rewrite | None | None |
| **Works for CLI** | Yes | Yes | Yes | No | Yes |
| **Works for mobile** | Yes | Yes | Yes | No | Yes |
| **Third-party apps** | No | No | No | No | Yes |
| **Scoped access** | No | No | No | No | Yes |
| **Works cross-origin** | Yes | Yes | Yes | Yes | Yes |
| **Revocable** | Yes | No (until expiry) | No (until expiry) | Yes | Yes |
| **DB lookup/request** | Yes | No | No | Yes | Yes |
| **Implementation** | ~1 day | ~2-3 days | ~1 week | ~2 days | ~2 weeks (or use Auth0) |

## Option E: Becoming an OAuth2 Authorization Server

A natural question: can we let users obtain a `client_id` and `client_secret` from our app and use the standard OAuth2 Authorization Code flow to access our API — the same pattern we use when authenticating with Google?

The answer is yes, but it means building something fundamentally different.

### The distinction: OAuth2 client vs. OAuth2 server

**What we are today:** An OAuth2 **client**. We redirect users to Google (the authorization server), Google authenticates them, and we consume Google's tokens to identify the user. Google built the authorization server infrastructure — consent screens, token endpoints, client management. We just use it.

**What this option requires:** Becoming an OAuth2 **authorization server** ourselves. We would issue our own client IDs, client secrets, and authorization codes. Third-party applications (or the user's own scripts) would go through the OAuth2 flow against **our** authorization endpoint, not Google's.

```
Current (we are a client):
  Our app → Google's OAuth server → Google issues tokens → We consume them

Option E (we become a server):
  Third-party app → Our OAuth server → We issue tokens → They consume them

  (We still use Google for initial user login — that doesn't change.
   But we add a second OAuth layer where WE are the authority.)
```

### What you'd need to build

**1. Application registry**

A UI and API where developers register OAuth applications, similar to Google Cloud Console's "Create OAuth Client" or GitHub's Developer Settings:

```
POST /api/oauth/applications
{
  "name": "My Quiz CLI",
  "redirect_uris": ["http://localhost:8080/callback"]
}
→ { "client_id": "app_abc123", "client_secret": "secret_xyz789" }
```

New database model:

```prisma
model OAuthApplication {
  id           String   @id @default(cuid())
  name         String
  clientId     String   @unique
  clientSecret String                    // hashed
  redirectUris String[]
  userId       String                    // who registered this app
  user         User     @relation(fields: [userId], references: [id])
  createdAt    DateTime @default(now())
}
```

**2. Authorization endpoint** (`GET /oauth/authorize`)

When a third-party app wants access, it redirects the user's browser here:

```
GET /oauth/authorize?
  client_id=app_abc123&
  redirect_uri=http://localhost:8080/callback&
  response_type=code&
  scope=quizzes:read+attempts:write&
  state=random123
```

Our server shows a consent page: *"My Quiz CLI wants to access your quizzes. Allow?"*

If the user clicks Allow, we redirect back with an authorization code:

```
HTTP 302 → http://localhost:8080/callback?code=authcode_xxx&state=random123
```

**3. Token endpoint** (`POST /oauth/token`)

The third-party app exchanges the authorization code for tokens:

```
POST /oauth/token
  grant_type=authorization_code&
  code=authcode_xxx&
  client_id=app_abc123&
  client_secret=secret_xyz789&
  redirect_uri=http://localhost:8080/callback

→ {
    "access_token": "at_...",
    "token_type": "bearer",
    "expires_in": 3600,
    "refresh_token": "rt_..."
  }
```

**4. Token storage and validation**

```prisma
model OAuthToken {
  id            String    @id @default(cuid())
  accessToken   String    @unique    // hashed
  refreshToken  String?   @unique    // hashed
  userId        String
  applicationId String
  scopes        String[]
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
}
```

Every API request with `Authorization: Bearer at_...` looks up the token, checks expiry, checks scopes, and resolves the userId.

**5. Supporting infrastructure**

- Consent screen UI (HTML page rendered by the server)
- Scope definitions and enforcement (e.g., `quizzes:read` allows `GET /api/quizzes` but not `DELETE`)
- Token refresh endpoint (`POST /oauth/token` with `grant_type=refresh_token`)
- Token revocation endpoint (`POST /oauth/revoke`)
- PKCE support (for public clients like CLIs that can't securely store a client secret)
- Rate limiting per application
- Application management UI (list apps, view usage, revoke)

### Estimated effort

| Component | Effort |
|-----------|--------|
| Application registry (DB + API + UI) | 2-3 days |
| Authorization endpoint + consent screen | 2-3 days |
| Token endpoint (code exchange + refresh) | 2-3 days |
| Token validation middleware | 1 day |
| Scopes enforcement | 1-2 days |
| Revocation + security hardening | 1-2 days |
| **Total** | **~2 weeks** |

This is a substantial feature — effectively building a mini Auth0.

### When this makes sense

- You're building a **platform** where third-party developers create integrations (like Slack apps, GitHub integrations, Stripe Connect)
- You need **delegated access with scopes** — "App X can read my quizzes but not delete them"
- Multiple independent applications (built by different people) need to access your API on behalf of your users
- You want to give users explicit control over which apps have access to their data

### When this doesn't make sense

- A single user wanting to call their own API from a script — **API keys (Option A)** are vastly simpler
- A mobile app you control — **JWT token endpoint (Option C)** is simpler
- Internal service-to-service communication — shared API keys or Client Credentials are simpler
- You have fewer than a handful of API consumers — the OAuth2 authorization server machinery is overengineered

### Off-the-shelf alternatives

If you did need this capability, you wouldn't build it from scratch. You'd use a dedicated authorization server:

| Solution | Type | Notes |
|----------|------|-------|
| **Auth0** | Managed SaaS | Full OAuth2/OIDC server. Free tier: 25K monthly active users. Handles everything — consent, tokens, scopes, revocation. |
| **Clerk** | Managed SaaS | Modern auth platform. Simpler than Auth0, good developer experience. |
| **Ory Hydra** | Open source (self-hosted) | OAuth2/OIDC server in Go. You provide the login/consent UI, Hydra handles the protocol. Production-grade. |
| **Keycloak** | Open source (self-hosted) | Full identity provider (Java). Heavy but complete. Widely used in enterprise. |
| **Ory Cloud** | Managed | Hosted version of Ory Hydra. Avoids self-hosting complexity. |

These solutions plug into your existing app: they handle the OAuth2 protocol, you handle the business logic. Your Fastify server would validate tokens issued by the authorization server instead of checking cookies or API keys.

### Comparison with simpler options

| | API Keys (A) | JWT Endpoint (C) | OAuth2 Server (E) |
|-|-------------|-------------------|-------------------|
| User gets credentials from | Our UI (Settings page) | Our UI (Settings page) | Our UI (Developer portal) |
| Auth flow | None — just send the key | None — just send the token | Full OAuth2 redirect dance |
| Third-party apps | No (key = full user access) | No (token = full user access) | Yes (scoped, delegated access) |
| Consent/approval | Implicit (user creates key) | Implicit (user creates token) | Explicit (consent screen) |
| Scope control | No | No | Yes (fine-grained permissions) |
| Implementation | ~1 day | ~2-3 days | ~2 weeks (or use Auth0/Ory) |
| Right for | Scripts, CLI, personal use | Mobile apps, controlled clients | Platform, third-party ecosystem |

---

## Recommendation

**Now (personal project, browser-only):** Do nothing. Cookie sessions work perfectly.

**If you need CLI/script access:** Add API keys (Option A). It's a 1-day change — new DB model, middleware tweak, key management UI. No impact on the existing web app.

**If you need mobile apps or a public developer API:** Add a JWT token endpoint (Option C). Users authenticate via browser (existing OAuth flow), then generate tokens for other clients. Web app stays on cookies.

**If you're building a platform with third-party integrations:** Become an OAuth2 authorization server (Option E) — but use Auth0, Ory Hydra, or Keycloak instead of building from scratch. Only justified if external developers need scoped, delegated access to your users' data.

**Avoid full JWT migration (Option D)** unless you have a concrete requirement that cookies can't satisfy. The complexity cost is high and the security properties are worse for browser-based usage.
