import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuiz, useDeleteQuiz } from "../api/quizzes";
import { useState } from "react";

export function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuiz(id!);
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) return <p className="text-gray-500">Loading quiz...</p>;
  if (error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        Failed to load quiz.
      </div>
    );
  if (!data) return null;

  const quiz = data.quiz;

  const handleDelete = () => {
    deleteQuiz.mutate(quiz.id, {
      onSuccess: () => navigate("/quizzes"),
    });
  };

  const handleExport = () => {
    window.open(`/api/quizzes/${quiz.id}/export`, "_blank");
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/quizzes" className="text-sm text-blue-600 hover:text-blue-700">
          &larr; Back to quizzes
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-gray-600 mt-1">{quiz.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to={`/quizzes/${quiz.id}/take`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Take Quiz
            </Link>
            <Link
              to={`/quizzes/${quiz.id}/edit`}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="flex gap-4 text-sm text-gray-500">
          <span>{quiz.questions.length} questions</span>
          <span>{quiz._count?.attempts ?? 0} attempts</span>
          <span>Created {new Date(quiz.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Quiz
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete &ldquo;{quiz.title}&rdquo;? This
              action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteQuiz.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteQuiz.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions preview */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
        {quiz.questions.map((q, i) => (
          <div
            key={q.id}
            className="bg-white rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{q.questionText}</p>
                {q.questionType === "multiple_select" && (
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Multiple select
                  </span>
                )}
                <div className="mt-3 space-y-1.5">
                  {Object.entries(q.options).map(([key, opt]) => (
                    <div
                      key={key}
                      className={`text-sm px-3 py-1.5 rounded ${
                        opt.is_true
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-gray-50 text-gray-700 border border-gray-100"
                      }`}
                    >
                      <span className="font-medium">{key}.</span> {opt.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
