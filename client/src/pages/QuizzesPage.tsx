import { useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, List, Plus, Upload } from "lucide-react";
import { useQuizzes } from "../api/quizzes";
import { QuizCard } from "../components/quiz/QuizCard";
import { QuizListItem } from "../components/quiz/QuizListItem";

type Layout = "card" | "list";

function getInitialLayout(): Layout {
  return (localStorage.getItem("quizzes-layout") as Layout) ?? "card";
}

export function QuizzesPage() {
  const { data, isLoading, error } = useQuizzes();
  const [layout, setLayout] = useState<Layout>(getInitialLayout);

  const setLayoutAndPersist = (l: Layout) => {
    setLayout(l);
    localStorage.setItem("quizzes-layout", l);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Quizzes</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">
              {data.quizzes.length} {data.quizzes.length === 1 ? "quiz" : "quizzes"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Layout toggle */}
          {data && data.quizzes.length > 0 && (
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
              <button
                onClick={() => setLayoutAndPersist("card")}
                title="Card layout"
                className={`p-1.5 rounded-md transition-colors ${
                  layout === "card"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutAndPersist("list")}
                title="List layout"
                className={`p-1.5 rounded-md transition-colors ${
                  layout === "list"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}

          <Link
            to="/quizzes/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Quiz
          </Link>
          <Link
            to="/quizzes/upload"
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload JSON
          </Link>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500 py-8">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Loading quizzes...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to load quizzes. Please try again.
        </div>
      )}

      {/* Empty state */}
      {data && data.quizzes.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <LayoutGrid className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-gray-900 font-medium mb-1">No quizzes yet</p>
          <p className="text-sm text-gray-500 mb-5">
            Create your first quiz or upload a JSON file to get started.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/quizzes/new"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Quiz
            </Link>
            <Link
              to="/quizzes/upload"
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload JSON
            </Link>
          </div>
        </div>
      )}

      {/* Quiz list */}
      {data && data.quizzes.length > 0 && (
        layout === "card" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.quizzes.map((quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {data.quizzes.map((quiz) => (
              <QuizListItem key={quiz.id} quiz={quiz} />
            ))}
          </div>
        )
      )}
    </div>
  );
}
