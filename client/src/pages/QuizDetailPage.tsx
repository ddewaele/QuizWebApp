import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuiz, useDeleteQuiz } from "../api/quizzes";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ShareDialog } from "../components/quiz/ShareDialog";
import { useState } from "react";
import {
  Play,
  Pencil,
  Share2,
  Download,
  Trash2,
  ClipboardList,
  BookOpen,
  Calendar,
  ArrowLeft,
  Eye,
  EyeOff,
  MessageSquare,
} from "lucide-react";

export function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuiz(id!);
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

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
        <Link
          to="/quizzes"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to quizzes
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-gray-600 mt-1">{quiz.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                to={`/quizzes/${quiz.id}/take`}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                Take Quiz
              </Link>
              <div className="flex items-center gap-1">
                <Link
                  to={`/quizzes/${quiz.id}/edit`}
                  title="Edit"
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setShowShareDialog(true)}
                  title="Share"
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExport}
                  title="Export JSON"
                  className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete"
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              {quiz.questions.length} questions
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {quiz._count?.attempts ?? 0} attempts
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Created {new Date(quiz.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {showShareDialog && (
        <ShareDialog quizId={quiz.id} onClose={() => setShowShareDialog(false)} />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Quiz"
          message={`Are you sure you want to delete "${quiz.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          isDestructive
          isPending={deleteQuiz.isPending}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Questions preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnswers((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                showAnswers
                  ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {showAnswers ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
              {showAnswers ? "Hide answers" : "Show answers"}
            </button>
            <button
              onClick={() => setShowExplanations((v) => !v)}
              disabled={!showAnswers}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                showExplanations
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {showExplanations ? "Hide explanations" : "Show explanations"}
            </button>
          </div>
        </div>

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
                {q.correctAnswer.length > 1 && (
                  <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Multiple select
                  </span>
                )}
                <div className="mt-3 space-y-1.5">
                  {Object.entries(q.options).map(([key, opt]) => {
                    const isCorrect = opt.is_true;
                    const highlight = showAnswers && isCorrect;
                    return (
                      <div key={key}>
                        <div
                          className={`text-sm px-3 py-1.5 rounded border transition-colors ${
                            highlight
                              ? "bg-green-50 text-green-800 border-green-200"
                              : "bg-gray-50 text-gray-700 border-gray-100"
                          }`}
                        >
                          <span className="font-medium">{key}.</span> {opt.text}
                          {highlight && (
                            <span className="ml-2 text-xs text-green-600 font-medium">✓ correct</span>
                          )}
                        </div>
                        {showAnswers && showExplanations && opt.explanation && (
                          <p className="text-xs text-gray-500 mt-1 ml-3 italic">
                            {opt.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
