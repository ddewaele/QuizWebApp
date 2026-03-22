---
name: pr-push-merge-start-new-feature
description: Validate, push, and merge the current feature branch, then prepare for the next feature
allowed-tools: Bash
---

Wrap up the current feature and prepare for the next one. Work through
each phase in order, stopping and reporting clearly if anything fails.

---

## Phase 1 — Verify we are on a feature branch

Run `git branch --show-current` and confirm the branch name starts with
`feature/` or `bugfix/`. If we are on `main` or any other branch:

- If the user has indicated there is no feature ready, check out `main`,
  pull latest, and skip to Phase 6.
- Otherwise, stop and tell the user which branch we are on and ask them
  to switch to the correct feature branch before continuing.

---

## Phase 2 — Ensure all code is committed

Run `git status --short`. If there are any uncommitted changes (staged
or unstaged):

1. Show the user a concise list of the changed files.
2. Stage everything relevant with `git add -p` reasoning — stage ALL
   modified tracked files and any new source files (skip build artefacts,
   lock-file-only changes if unintentional, etc.).
3. Ask the user for a commit message or craft a clear, conventional one
   based on the staged diff.
4. Commit.

If the working tree is already clean, say so and continue.

---

## Phase 3 — Run the E2E test suite

From `client/`, run:
```
PLAYWRIGHT_TEST=true npx playwright test
```

- If all tests pass: continue.
- If any test fails: print the failure summary, stop, and tell the user
  to fix the failing tests before running this skill again. Do NOT push
  or create a PR with failing tests.

---

## Phase 4 — Verify a good commit message exists

Run `git log --oneline -5` and review the most recent commit(s) on this
branch (everything since it diverged from `main`).

A good commit message:
- Has a concise subject line (≤ 72 chars) written in the imperative mood
- Accurately describes *what* changed and *why* (not just "fixes" or "updates")
- Is not a WIP/temp/auto message

If the latest commit message is poor, ask the user if they want to amend
it. If yes, use `git commit --amend -m "<new message>"` (do NOT force-push
yet — that comes later).

---

## Phase 5 — Create GitHub issue and PR, then push and merge

Do these steps in order:

### 5a. Create a GitHub issue

Use `gh issue create` with:
- A clear title matching the feature
- A body covering: what was built, why, and any notable implementation
  decisions. Use markdown with a `## Summary` and `## Implementation notes`
  section.

Capture the issue number from the output.

### 5b. Push the branch

```
git push -u origin <branch-name>
```

If the branch was already pushed and an amend happened in Phase 4, use
`git push --force-with-lease origin <branch-name>`.

### 5c. Create a GitHub PR

Use `gh pr create` with:
- Title: same as the issue title
- Body: references the issue (`Closes #<number>`), includes a `## Summary`
  (2–4 bullet points of what changed), and a `## Test plan` checklist
  noting the E2E tests that cover the feature.

### 5d. Wait for CI checks to pass

After the PR is created, wait for the required status checks to complete:
```
gh pr checks <pr-number> --watch
```

- If all checks pass: continue to merge.
- If any check fails: stop, show the failure output, and tell the user to
  fix the issue and push again before retrying. Do NOT merge a PR with
  failing checks.

### 5e. Merge the PR

```
gh pr merge <pr-number> --squash --delete-branch
```

---

## Phase 6 — Return to main and prepare for next feature

```
git checkout main
git pull origin main
```

Ask the user: **"What's the next feature you'd like to work on?"**

- If they provide a name, create a branch:
  `git checkout -b feature/<kebab-case-name>`
  and confirm the branch is ready.
- If they say they don't know yet or want to decide later, stay on `main`
  and let them know they can start a new branch whenever they're ready.

---

## Reporting

After completing all phases, print a concise summary table:

| Step | Status |
|------|--------|
| Feature branch confirmed | ✓ / ✗ |
| All code committed | ✓ / ✗ |
| E2E tests passing | ✓ / ✗ |
| Commit message quality | ✓ / ✗ |
| GitHub issue created | ✓ #<n> |
| Branch pushed | ✓ / ✗ |
| PR created | ✓ #<n> |
| CI checks passed | ✓ / ✗ |
| PR merged | ✓ #<n> |
| Back on main | ✓ / ✗ |
| Next feature branch | ✓ feature/<name> / staying on main |
