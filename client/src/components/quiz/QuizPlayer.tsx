import { useState } from "react";
import type { QuizQuestion } from "../../types";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, string[]>) => void;
  isSubmitting: boolean;
}

export function QuizPlayer({ questions, onSubmit, isSubmitting }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [showConfirm, setShowConfirm] = useState(false);

  const question = questions[currentIndex];
  const selectedKeys = answers[question.id] ?? [];
  const isMultiSelect = question.correctAnswer.length > 1;
  const totalAnswered = Object.keys(answers).length;
  const allAnswered = totalAnswered === questions.length;

  const toggleOption = (key: string) => {
    if (isMultiSelect) {
      const current = answers[question.id] ?? [];
      const updated = current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key];
      setAnswers({ ...answers, [question.id]: updated });
    } else {
      setAnswers({ ...answers, [question.id]: [key] });
    }
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    onSubmit(answers);
  };

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>{totalAnswered} answered</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
            {currentIndex + 1}
          </span>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {question.questionText}
            </p>
            {isMultiSelect && (
              <p className="text-sm text-blue-600 mt-1">
                Select all that apply
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2 ml-11">
          {Object.entries(question.options).map(([key, opt]) => {
            const isSelected = selectedKeys.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleOption(key)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300 text-gray-700"
                }`}
              >
                <span className="font-medium mr-2">{key.toUpperCase()}.</span>
                {opt.text}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question navigator dots */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {questions.map((q, i) => {
          const hasAnswer = !!answers[q.id]?.length;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                isCurrent
                  ? "bg-blue-600 text-white"
                  : hasAnswer
                    ? "bg-green-100 text-green-700 border border-green-300"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Previous
        </button>

        <div className="flex gap-2">
          {currentIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!allAnswered}
              className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Submit Quiz
            </button>
          )}
        </div>
      </div>

      {!allAnswered && currentIndex === questions.length - 1 && (
        <p className="text-center text-sm text-amber-600 mt-3">
          Answer all questions before submitting ({questions.length - totalAnswered} remaining)
        </p>
      )}

      {showConfirm && (
        <ConfirmDialog
          title="Submit Quiz?"
          message={`You have answered ${totalAnswered} of ${questions.length} questions. This action cannot be undone.`}
          confirmLabel="Confirm Submit"
          cancelLabel="Review Answers"
          isPending={isSubmitting}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
