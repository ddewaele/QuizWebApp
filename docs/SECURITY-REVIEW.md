# Security Review Report

**Branch:** `step-18/code-refactoring`
**Date:** 2026-03-20
**Reviewer:** Automated security analysis (3-phase: identification, false-positive filtering, confidence scoring)

---

## Summary

**No HIGH or MEDIUM severity security vulnerabilities found.**

The codebase follows good security practices throughout. One authorization logic issue was identified but classified as a functional bug (overly restrictive), not a security vulnerability.

---

## Detailed Findings

### Authorization Logic Bug (Not a Security Vulnerability)

**Severity:** Functional bug (NOT a security issue — errs on the side of denying access)
**Confidence:** 9/10

**Description:** The `QuizService.getById()` and `AttemptService.submit()` methods both check `quiz.userId !== userId`, meaning only the quiz owner can view or attempt a quiz. This blocks the intended "take quizzes" feature for shared/multi-user scenarios described in the README.

**Files:**
- `server/src/services/quiz.service.ts:34` — ownership check on getById
- `server/src/services/attempt.service.ts:15` — ownership check on submit

**Impact:** Users cannot take quizzes created by other users. This is too restrictive, not too permissive — no data is exposed that shouldn't be.

**Recommendation:** If multi-user quiz taking is desired, remove ownership checks from `getById` (for viewing) and `submit` (for attempting), while keeping them on `update`, `delete`, and `export`.

---

## Areas Reviewed — No Issues Found

| Area | Status | Details |
|------|--------|---------|
| SQL / NoSQL Injection | Safe | Prisma ORM with parameterized queries throughout |
| XSS | Safe | React JSX escaping; no `dangerouslySetInnerHTML` usage |
| Authentication Bypass | Safe | Session-based auth via `@fastify/secure-session`; `requireAuth` middleware on all protected routes |
| Authorization (IDOR) | Safe | Ownership verified on all resource endpoints (quiz CRUD, attempts, export) |
| Session Management | Safe | `httpOnly`, `sameSite: lax`, `secure` in production, 7-day expiry |
| CORS | Safe | Restricted to `CLIENT_URL` in development; disabled (`false`) in production |
| Hardcoded Secrets | None | All secrets loaded from environment variables with Zod validation |
| OAuth Flow | Safe | Google OIDC with PKCE S256; state handled by `@fastify/oauth2` |
| Content-Disposition Header | Safe | Quiz title sanitized with `replace(/[^a-zA-Z0-9-_ ]/g, "")` |
| JSON Deserialization | Safe | `JSON.parse` followed by comprehensive Zod schema validation |
| API Data Exposure | Safe | `/api/auth/me` uses Prisma `select` to limit returned fields |
| Scoring Integrity | Safe | All scoring computed server-side from DB-stored correct answers; client cannot manipulate |
| File System Access | Safe | No file system operations on user-controlled paths |
| Input Validation | Safe | Zod schemas validate all API request bodies |

---

## Security Architecture Summary

### Authentication Flow
1. User clicks "Continue with Google" → redirected to `/api/auth/google`
2. `@fastify/oauth2` handles OAuth 2.0 Authorization Code flow with PKCE (S256)
3. Callback at `/api/auth/google/callback` exchanges code for token
4. Server fetches user info from Google's OpenID Connect userinfo endpoint
5. User record created/updated in database with linked `AuthAccount`
6. Session cookie (`quiz_session`) set with user ID

### Session Security
- **Library:** `@fastify/secure-session` (encrypted cookie, no server-side session store)
- **Cookie flags:** `httpOnly`, `sameSite: lax`, `secure` (production only)
- **Encryption key:** 32-byte hex string from `SESSION_SECRET` env var
- **Expiry:** 7 days

### Authorization Model
- All `/api/*` routes except `/api/auth/google`, `/api/auth/google/callback`, and `/api/health` require authentication
- Resource ownership enforced at the service layer (not just middleware)
- User ID extracted from encrypted session cookie on every request

### Input Validation
- All request bodies validated with Zod schemas before reaching service layer
- Quiz file imports validated against comprehensive schema (structure, key references, type consistency)
- File uploads restricted to `.json` format with client-side size limit (5MB)
