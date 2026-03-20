import { Link } from "react-router-dom";
import { useQuizzes } from "../api/quizzes";
import { useAttempts } from "../api/attempts";

export function DashboardPage() {
  const { data: quizData, isLoading: quizzesLoading } = useQuizzes();
  const { data: attemptData, isLoading: attemptsLoading } = useAttempts();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">My Quizzes</h2>
          <p className="text-3xl font-bold text-blue-600">
            {quizzesLoading ? "..." : quizData?.quizzes.length ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Attempts</h2>
          <p className="text-3xl font-bold text-green-600">
            {attemptsLoading ? "..." : attemptData?.attempts.length ?? 0}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
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
          Upload Quiz
        </Link>
        <Link
          to="/quizzes"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          View All Quizzes
        </Link>
      </div>
    </div>
  );
}
