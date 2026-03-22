import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { QuizzesPage } from "./pages/QuizzesPage";
import { QuizDetailPage } from "./pages/QuizDetailPage";
import { QuizEditPage } from "./pages/QuizEditPage";
import { QuizUploadPage } from "./pages/QuizUploadPage";
import { TakeQuizPage } from "./pages/TakeQuizPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ResultReviewPage } from "./pages/ResultReviewPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SharedWithMePage } from "./pages/SharedWithMePage";
import { AcceptSharePage } from "./pages/AcceptSharePage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/quizzes", element: <QuizzesPage /> },
          { path: "/quizzes/new", element: <QuizEditPage /> },
          { path: "/quizzes/upload", element: <QuizUploadPage /> },
          { path: "/quizzes/:id", element: <QuizDetailPage /> },
          { path: "/quizzes/:id/edit", element: <QuizEditPage /> },
          { path: "/quizzes/:id/take", element: <TakeQuizPage /> },
          { path: "/results", element: <ResultsPage /> },
          { path: "/results/:id", element: <ResultReviewPage /> },
          { path: "/shared", element: <SharedWithMePage /> },
          { path: "/share/accept", element: <AcceptSharePage /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
