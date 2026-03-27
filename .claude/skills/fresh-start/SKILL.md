---
name: fresh-start
description: Kill all dev processes and restart backend + frontend from scratch
disable-model-invocation: true
allowed-tools: Bash
---

Perform a clean restart of the entire development environment.

## Configuration (adjust per project)
- Backend port: 3000
- Frontend port: 5174
- Backend start command: `npx tsx watch src/index.ts` (run from `server/`)
- Frontend start command: `node node_modules/.bin/vite --port 5174` (run from `client/`)
- Health check URL: `http://localhost:3000/api/health`
- ORM codegen: `npx prisma generate` (remove this step if not using Prisma)

## Steps

### 1. Kill existing processes

Kill any processes running on the dev ports:
- Port 3000 (Fastify backend)
- Port 5174 (Vite frontend)

Use `lsof -ti :<port> | xargs kill` for each port. Don't fail if nothing is running.

### 2. Verify Docker PostgreSQL is running

First check that the Docker daemon itself is reachable:
```
docker info
```
If this fails (exit code non-zero), **stop immediately** and tell the user:
> "Docker daemon is not running. Please start Docker Desktop first, wait ~20 seconds for it to initialize, then run /fresh-start again."
Do NOT proceed with the remaining steps.

If Docker is running, check the container status:
```
docker compose ps
```
If the PostgreSQL container is not running or unhealthy, start it:
```
docker compose up -d
```
Then wait up to 15 seconds for it to become healthy by polling:
```
docker compose ps
```
If after 15 seconds it's still not healthy, report "Database: FAILED" and stop — do not start the backend or frontend, as they will fail without a database.

### 3. Regenerate Prisma client

From `server/`, run:
```
npx prisma generate
```
This ensures the Prisma client matches the current schema (avoids stale column errors).

### 4. Start the backend

From `server/`, start the Fastify server in watch mode in the background:
```
npx tsx watch src/index.ts
```
Watch mode automatically restarts the server when source files change — no manual restart needed after code edits.
Wait 3 seconds, then verify it responds on `http://localhost:3000/api/health`.

### 5. Start the frontend

From `client/`, start the Vite dev server in the background:
```
node node_modules/.bin/vite --port 5174
```
Wait 3 seconds, then verify it responds on `http://localhost:5174`.

### 6. Report status

Print a summary:
- Backend: OK/FAILED (port 3000)
- Frontend: OK/FAILED (port 5174)
- Database: OK/FAILED (docker container)

If everything is OK, tell the user the app is ready at http://localhost:5174.
