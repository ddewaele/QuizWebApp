# QuizApp

A full-stack quiz management web application built with React, Fastify, Prisma, and PostgreSQL.

## Features

- Google SSO authentication
- Create, edit, and delete quizzes
- Import quizzes from JSON files with full validation
- Export quizzes back to JSON
- Take quizzes with single-select and multiple-select questions
- View results with detailed per-question review and explanations
- Dashboard with stats and recent activity

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router
- **Backend:** Fastify, TypeScript, Prisma ORM, Zod validation
- **Database:** PostgreSQL
- **Auth:** Google OAuth 2.0 with secure cookie sessions

## Prerequisites

- Node.js 22+
- Docker & Docker Compose
- A Google Cloud project with OAuth 2.0 credentials (see below)

## Google OAuth 2.0 Setup

The app uses Google Sign-In for authentication. Follow these steps to create the required OAuth credentials:

### 1. Create a Google Cloud project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top and select **New Project**
3. Enter a project name (e.g. "QuizApp") and click **Create**
4. Make sure the new project is selected in the dropdown

### 2. Configure the OAuth consent screen

1. Navigate to **APIs & Services > OAuth consent screen** ([direct link](https://console.cloud.google.com/apis/credentials/consent))
2. Select **External** as the user type and click **Create**
3. Fill in the required fields:
   - **App name:** QuizApp (or any name)
   - **User support email:** your email
   - **Developer contact email:** your email
4. Click **Save and Continue**
5. On the **Scopes** page, click **Add or Remove Scopes** and add:
   - `openid`
   - `email`
   - `profile`
6. Click **Save and Continue** through the remaining steps

> **Note:** While in "Testing" status, only test users you explicitly add can sign in. Add your Google account under **OAuth consent screen > Test users** if needed. For broader access, submit the app for verification or switch to an Internal user type (Google Workspace only).

### 3. Create OAuth 2.0 credentials

1. Navigate to **APIs & Services > Credentials** ([direct link](https://console.cloud.google.com/apis/credentials))
2. Click **+ Create Credentials > OAuth client ID**
3. Select **Web application** as the application type
4. Set the name (e.g. "QuizApp Local Dev")
5. Under **Authorized JavaScript origins**, add:
   ```
   http://localhost:5174
   ```
6. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:5174/api/auth/google/callback
   ```
7. Click **Create**
8. Copy the **Client ID** and **Client Secret** — you'll need these for the `.env` file

### 4. Important notes

- The redirect URI must exactly match what is configured in the server's auth plugin. The Vite dev server proxies `/api/*` requests to the Fastify backend, so the callback URL uses the frontend origin (`localhost:5174`), not the backend port.
- If you change the client port, update the redirect URI in Google Cloud Console to match.
- For production, add the production domain to both **Authorized JavaScript origins** and **Authorized redirect URIs**.

## Setup

### 1. Start the database

```bash
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env` and fill in:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Pre-filled, works with the docker-compose PostgreSQL |
| `GOOGLE_CLIENT_ID` | Client ID from step 3 above |
| `GOOGLE_CLIENT_SECRET` | Client Secret from step 3 above |
| `SESSION_SECRET` | Generate with the command below |
| `CLIENT_URL` | `http://localhost:5174` |

Generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example `server/.env`:

```env
DATABASE_URL="postgresql://quiz:quiz_dev_password@localhost:5433/quizapp?schema=public"
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret-here"
SESSION_SECRET="your-64-char-hex-string-here"
PORT=3000
HOST="0.0.0.0"
NODE_ENV="development"
CLIENT_URL="http://localhost:5174"
```

### 3. Install dependencies

```bash
cd server && npm install && npx prisma migrate dev && cd ..
cd client && npm install && cd ..
```

### 4. Run the app

In two terminals:

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

The app will be available at `http://localhost:5174`. The Vite dev server proxies `/api` requests to the Fastify backend on port 3000.

## Deployment

### Railway

The app deploys as a **single Railway service**. Fastify serves both the API and the built React SPA — no separate frontend service needed.

#### One-click deploy

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/kKmqU-?referralCode=dD_tWh&utm_medium=integration&utm_source=template&utm_campaign=generic)

Clicking the button opens Railway's deployment wizard. It provisions the app and a PostgreSQL database, auto-generates `SESSION_SECRET`, and prompts you for `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ANTHROPIC_API_KEY`. `DATABASE_URL` and `CLIENT_URL` are wired automatically.

After deploying, add your Railway domain to your [Google OAuth client](https://console.cloud.google.com/apis/credentials):
- **Authorised JavaScript origins:** `https://your-app.up.railway.app`
- **Authorised redirect URIs:** `https://your-app.up.railway.app/api/auth/google/callback`

#### CLI setup (alternative)

A setup script handles project creation, PostgreSQL provisioning, environment variables, and the first deploy in one go.

**Prerequisites:**

```bash
npm install -g @railway/cli
railway login
```

**Run from the repo root:**

```bash
./scripts/railway-setup.sh
```

The script will:
1. Create the Railway project
2. Provision a PostgreSQL database (with `DATABASE_URL` injected automatically)
3. Generate a `SESSION_SECRET` and set `NODE_ENV=production`
4. Prompt for `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ANTHROPIC_API_KEY`
5. Generate a Railway domain and set `CLIENT_URL`
6. Trigger the first deployment

#### Manual setup (alternative)

If you prefer the dashboard:

1. **Create project** — New Project → Deploy from GitHub repo
2. **Add database** — Add Service → Database → PostgreSQL (injects `DATABASE_URL` automatically)
3. **Set variables** in the Variables tab:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `CLIENT_URL` | Your Railway domain, e.g. `https://quizwebapp.up.railway.app` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret |
| `SESSION_SECRET` | 64-char hex string (see generation command above) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (for AI quiz generation) |

#### Update Google OAuth credentials

After getting your Railway domain, add it to your [Google Cloud OAuth client](https://console.cloud.google.com/apis/credentials):

- **Authorised JavaScript origins:** `https://your-app.up.railway.app`
- **Authorised redirect URIs:** `https://your-app.up.railway.app/api/auth/google/callback`

`CLIENT_URL` is used to construct the OAuth callback URI — once it matches your Railway domain the auth flow works without code changes.

#### How the build works

`nixpacks.toml` defines the pipeline Railway runs on every deploy:

1. **Install** — `npm ci` for both `client/` and `server/`
2. **Build** — Vite builds the React app into `client/dist/`; `tsc` compiles the server; Prisma client is generated
3. **Start** — `prisma migrate deploy` runs pending migrations, then `npm start` launches Fastify

In production Fastify serves `client/dist/` as static files and falls back to `index.html` for all non-API routes, so React Router's client-side navigation works correctly.

## Quiz JSON Format

Quizzes are imported/exported as a JSON array of question objects.

The exact JSON format of a quiz file is defined by the `QuizFileSchema` in `server/src/schemas/quizFile.ts`. This schema uses Zod for validation and ensures that imported quiz files have the correct structure and data types.

The format schema documentation can be found in [QUIZ-FORMAT.md](QUIZ-FORMAT.md).

## Running Tests

```bash
cd server && npm test
```

## Project Structure

```
├── server/          # Fastify backend
│   ├── prisma/      # Schema & migrations
│   ├── src/
│   │   ├── plugins/ # Fastify plugins (auth, prisma)
│   │   ├── routes/  # API route handlers
│   │   ├── services/# Business logic
│   │   ├── schemas/ # Zod validation schemas
│   │   └── middleware/
│   └── tests/
├── client/          # React frontend
│   └── src/
│       ├── api/     # TanStack Query hooks
│       ├── components/
│       ├── pages/
│       └── hooks/
└── shared/          # Shared quiz file schema
```
