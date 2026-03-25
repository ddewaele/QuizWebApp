import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuiz } from "../api/quizzes";
import { useSubmitAttempt } from "../api/attempts";
import { QuizPlayer } from "../components/quiz/QuizPlayer";
import { ApiError } from "../api/client";

export function TakeQuizPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuiz(id!);
  const submitAttempt = useSubmitAttempt();

  if (isLoading) return <p className="text-gray-500">Loading quiz...</p>;
  if (error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        Failed to load quiz.
      </div>
    );
  if (!data) return null;

  const quiz = data.quiz;

  const handleSubmit = (answers: Record<string, string[]>, onError: () => void) => {
    submitAttempt.mutate(
      { quizId: quiz.id, answers },
      {
        onSuccess: (data) => navigate(`/results/${data.attempt.id}`),
        onError,
      },
    );
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/quizzes/${quiz.id}`}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          &larr; Back to quiz
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h1>
      {quiz.description && (
        <p className="text-gray-600 mb-6">{quiz.description}</p>
      )}

      {submitAttempt.error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">
              {submitAttempt.error instanceof ApiError && submitAttempt.error.status === 401
                ? "Your session expired — please sign in again and retry."
                : submitAttempt.error.message || "Failed to submit quiz. Please try again."}
            </p>
            {submitAttempt.error instanceof ApiError && submitAttempt.error.status === 401 && (
              <a href="/api/auth/google" className="inline-block mt-2 text-blue-600 hover:underline font-medium">
                Sign in again →
              </a>
            )}
          </div>
          <button
            onClick={() => submitAttempt.reset()}
            className="text-red-400 hover:text-red-600 flex-shrink-0 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      <QuizPlayer
        questions={quiz.questions}
        onSubmit={handleSubmit}
        isSubmitting={submitAttempt.isPending}
      />
    </div>
  );
}
