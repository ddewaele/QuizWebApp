import { useState } from "react";
import type { QuizQuestion } from "../../types";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { QuestionChat } from "./QuestionChat";

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, string[]>, onError: () => void) => void;
  isSubmitting: boolean;
}

export function QuizPlayer({ questions, onSubmit, isSubmitting }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [hintedQuestions, setHintedQuestions] = useState<Set<string>>(new Set());
  const [chatOpen, setChatOpen] = useState(false);

  const question = questions[currentIndex];
  const selectedKeys = answers[question.id] ?? [];
  const isMultiSelect = question.correctAnswer.length > 1;
  const totalAnswered = Object.keys(answers).length;
  const allAnswered = totalAnswered === questions.length;

  const isChecked = checkedQuestions.has(question.id);
  const isHinted = hintedQuestions.has(question.id);

  const isAnswerCorrect =
    selectedKeys.length === question.correctAnswer.length &&
    selectedKeys.every((k) => question.correctAnswer.includes(k));

  const toggleOption = (key: string) => {
    // Clear check state when user changes their selection
    if (isChecked) {
      setCheckedQuestions((prev) => {
        const next = new Set(prev);
        next.delete(question.id);
        return next;
      });
    }
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

  const toggleCheck = () => {
    setCheckedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) {
        next.delete(question.id);
      } else {
        next.add(question.id);
      }
      return next;
    });
  };

  const toggleHints = () => {
    setHintedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) {
        next.delete(question.id);
      } else {
        next.add(question.id);
      }
      return next;
    });
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
    onSubmit(answers, () => setShowConfirm(false));
  };

  const getOptionStyle = (key: string, isTrue: boolean) => {
    const isSelected = selectedKeys.includes(key);

    if (isChecked && isSelected) {
      return isTrue
        ? "border-green-500 bg-green-50 text-green-900"
        : "border-red-400 bg-red-50 text-red-900";
    }

    if (isSelected) {
      return "border-blue-500 bg-blue-50 text-blue-900";
    }
    return "border-gray-200 hover:border-gray-300 text-gray-700";
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
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
              {currentIndex + 1}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex === questions.length - 1}
              className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
            const showBadge = isHinted || (isChecked && isSelected);
            const showExplanation = isHinted || (isChecked && isSelected);

            const badge = isHinted
              ? { label: opt.is_true ? "✓ Correct" : "✗ Wrong", className: opt.is_true ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700" }
              : isChecked && isSelected
                ? { label: opt.is_true ? "✓ Correct" : "✗ Wrong", className: opt.is_true ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700" }
                : null;

            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleOption(key)}
                className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${getOptionStyle(key, opt.is_true)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span>
                    <span className="font-medium mr-2">{key.toUpperCase()}.</span>
                    {opt.text}
                  </span>
                  {showBadge && badge && (
                    <span className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                {showExplanation && opt.explanation && (
                  <p className="text-xs mt-2 opacity-75 font-normal">
                    {opt.explanation}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Check answer result banner */}
        {isChecked && (
          <div className={`mt-4 ml-11 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
            isAnswerCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}>
            {isAnswerCorrect ? (
              <>
                <span className="text-lg">✓</span>
                Correct! Well done.
              </>
            ) : (
              <>
                <span className="text-lg">✗</span>
                Incorrect. Try again or use Show Hints to see the correct answer.
              </>
            )}
          </div>
        )}

        {/* Check Answer / Show Hints buttons */}
        <div className="flex gap-2 mt-4 ml-11">
          <button
            type="button"
            onClick={toggleCheck}
            disabled={selectedKeys.length === 0}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40 ${
              isChecked
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
            }`}
          >
            {isChecked ? "Hide Answer" : "Check Answer"}
          </button>
          <button
            type="button"
            onClick={toggleHints}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isHinted
                ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600"
                : "bg-white text-amber-600 border-amber-300 hover:bg-amber-50"
            }`}
          >
            {isHinted ? "Hide Hints" : "Show Hints"}
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              chatOpen
                ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                : "bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask AI
          </button>
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

      {chatOpen && (
        <QuestionChat
          question={question}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
