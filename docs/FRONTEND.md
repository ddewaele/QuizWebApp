# Frontend Guide

This guide explains the client-side code for developers who may be new to React, TanStack Query, or single-page application patterns. It covers how the UI works, how it communicates with the backend, and how authentication flows through both layers.

---

## How the Frontend Runs

The frontend is a **single-page application (SPA)**. The browser loads one HTML file (`index.html`), which loads a JavaScript bundle. From that point on, all navigation happens in the browser — clicking a link doesn't reload the page, it just swaps out the React components.

**In development**, Vite serves the app with hot module replacement (HMR) — edit a file and the browser updates instantly without a full reload. Vite also **proxies** API requests:

```
Browser → http://localhost:5174/api/quizzes
         ↓ (Vite proxy)
         http://localhost:3000/api/quizzes → Fastify backend
```

This proxy is configured in `vite.config.ts`:

```typescript
server: {
  port: 5174,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

The frontend code never knows the backend URL. All API calls go to `/api/*` on the same origin, and Vite forwards them.

---

## Entry Point: `src/main.tsx`

```typescript
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
```

This sets up four layers, from outside in:

1. **StrictMode** — React development helper, catches common bugs
2. **ErrorBoundary** — Catches unhandled errors and shows a fallback UI instead of a white screen
3. **QueryClientProvider** — Makes TanStack Query available to all components
4. **RouterProvider** — Renders the correct page component based on the URL

---

## Routing: `src/routes.tsx`

React Router defines which component renders for each URL:

```typescript
export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,         // Public — no auth required
  },
  {
    element: <ProtectedRoute />,    // Auth gate — checks session
    children: [
      {
        element: <AppShell />,      // Layout — navbar + content area
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/quizzes", element: <QuizzesPage /> },
          { path: "/quizzes/:id", element: <QuizDetailPage /> },
          { path: "/quizzes/:id/take", element: <TakeQuizPage /> },
          // ...more routes
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
```

### How Nesting Works

The route tree creates a component hierarchy:

```
/quizzes/:id/take renders as:

<ProtectedRoute>           ← checks auth, redirects to /login if needed
  <AppShell>               ← renders Navbar + <Outlet />
    <TakeQuizPage />       ← the actual page content
  </AppShell>
</ProtectedRoute>
```

`<Outlet />` is React Router's placeholder for "render the child route here." `AppShell` renders the navbar and then `<Outlet />` for the page content.

### Route Parameters

`:id` in a path like `/quizzes/:id` is a dynamic segment. Components read it with:

```typescript
const { id } = useParams<{ id: string }>();
```

---

## Authentication in the Frontend

### How Login Works

1. User visits the app → `ProtectedRoute` calls `useCurrentUser()` to check auth
2. No session → redirected to `/login`
3. User clicks "Continue with Google" → browser navigates to `/api/auth/google`
4. Backend redirects to Google → user signs in → Google redirects back to `/api/auth/google/callback`
5. Backend creates session cookie and redirects browser to `/`
6. `ProtectedRoute` calls `useCurrentUser()` again → session cookie is sent → backend returns user data
7. User sees the dashboard

### ProtectedRoute: `src/components/layout/ProtectedRoute.tsx`

```typescript
export function ProtectedRoute() {
  const { data, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div>Loading...</div>;          // Show spinner while checking
  }

  if (!data?.user) {
    return <Navigate to="/login" replace />;  // No user → go to login
  }

  return <Outlet />;                       // Authenticated → render child routes
}
```

This component is the **auth gate**. It wraps all authenticated routes. On every page load or navigation, it checks if the user has a valid session.

### useCurrentUser: `src/api/auth.ts`

```typescript
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.get<{ user: User | null }>("/auth/me"),
    retry: false,           // Don't retry on 401
    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
  });
}
```

`staleTime: 5 minutes` means TanStack Query won't re-fetch the user data for 5 minutes after a successful fetch. This prevents hitting the API on every page navigation.

### useAuth Hook: `src/hooks/useAuth.ts`

A convenience hook that wraps `useCurrentUser` and `useLogout`:

```typescript
export function useAuth() {
  const { data, isLoading } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    logout: () => logout.mutate(undefined, {
      onSuccess: () => navigate("/login"),
    }),
    isLoggingOut: logout.isPending,
  };
}
```

Components use this to show user info and handle logout:

```typescript
const { user, logout } = useAuth();
// user.name, user.email, user.avatarUrl
```

### How the Session Cookie Works

The session cookie (`quiz_session`) is set by the backend and included automatically in every API request because of `credentials: "include"` in the fetch wrapper:

```typescript
const res = await fetch(`/api${path}`, {
  credentials: "include",  // ← This sends cookies with every request
  headers: { "Content-Type": "application/json" },
  ...options,
});
```

The frontend **never reads or manipulates the cookie directly**. It's `httpOnly`, which means JavaScript can't access it — only the browser and the server can see it. This prevents XSS attacks from stealing the session.

### Security Properties

| Property | Where Enforced | What It Prevents |
|----------|---------------|-----------------|
| `httpOnly` cookie | Backend (auth plugin) | JavaScript can't read the session cookie (prevents XSS theft) |
| `sameSite: lax` | Backend (auth plugin) | Cookie not sent on cross-site POST requests (prevents CSRF) |
| `secure` (production) | Backend (auth plugin) | Cookie only sent over HTTPS |
| `credentials: "include"` | Frontend (API client) | Cookie is included with API requests |
| Auth check on every route | Frontend (ProtectedRoute) | Unauthenticated users see the login page |
| Auth check on every API call | Backend (requireAuth) | API rejects requests without valid session |

**The frontend auth check is a UX convenience, not a security measure.** A malicious user could bypass `ProtectedRoute` easily (it's just JavaScript). The real security is in the backend — every API endpoint checks the session cookie server-side.

---

## Data Fetching with TanStack Query

TanStack Query (formerly React Query) manages server state — data that lives on the backend and needs to be fetched, cached, and kept up to date.

### Why Not Just `fetch` + `useState`?

With plain `fetch`:
```typescript
// You'd have to manage all of this yourself:
const [quizzes, setQuizzes] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  fetch("/api/quizzes")
    .then(res => res.json())
    .then(data => { setQuizzes(data.quizzes); setIsLoading(false); })
    .catch(err => { setError(err); setIsLoading(false); });
}, []);
```

With TanStack Query:
```typescript
const { data, isLoading, error } = useQuizzes();
```

TanStack Query also handles caching, deduplication (multiple components requesting the same data only make one API call), background refetching, and cache invalidation after mutations.

### Queries (Reading Data)

Queries fetch data and cache it:

```typescript
export function useQuizzes() {
  return useQuery({
    queryKey: ["quizzes"],          // Cache key — like a unique ID for this data
    queryFn: () => api.get<{ quizzes: Quiz[] }>("/quizzes"),
  });
}
```

**`queryKey`** identifies what data this is. If two components both call `useQuizzes()`, they share the same cache entry and only one API call is made.

**Usage in a component:**
```typescript
function QuizzesPage() {
  const { data, isLoading, error } = useQuizzes();

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>Error loading quizzes</p>;

  return data.quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} />);
}
```

### Mutations (Writing Data)

Mutations send data to the server and invalidate cached queries:

```typescript
export function useCreateQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post<{ quiz: Quiz }>("/quizzes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      // ↑ Tells TanStack Query: "the quiz list is stale, refetch it"
    },
  });
}
```

**Usage in a component:**
```typescript
const createQuiz = useCreateQuiz();

const handleSubmit = (formData) => {
  createQuiz.mutate(formData, {
    onSuccess: (data) => navigate(`/quizzes/${data.quiz.id}`),
    onError: (err) => setError(err.message),
  });
};

// createQuiz.isPending → true while the request is in flight
```

### Query Key Hierarchy

```
["auth", "me"]              → current user
["quizzes"]                 → list of all user's quizzes
["quizzes", "abc123"]       → single quiz by ID
["attempts"]                → list of all user's attempts
["attempts", "def456"]      → single attempt by ID
```

When you invalidate `["quizzes"]`, it also invalidates `["quizzes", "abc123"]` because it's a prefix match. This means creating/deleting a quiz automatically refreshes both the list and any detail views.

---

## The API Client: `src/api/client.ts`

A thin wrapper around `fetch`:

```typescript
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,  // Validation error details from backend
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 204) return undefined as T;  // No content (e.g., delete)
  const data = await res.json();
  if (!res.ok) throw new ApiError(res.status, data.message, data.details);
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

Every API call goes through this. It handles:
- Adding the `/api` prefix
- Including the session cookie
- Parsing JSON responses
- Throwing typed errors with the backend's error message and details

---

## Component Architecture

### Layout Components

**`AppShell`** — The outer layout for all authenticated pages:
```
┌──────────────────────────────────┐
│          Navbar                  │
├──────────────────────────────────┤
│                                  │
│          <Outlet />              │
│        (page content)            │
│                                  │
└──────────────────────────────────┘
```

**`Navbar`** — Shows the app name, navigation links (My Quizzes, Results), user avatar/name, and sign-out button. Uses the `useAuth` hook. On mobile, collapses into a hamburger menu.

**`ProtectedRoute`** — Auth gate (described above).

### Page Components

Pages are in `src/pages/`. Each is a route-level component that:
1. Fetches data using TanStack Query hooks
2. Handles loading/error states
3. Composes smaller components

Example — `QuizzesPage`:
```typescript
export function QuizzesPage() {
  const { data, isLoading, error } = useQuizzes();

  return (
    <div>
      <h1>My Quizzes</h1>
      {isLoading && <p>Loading...</p>}
      {error && <ErrorAlert message="Failed to load quizzes" />}
      {data?.quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} />)}
    </div>
  );
}
```

### Feature Components

**Quiz components** (`src/components/quiz/`):

| Component | Purpose |
|-----------|---------|
| `QuizCard` | Card showing quiz title, question count, and action buttons |
| `QuizForm` | Create/edit form with title, description, and dynamic question list |
| `QuestionEditor` | Single question editor: text, options, correct answer toggle |
| `QuizPlayer` | Quiz-taking UI: one question at a time, navigation dots, submit |
| `QuizUploader` | File input with client-side JSON validation |

**Result components** (`src/components/results/`):

| Component | Purpose |
|-----------|---------|
| `ScoreDisplay` | Color-coded percentage display (green/amber/red) |
| `ResultReview` | Per-question breakdown showing selected vs correct answers |

**UI components** (`src/components/ui/`):

| Component | Purpose |
|-----------|---------|
| `ConfirmDialog` | Reusable modal with confirm/cancel buttons |
| `ErrorBoundary` | Catches React rendering errors, shows fallback UI |

---

## How Key Features Work

### Taking a Quiz

**Page:** `TakeQuizPage` → loads quiz data → renders `QuizPlayer`

**QuizPlayer state:**
```typescript
const [currentIndex, setCurrentIndex] = useState(0);     // Which question is shown
const [answers, setAnswers] = useState<Record<string, string[]>>({}); // User's selections
const [showConfirm, setShowConfirm] = useState(false);   // Submit dialog visible?
```

**Flow:**
1. Player shows one question at a time with option buttons
2. Single-select: clicking an option replaces the previous selection
3. Multiple-select: clicking toggles the option on/off
4. Navigation dots show answered (green) vs unanswered (gray) questions
5. "Submit Quiz" button appears on the last question (disabled until all answered)
6. Confirm dialog → calls `useSubmitAttempt` mutation
7. On success, navigates to the result review page

**What goes to the backend:**
```json
{
  "answers": {
    "question-cuid-1": ["b"],
    "question-cuid-2": ["a", "c"]
  }
}
```

The keys are question IDs (database CUIDs), the values are arrays of selected option keys. The backend scores this against the correct answers stored in the database.

### Uploading a Quiz

**Page:** `QuizUploadPage` → renders `QuizUploader`

**Flow:**
1. User selects a `.json` file
2. Client-side checks: is it `.json`? Under 5MB? Valid JSON?
3. Title auto-filled from filename
4. User clicks "Upload Quiz"
5. `useImportQuiz` sends `{ title, content }` to `POST /api/quizzes/import`
6. Backend validates the quiz structure with Zod
7. If validation fails, backend returns detailed errors (which field, what's wrong)
8. Frontend displays these errors in a list under the error message
9. On success, navigates to the new quiz's detail page

### Viewing Results

**Page:** `ResultReviewPage` → loads attempt data → renders `ScoreDisplay` + `ResultReview`

`ResultReview` shows each question with color-coded options:
- **Green solid**: You selected this and it's correct
- **Red solid**: You selected this and it's wrong
- **Green dashed**: You didn't select this but it was correct (missed it)
- **Gray**: You didn't select this and it's not correct

Each option shows its explanation text, so the user can learn from their mistakes.

---

## Styling with Tailwind CSS

The app uses Tailwind CSS for styling. Instead of writing CSS files, styles are applied directly in JSX using utility classes:

```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
  Create Quiz
</button>
```

Each class does one thing: `px-4` is horizontal padding, `bg-blue-600` is background color, `hover:bg-blue-700` changes color on hover, etc.

### The `cn()` Utility

`src/lib/utils.ts` exports `cn()` which merges Tailwind classes safely:

```typescript
import { cn } from "../lib/utils";

<div className={cn(
  "px-3 py-2 rounded border",           // Always applied
  isSelected && "border-blue-500 bg-blue-50",  // Conditionally applied
  !isSelected && "border-gray-200",
)} />
```

Without `cn()`, conflicting classes like `border-blue-500` and `border-gray-200` could both end up in the class list, with unpredictable results. `cn()` (powered by `tailwind-merge`) resolves conflicts by keeping only the last conflicting class.

---

## TypeScript Types: `src/types/index.ts`

Shared type definitions for data that comes from the API:

```typescript
export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  userId: string;
  createdAt: string;       // ISO date string from JSON
  updatedAt: string;
  questions: QuizQuestion[];
  _count?: { questions: number; attempts: number };
}
```

These types mirror the backend's Prisma models but are separate because:
- The frontend only sees what the API returns (not all database fields)
- JSON serialization changes types (e.g., `Date` becomes `string`)
- Some fields are optional depending on the query (e.g., `_count`)

---

## Error Handling

### API Errors

When an API call fails, `ApiError` is thrown with the status code, message, and optional details:

```typescript
// In QuizUploadPage:
onError: (err: unknown) => {
  const apiErr = err as ApiError;
  setServerError(apiErr.message);
  const details = apiErr.details as { errors?: ValidationErrorDetail[] } | undefined;
  if (details?.errors) {
    setValidationErrors(details.errors);  // Show per-field errors
  }
}
```

### Error Boundary

`ErrorBoundary` catches errors during React rendering (not API errors — those are handled by TanStack Query). Without it, an unhandled rendering error would crash the entire app with a white screen. With it, the user sees an error message and a "Reload page" button.

### Loading States

Every page that fetches data shows a loading indicator:

```typescript
if (isLoading) return <p className="text-gray-500">Loading quiz...</p>;
if (error) return <div className="...">Failed to load quiz.</div>;
if (!data) return null;
// ...render the actual content
```

This pattern (loading → error → data) appears in every page component.
