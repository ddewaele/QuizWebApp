---
name: shutdown
description: Stop the frontend, backend, and Docker Compose services
disable-model-invocation: true
allowed-tools: Bash
---

Shut down all running development services.

## Configuration (adjust per project)
- Backend port: 3000
- Frontend port: 5174

## Steps

### 1. Stop the backend

Kill any process running on port 3000 (Fastify backend):
```
lsof -ti :3000 | xargs kill 2>/dev/null || true
```

### 2. Stop the frontend

Kill any process running on port 5174 (Vite frontend):
```
lsof -ti :5174 | xargs kill 2>/dev/null || true
```

### 3. Stop Docker Compose

From the project root, stop all Docker Compose services:
```
docker compose down
```

### 4. Report status

Verify nothing is still running on ports 3000 and 5174, and that Docker containers are stopped. Print a summary:

| Service | Status |
|---------|--------|
| Backend (port 3000) | stopped |
| Frontend (port 5174) | stopped |
| Docker Compose | stopped |
