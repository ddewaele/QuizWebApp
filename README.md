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

## Quiz JSON Format

Quizzes are imported/exported as a JSON array of question objects. `correct_answer` is always an array — single-select questions have one element, multiple-select questions have two or more:

```json
[
  {
    "question_id": 1,
    "question_text": "What is 2 + 2?",
    "options": {
      "a": { "text": "3", "is_true": false, "explanation": "Incorrect" },
      "b": { "text": "4", "is_true": true, "explanation": "Correct!" },
      "c": { "text": "5", "is_true": false, "explanation": "Incorrect" }
    },
    "correct_answer": ["b"]
  },
  {
    "question_id": 2,
    "question_text": "Which are prime?",
    "options": {
      "a": { "text": "2", "is_true": true, "explanation": "2 is prime" },
      "b": { "text": "4", "is_true": false, "explanation": "4 = 2×2" },
      "c": { "text": "7", "is_true": true, "explanation": "7 is prime" }
    },
    "correct_answer": ["a", "c"]
  }
]
```

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
