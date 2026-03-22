---
name: start-new-feature
description: Create a feature branch, commit everything, run tests, and push the branch
allowed-tools: Bash
---

Start a new feature branch and get it ready for development or push. Work through
each phase in order, stopping and reporting clearly if anything fails.

---

## Phase 1 — Check out main and pull latest

```
git checkout main
git pull origin main
```

---

## Phase 2 — Create the feature branch

Ask the user: **"What's the name of the feature you'd like to work on?"**

Create the branch:
```
git checkout -b feature/<kebab-case-name>
```

Confirm the branch was created and is active.

---

## Phase 3 — Ensure all code is committed

Run `git status --short`. If there are any uncommitted changes (staged or unstaged):

1. Show the user a concise list of the changed files.
2. Stage all modified tracked files and new source files (skip build artefacts, `.env`, etc.).
3. Ask the user for a commit message, or craft a clear conventional one based on the staged diff.
4. Commit.

If the working tree is already clean, say so and continue.

---

## Phase 4 — Run the E2E test suite

From `client/`, run:
```
PLAYWRIGHT_TEST=true npx playwright test
```

- If all tests pass: continue.
- If any test fails: print the failure summary and stop. Tell the user to fix the failing tests before pushing.

---

## Phase 5 — Push the feature branch

```
git push -u origin <branch-name>
```

---

## Reporting

After completing all phases, print a concise summary table:

| Step | Status |
|------|--------|
| Pulled latest main | ✓ / ✗ |
| Feature branch created | ✓ feature/<name> / ✗ |
| All code committed | ✓ / ✗ |
| E2E tests passing | ✓ / ✗ |
| Branch pushed | ✓ / ✗ |
