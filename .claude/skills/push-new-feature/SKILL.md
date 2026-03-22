---
name: push-new-feature
description: Verify feature branch is clean and tested, then create a PR and wait for CI
allowed-tools: Bash
---

Validate the current feature branch and open a PR. Work through each phase in order,
stopping and reporting clearly if anything fails. Do NOT auto-merge — the user decides when to merge.

---

## Phase 1 — Verify we are on a feature branch

Run `git branch --show-current` and confirm the branch name starts with
`feature/` or `bugfix/`. If we are on `main` or any other branch, stop and tell
the user to switch to the correct feature branch before continuing.

---

## Phase 2 — Ensure all code is committed and pushed

Run `git status --short`.

If there are uncommitted changes:
1. Show the user a concise list of the changed files.
2. Stage all modified tracked files and new source files (skip build artefacts, `.env`, etc.).
3. Ask the user for a commit message, or craft a clear conventional one based on the staged diff.
4. Commit.

Then check if the branch is ahead of its remote:
```
git status -sb
```

If unpushed commits exist, push them:
```
git push -u origin <branch-name>
```

---

## Phase 3 — Run the E2E test suite

From `client/`, run:
```
PLAYWRIGHT_TEST=true npx playwright test
```

- If all tests pass: continue.
- If any test fails: print the failure summary, stop, and tell the user to fix the failing
  tests before retrying. Do NOT create a PR with failing tests.

---

## Phase 4 — Verify commit message quality

Run `git log --oneline main..HEAD` to review all commits on this branch since it diverged from `main`.

A good commit message:
- Has a concise subject line (≤ 72 chars) in the imperative mood
- Accurately describes *what* changed and *why*
- Is not a WIP/temp/auto message

If the latest commit message is poor, ask the user if they want to amend it.
If yes, use `git commit --amend -m "<new message>"` then `git push --force-with-lease`.

---

## Phase 5 — Create a GitHub issue and PR

### 5a. Create a GitHub issue

Use `gh issue create` with:
- A clear title matching the feature
- A body with `## Summary` and `## Implementation notes` sections covering what was built, why, and notable decisions.

Capture the issue number from the output.

### 5b. Create the PR

Use `gh pr create` with:
- Title: same as the issue title
- Body: references the issue (`Closes #<number>`), a `## Summary` (2–4 bullets of what changed), and a `## Test plan` checklist noting the E2E tests that cover the feature.

---

## Phase 6 — Wait for CI checks

After the PR is created, wait for the required status checks to complete:
```
gh pr checks <pr-number> --watch
```

- If all checks pass: report success and show the PR URL. Tell the user the PR is ready to merge.
- If any check fails: stop, show the failure output, and tell the user to fix the issue and push again.

Do NOT merge the PR — leave that to the user.

---

## Reporting

After completing all phases, print a concise summary table:

| Step | Status |
|------|--------|
| Feature branch confirmed | ✓ / ✗ |
| All code committed & pushed | ✓ / ✗ |
| E2E tests passing | ✓ / ✗ |
| Commit message quality | ✓ / ✗ |
| GitHub issue created | ✓ #<n> |
| PR created | ✓ #<n> |
| CI checks passed | ✓ / ✗ |
| PR ready to merge | ✓ (user action required) |
