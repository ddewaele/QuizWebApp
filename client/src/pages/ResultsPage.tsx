import { Link } from "react-router-dom";
import { useAttempts } from "../api/attempts";
import { getScoreColor } from "../lib/utils";

export function ResultsPage() {
  const { data, isLoading, error } = useAttempts();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Quiz Results</h1>

      {isLoading && <p className="text-gray-500">Loading results...</p>}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to load results.
        </div>
      )}

      {data && data.attempts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No quiz attempts yet</p>
          <Link
            to="/quizzes"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Take a quiz
          </Link>
        </div>
      )}

      {data && data.attempts.length > 0 && (
        <div className="space-y-3">
          {data.attempts.map((attempt) => (
              <Link
                key={attempt.id}
                to={`/results/${attempt.id}`}
                className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {attempt.quiz?.title ?? "Unknown Quiz"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(attempt.completedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${getScoreColor(attempt.percentage)}`}>
                      {attempt.percentage.toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-500">
                      {attempt.score}/{attempt.totalQuestions}
                    </p>
                  </div>
                </div>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}
