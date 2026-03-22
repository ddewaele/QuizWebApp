# Feature Plan: Quiz Sharing

## Overview

Allow quiz owners to share quizzes with other people — both existing platform users and people who haven't signed up yet. Recipients receive an email notification with a link to take the quiz. Non-users are onboarded through the existing Google OAuth flow when they click the link.

---

## Current State Analysis

### User Model (gaps)

The current `User` model is minimal — just enough for OAuth:

```
User: id, email, name (nullable), avatarUrl (nullable), createdAt, updatedAt
```

**What's missing for sharing:**
- No display name preference (name comes from Google and may be null)
- No way to look up users by email for sharing suggestions
- No user preferences or notification settings
- The `User` entity is created lazily on first OAuth login — there's no concept of a "pending" or "invited" user

### Quiz Ownership

All quizzes are strictly private — scoped to the owner via `userId`. Every route uses `findOwnedQuiz()` which throws `ForbiddenError` if `quiz.userId !== request.userId`. There is no access-level concept (viewer, taker, editor).

### No Email Infrastructure

No email sending capability exists. No SMTP, no transactional email SDK, no email templates.

---

## Email Solution: Resend

**Recommendation: [Resend](https://resend.com)**

| Criteria | Resend |
|----------|--------|
| Free tier | 3,000 emails/month (no expiry) |
| First paid tier | $20/mo for 50K emails |
| SDK | TypeScript-first, minimal (`resend` npm package) |
| Setup | Single API key, REST-based (no SMTP — works on Railway) |
| Railway | Official Railway template, uses HTTPS not SMTP |

**Requirement:** A custom domain for DNS verification (SPF/DKIM). Cannot send from `@gmail.com` or `*.up.railway.app`.

**Alternatives considered:**
- **SendGrid** — no free plan since May 2025, $19.95/mo minimum
- **Amazon SES** — free tier expires after 12 months, complex IAM/sandbox setup
- **Mailgun** — only 100 emails/day free, 1-day log retention
- **Postmark** — only 100 emails/month free
- **Nodemailer + Gmail** — Railway blocks SMTP ports on hobby plans, fragile OAuth token refresh

---

## Data Model Changes

### New Models

```prisma
model QuizShare {
  id        String          @id @default(cuid())
  quizId    String
  quiz      Quiz            @relation(fields: [quizId], references: [id], onDelete: Cascade)

  // Set when sharing with an existing user
  userId    String?
  user      User?           @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Set when sharing with someone not yet on the platform
  email     String

  accessLevel QuizAccessLevel @default(TAKER)
  status      ShareStatus     @default(PENDING)
  token       String          @unique @default(cuid())  // For invitation link

  sharedBy  String          // userId of the person who shared
  sharedAt  DateTime        @default(now())
  acceptedAt DateTime?

  @@unique([quizId, email])  // One share per email per quiz
  @@index([quizId])
  @@index([userId])
  @@index([email])
  @@index([token])
}

enum QuizAccessLevel {
  TAKER    // Can take the quiz and see their own results
  VIEWER   // Can view quiz content (questions + answers) but not edit
}

enum ShareStatus {
  PENDING   // Invitation sent, not yet accepted
  ACCEPTED  // User clicked the link and logged in
  REVOKED   // Owner revoked access
}
```

### User Model Enhancements

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  displayName  String?       // User-chosen display name (future profile page)
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  accounts     AuthAccount[]
  quizzes      Quiz[]
  attempts     QuizAttempt[]
  sharedQuizzes QuizShare[]  // Quizzes shared with this user
}
```

The `displayName` field is optional and separate from `name` (which comes from Google). This prepares for a future user profile page without blocking the sharing feature.

### Quiz Model Updates

```prisma
model Quiz {
  // ... existing fields ...
  shares QuizShare[]  // Add relation
}
```

---

## Sharing Flow

### Happy Path: Share with an Existing User

```
Owner clicks "Share" on quiz
  → Enters recipient's email
  → POST /api/quizzes/:id/shares { email, accessLevel }
  → Server looks up User by email
  → If found: creates QuizShare with userId, status=PENDING
  → Sends email via Resend with invitation link
  → Recipient clicks link → /quiz/:id/shared?token=xxx
  → Server validates token, sets status=ACCEPTED
  → Recipient can now take the quiz
```

### Happy Path: Share with a Non-User

```
Owner clicks "Share" on quiz
  → Enters recipient's email (not on platform)
  → POST /api/quizzes/:id/shares { email, accessLevel }
  → Server finds no User with that email
  → Creates QuizShare with userId=null, status=PENDING
  → Sends email with invitation link
  → Recipient clicks link → /quiz/:id/shared?token=xxx
  → Not logged in → redirected to Google OAuth with returnUrl
  → After OAuth, new User is created (existing flow)
  → Server matches User.email to QuizShare.email
  → Sets QuizShare.userId, status=ACCEPTED
  → Recipient can now take the quiz
```

### Revoking Access

```
Owner goes to quiz sharing settings
  → Sees list of shares (with status)
  → Clicks "Revoke" on a share
  → PATCH /api/quizzes/:id/shares/:shareId { status: REVOKED }
  → Recipient can no longer access the quiz
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/quizzes/:id/shares` | Share quiz with email |
| `GET` | `/api/quizzes/:id/shares` | List shares for a quiz (owner only) |
| `PATCH` | `/api/quizzes/:id/shares/:shareId` | Update share (revoke, change access level) |
| `DELETE` | `/api/quizzes/:id/shares/:shareId` | Remove share entirely |
| `POST` | `/api/quizzes/:id/shares/:shareId/resend` | Resend invitation email |
| `GET` | `/api/shared` | List quizzes shared with the current user |
| `POST` | `/api/shares/accept?token=xxx` | Accept invitation via token |

---

## Authorization Changes

The current `findOwnedQuiz()` pattern needs to be extended. Two levels of access:

```typescript
// Existing — owner only (for edit, delete, share management)
findOwnedQuiz(quizId, userId)

// New — owner OR shared access (for viewing, taking)
findAccessibleQuiz(quizId, userId)
  → Check ownership first
  → If not owner, check QuizShare where quizId + userId + status=ACCEPTED
  → Return quiz with accessLevel metadata
```

The quiz list endpoint (`GET /api/quizzes`) stays owner-only. A new endpoint (`GET /api/shared`) returns quizzes shared with the user.

---

## Client Changes

### New Pages / Components

- **ShareDialog** — modal on quiz detail page, enter email + access level, see current shares, revoke
- **SharedWithMe page** — `/shared` route listing quizzes others shared with the current user
- **AcceptInvitation page** — `/quiz/:id/shared?token=xxx` handles token validation + redirect

### Navigation

- Add "Shared with me" to the sidebar/nav alongside "My Quizzes"
- Share button on quiz cards and quiz detail page

### API Hooks

New TanStack Query hooks in `client/src/api/sharing.ts`:
- `useQuizShares(quizId)` — list shares
- `useShareQuiz()` — mutation to create share
- `useRevokeShare()` — mutation to revoke
- `useSharedWithMe()` — list quizzes shared with current user
- `useAcceptShare(token)` — accept invitation

---

## Email Templates

Two email templates needed (can use React Email with Resend, or simple HTML):

### 1. Quiz Invitation (recipient is already a user)

```
Subject: {ownerName} shared a quiz with you: "{quizTitle}"

Hi {recipientName},

{ownerName} has shared the quiz "{quizTitle}" with you.

[Take Quiz →]  (link to /quiz/:id/shared?token=xxx)

---
QuizWebApp
```

### 2. Quiz Invitation (recipient is not on the platform)

```
Subject: {ownerName} invited you to take a quiz: "{quizTitle}"

Hi,

{ownerName} has invited you to take the quiz "{quizTitle}" on QuizWebApp.

Click below to sign up (via Google) and start the quiz:

[Accept Invitation →]  (link to /quiz/:id/shared?token=xxx)

---
QuizWebApp
```

---

## Implementation Phases

### Phase 1: Data Model + Backend (no email yet)

1. Add `QuizShare` model + migration
2. Add `displayName` to `User` + migration
3. Create `QuizSharingService` with share/revoke/accept/list logic
4. Create sharing routes + Zod schemas
5. Extend authorization: `findAccessibleQuiz()`
6. Update quiz taking flow to allow shared access
7. Tests

### Phase 2: Email Integration

1. Install `resend` package
2. Create `EmailService` with Resend integration
3. Email templates (HTML)
4. Send invitation email on share creation
5. Resend endpoint
6. Make `RESEND_API_KEY` optional — sharing works without email (link-only), email adds the notification on top

### Phase 3: Client UI

1. ShareDialog component
2. "Shared with me" page + route
3. Accept invitation page (token handling + OAuth redirect)
4. Share button on quiz cards
5. TanStack Query hooks
6. E2E tests for sharing flows

### Phase 4: Polish

1. User profile page (displayName, avatar, preferences)
2. Share notification badges
3. "Copy link" sharing (no email needed)
4. Batch sharing (multiple emails at once)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | No (Phase 2) | Resend API key for sending emails |
| `RESEND_FROM_EMAIL` | No (Phase 2) | Verified sender address (e.g. `noreply@yourdomain.com`) |

Both are optional — the app works without email, sharing just won't send notifications.

---

## Open Questions

1. **Should shared quizzes show the owner's results/analytics, or only the taker's own attempts?** Recommendation: only the taker's own attempts for privacy.
2. **Should there be an EDITOR access level (can modify quiz content)?** Recommendation: not in v1, start with TAKER and VIEWER only.
3. **Should sharing be possible without email (link-only sharing)?** Recommendation: yes, as Phase 4 polish — generate a shareable URL that anyone with the link can use.
4. **Rate limiting on share invitations?** Recommendation: yes, limit to 20 shares per quiz and 50 invitations per day per user to prevent abuse.
5. **Custom domain for Resend:** Which domain will be used for sending emails? This needs DNS verification (SPF/DKIM records).
