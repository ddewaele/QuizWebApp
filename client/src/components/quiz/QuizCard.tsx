import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Pencil,
  Info,
  Share2,
  Trash2,
  Download,
  Play,
  BookOpen,
  ClipboardList,
  Calendar,
} from "lucide-react";
import type { Quiz } from "../../types";
import { useDeleteQuiz } from "../../api/quizzes";
import { ShareDialog } from "./ShareDialog";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { AttemptStats } from "./AttemptStats";

interface QuizCardProps {
  quiz: Quiz;
}

export function QuizCard({ quiz }: QuizCardProps) {
  const questionCount = quiz._count?.questions ?? quiz.questions?.length ?? 0;
  const attemptCount = quiz._count?.attempts ?? 0;
  const [showShare, setShowShare] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteQuiz = useDeleteQuiz();
  const navigate = useNavigate();

  const handleExport = () => {
    window.open(`/api/quizzes/${quiz.id}/export`, "_blank");
  };

  const handleDelete = () => {
    deleteQuiz.mutate(quiz.id, {
      onSuccess: () => navigate("/quizzes"),
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
        {/* Card header accent */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />

        <div className="p-5">
          {/* Title + description */}
          <div className="mb-4">
            <Link
              to={`/quizzes/${quiz.id}`}
              className="text-base font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 leading-snug"
            >
              {quiz.title}
            </Link>
            {quiz.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {quiz.description}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-5">
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              {questionCount} questions
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {attemptCount} attempts
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(quiz.updatedAt).toLocaleDateString()}
            </span>
          </div>

          {/* Attempt stats */}
          {quiz.attempts && quiz.attempts.length > 0 && (
            <AttemptStats attempts={quiz.attempts} />
          )}

          {/* Actions */}
          <div className={`flex items-center justify-between ${quiz.attempts && quiz.attempts.length > 0 ? "mt-3" : ""}`}>
            {/* Primary CTA */}
            <Link
              to={`/quizzes/${quiz.id}/take`}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Take Quiz
            </Link>

            {/* Icon action buttons */}
            <div className="flex items-center gap-1">
              <Link
                to={`/quizzes/${quiz.id}/edit`}
                title="Edit"
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </Link>
              <Link
                to={`/quizzes/${quiz.id}`}
                title="Details"
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Info className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setShowShare(true)}
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
      </div>

      {showShare && (
        <ShareDialog quizId={quiz.id} onClose={() => setShowShare(false)} />
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
    </>
  );
}
