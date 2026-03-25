import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Pencil,
  Info,
  Share2,
  Trash2,
  Download,
  Play,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import type { Quiz, QuizAttemptSummary } from "../../types";
import { useDeleteQuiz } from "../../api/quizzes";
import { ShareDialog } from "./ShareDialog";
import { ConfirmDialog } from "../ui/ConfirmDialog";

function dotColor(pct: number) {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-400";
  return "bg-red-400";
}

function scoreColor(pct: number) {
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-500";
}

function InlineAttemptStats({ attempts }: { attempts: QuizAttemptSummary[] }) {
  const last = attempts[0].percentage;
  const dots = [...attempts].reverse();
  return (
    <div className="flex items-center gap-2">
      <span className={`font-medium ${scoreColor(last)}`}>
        {Math.round(last)}%
      </span>
      <div className="flex items-center gap-1">
        {dots.map((a, i) => (
          <div key={i} className="relative group">
            <div className={`w-2 h-2 rounded-full ${dotColor(a.percentage)}`} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                {Math.round(a.percentage)}%
                <span className="text-gray-400 ml-1">{new Date(a.completedAt).toLocaleDateString()}</span>
              </div>
              <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 mx-auto -mt-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface QuizListItemProps {
  quiz: Quiz;
}

export function QuizListItem({ quiz }: QuizListItemProps) {
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
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-4 hover:shadow-sm transition-shadow">
        {/* Color dot accent */}
        <div className="w-1 h-10 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500 flex-shrink-0" />

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <Link
            to={`/quizzes/${quiz.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block"
          >
            {quiz.title}
          </Link>
          {quiz.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {quiz.description}
            </p>
          )}
        </div>

        {/* Stats + attempt dots */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
          <span className="flex items-center gap-1">
            <ClipboardList className="w-3.5 h-3.5" />
            {questionCount}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {attemptCount}
          </span>
          {quiz.attempts && quiz.attempts.length > 0 && (
            <InlineAttemptStats attempts={quiz.attempts} />
          )}
          <span className="w-20 text-right">
            {new Date(quiz.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Link
            to={`/quizzes/${quiz.id}/take`}
            title="Take Quiz"
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
          </Link>
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
