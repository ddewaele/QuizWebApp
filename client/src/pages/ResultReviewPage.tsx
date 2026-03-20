import { useParams, Link } from "react-router-dom";
import { useAttempt } from "../api/attempts";
import { ScoreDisplay } from "../components/results/ScoreDisplay";
import { ResultReview } from "../components/results/ResultReview";

export function ResultReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useAttempt(id!);

  if (isLoading) return <p className="text-gray-500">Loading result...</p>;
  if (error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        Failed to load result.
      </div>
    );
  if (!data) return null;

  const attempt = data.attempt;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          to="/results"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          &larr; All results
        </Link>
        {attempt.quiz && (
          <>
            <span className="text-gray-300">|</span>
            <Link
              to={`/quizzes/${attempt.quiz.id}/take`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Retake quiz
            </Link>
          </>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        {attempt.quiz?.title ?? "Quiz Result"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Completed {new Date(attempt.completedAt).toLocaleString()}
      </p>

      <div className="mb-8">
        <ScoreDisplay
          score={attempt.score}
          total={attempt.totalQuestions}
          percentage={attempt.percentage}
        />
      </div>

      {attempt.answers && attempt.answers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Question Review
          </h2>
          <ResultReview answers={attempt.answers} />
        </div>
      )}
    </div>
  );
}
