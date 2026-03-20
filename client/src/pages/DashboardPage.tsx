import { Link } from "react-router-dom";
import { useQuizzes } from "../api/quizzes";
import { useAttempts } from "../api/attempts";
import { useAuth } from "../hooks/useAuth";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: quizData, isLoading: quizzesLoading } = useQuizzes();
  const { data: attemptData, isLoading: attemptsLoading } = useAttempts();

  const quizzes = quizData?.quizzes ?? [];
  const attempts = attemptData?.attempts ?? [];
  const recentAttempts = attempts.slice(0, 5);

  const avgScore =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
      : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="text-gray-500 mb-6">Here's your quiz overview</p>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Quizzes</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {quizzesLoading ? "..." : quizzes.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Attempts</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {attemptsLoading ? "..." : attempts.length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Average Score</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">
            {attemptsLoading
              ? "..."
              : avgScore !== null
                ? `${avgScore.toFixed(0)}%`
                : "--"}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <Link
          to="/quizzes/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Create Quiz
        </Link>
        <Link
          to="/quizzes/upload"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Upload JSON
        </Link>
      </div>

      {/* Recent activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent quizzes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Quizzes
            </h2>
            <Link
              to="/quizzes"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          {quizzes.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">
              No quizzes yet. Create or upload one to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {quizzes.slice(0, 5).map((quiz) => (
                <Link
                  key={quiz.id}
                  to={`/quizzes/${quiz.id}`}
                  className="block bg-white rounded-lg border border-gray-200 px-4 py-3 hover:shadow-sm transition-shadow"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {quiz.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {quiz._count?.questions ?? 0} questions
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent attempts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Results
            </h2>
            <Link
              to="/results"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          {recentAttempts.length === 0 ? (
            <p className="text-sm text-gray-500 bg-white rounded-lg border border-gray-200 p-4">
              No attempts yet. Take a quiz to see your results here.
            </p>
          ) : (
            <div className="space-y-2">
              {recentAttempts.map((attempt) => {
                const pctColor =
                  attempt.percentage >= 80
                    ? "text-green-600"
                    : attempt.percentage >= 50
                      ? "text-amber-600"
                      : "text-red-600";

                return (
                  <Link
                    key={attempt.id}
                    to={`/results/${attempt.id}`}
                    className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3 hover:shadow-sm transition-shadow"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {attempt.quiz?.title ?? "Quiz"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(attempt.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-lg font-bold ${pctColor}`}>
                      {attempt.percentage.toFixed(0)}%
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
