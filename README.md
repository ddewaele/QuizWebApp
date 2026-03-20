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

**Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router
**Backend:** Fastify, TypeScript, Prisma ORM, Zod validation
**Database:** PostgreSQL
**Auth:** Google OAuth 2.0 with secure cookie sessions

## Prerequisites

- Node.js 22+
- Docker & Docker Compose
- A Google OAuth 2.0 client (create at [Google Cloud Console](https://console.cloud.google.com/apis/credentials))

## Setup

### 1. Start the database

```bash
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env` with your Google OAuth credentials and generate a session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
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

The app will be available at `http://localhost:5173`. The Vite dev server proxies API requests to the Fastify backend on port 3000.

## Quiz JSON Format

Quizzes are imported/exported as a JSON array of question objects:

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
    "correct_answer": "b"
  },
  {
    "question_id": 2,
    "question_text": "Which are prime?",
    "question_type": "multiple_select",
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
