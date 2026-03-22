# Code Refactoring Report

**Branch:** `step-18/code-refactoring`
**Date:** 2026-03-20

## Summary

Ran three parallel code review agents (reuse, quality, efficiency) and fixed the most impactful findings. Net result: **-94 lines** (126 added, 220 removed).

---

## Changes Made

### 1. Extract Score Color Utilities

**Problem:** Percentage-to-color ternary duplicated in 3 files (ScoreDisplay, DashboardPage, ResultsPage).

**Fix:** Added `getScoreColor()` and `getScoreBgColor()` to `client/src/lib/utils.ts`.

**Files changed:** `ScoreDisplay.tsx`, `DashboardPage.tsx`, `ResultsPage.tsx`

---

### 2. Extract ConfirmDialog Component

**Problem:** Identical modal dialog markup duplicated in QuizDetailPage (delete confirmation) and QuizPlayer (submit confirmation).

**Fix:** Created `client/src/components/ui/ConfirmDialog.tsx` with props for title, message, confirm/cancel labels, destructive mode, and pending state.

**Files changed:** `QuizDetailPage.tsx`, `QuizPlayer.tsx`

---

### 3. Remove Duplicated Quiz File Schema

**Problem:** The entire Zod validation schema (~80 lines) was copy-pasted from `shared/quiz-file.schema.ts` into `server/src/services/quiz-import.service.ts` with a "keep in sync" comment.

**Fix:** Imported directly from `shared/` and adjusted `server/tsconfig.json` to include the shared directory in `rootDirs` and `include`.

**Files changed:** `quiz-import.service.ts`, `server/tsconfig.json`

---

### 4. Extract findOwnedQuiz Helper

**Problem:** The pattern of `findUnique` + null check + ownership check was repeated in `update()` and `delete()` methods of QuizService.

**Fix:** Extracted `private async findOwnedQuiz(id, userId)` method.

**Files changed:** `quiz.service.ts`

---

### 5. Replace `as any` with Proper Prisma Types

**Problem:** `options` and `correctAnswer` fields cast to `any` in QuizService create/update.

**Fix:** Cast to `Prisma.InputJsonValue` for proper type safety.

**Files changed:** `quiz.service.ts`

---

### 6. Set-Based Scoring Comparison

**Problem:** `checkAnswer()` sorted both arrays (O(n log n)) to compare selected vs correct answers.

**Fix:** Uses `Set.has()` for O(n) comparison.

**Files changed:** `attempt.service.ts`

---

### 7. useMemo for Dashboard Average Score

**Problem:** `avgScore` recalculated on every render via `.reduce()` over all attempts.

**Fix:** Wrapped in `useMemo` with `[attempts]` dependency.

**Files changed:** `DashboardPage.tsx`

---

## Findings Not Addressed (Intentionally Skipped)

| Finding | Reason for skipping |
|---------|-------------------|
| Error alert component extraction | Instances vary enough (some have detail lists, inline text, etc.) that a shared component adds indirection without meaningful gain |
| Magic string constants for question types | TypeScript type literals (`"single_select" \| "multiple_select"`) already enforce correctness at compile time |
| Client-side JSON.parse before upload | Intentional UX — gives immediate feedback before network round-trip |
| Prisma `_count` leaking to client types | Standard Prisma usage pattern, not worth normalizing into separate DTOs |
| QuestionEditor option rebuild on toggle | 6 object spreads is trivial; React is already diffing the virtual DOM |
| React Query broad cache invalidation | Correct behavior — list views should refetch after any mutation |
| ProtectedRoute redundant auth check | Uses `staleTime: 5min`, doesn't actually re-fetch on every render |
