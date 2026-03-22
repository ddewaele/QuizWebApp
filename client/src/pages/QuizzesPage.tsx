import { Link } from "react-router-dom";
import { useQuizzes } from "../api/quizzes";
import { QuizCard } from "../components/quiz/QuizCard";

export function QuizzesPage() {
  const { data, isLoading, error } = useQuizzes();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Quizzes</h1>
        <div className="flex gap-2">
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
      </div>

      {isLoading && <p className="text-gray-500">Loading quizzes...</p>}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to load quizzes. Please try again.
        </div>
      )}

      {data && data.quizzes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No quizzes yet</p>
          <Link
            to="/quizzes/new"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Create your first quiz
          </Link>
        </div>
      )}

      {data && data.quizzes.length > 0 && (
        <div className="grid gap-4">
          {data.quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}
    </div>
  );
}
