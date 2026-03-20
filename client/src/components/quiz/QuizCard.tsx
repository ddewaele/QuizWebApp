import { Link } from "react-router-dom";
import type { Quiz } from "../../types";

interface QuizCardProps {
  quiz: Quiz;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const questionCount = quiz._count?.questions ?? quiz.questions?.length ?? 0;
  const attemptCount = quiz._count?.attempts ?? 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link
            to={`/quizzes/${quiz.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600"
          >
            {quiz.title}
          </Link>
          {quiz.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {quiz.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{questionCount} questions</span>
        <span>{attemptCount} attempts</span>
        <span>Updated {new Date(quiz.updatedAt).toLocaleDateString()}</span>
      </div>
      <div className="flex gap-2 mt-4">
        <Link
          to={`/quizzes/${quiz.id}/take`}
          className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Take Quiz
        </Link>
        <Link
          to={`/quizzes/${quiz.id}/edit`}
          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Edit
        </Link>
        <Link
          to={`/quizzes/${quiz.id}`}
          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Details
        </Link>
      </div>
    </div>
  );
}
