import { Link } from "react-router-dom";
import { useSharedWithMe } from "../api/sharing";

export function SharedWithMePage() {
  const { data, isLoading, error } = useSharedWithMe();

  if (isLoading) return <p className="text-gray-500">Loading shared quizzes...</p>;
  if (error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        Failed to load shared quizzes.
      </div>
    );

  const sharedQuizzes = data?.sharedQuizzes ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shared with me</h1>
      </div>

      {sharedQuizzes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No quizzes have been shared with you yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sharedQuizzes.map((item) => (
            <div
              key={item.shareId}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link
                    to={`/quizzes/${item.quiz.id}/take`}
                    className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {item.quiz.title}
                  </Link>
                  {item.quiz.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {item.quiz.description}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
                    item.accessLevel === "TAKER"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {item.accessLevel.toLowerCase()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{item.quiz._count?.questions ?? 0} questions</span>
                <span>
                  Shared {new Date(item.sharedAt).toLocaleDateString()}
                </span>
              </div>
              {item.accessLevel === "TAKER" && (
                <div className="mt-4">
                  <Link
                    to={`/quizzes/${item.quiz.id}/take`}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Take Quiz
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
