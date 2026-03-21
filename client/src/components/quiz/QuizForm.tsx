import { useState } from "react";
import { QuestionEditor, type QuestionData } from "./QuestionEditor";

interface QuizFormProps {
  initialTitle?: string;
  initialDescription?: string;
  initialQuestions?: QuestionData[];
  onSubmit: (data: {
    title: string;
    description?: string;
    questions: QuestionData[];
  }) => void;
  isSubmitting: boolean;
  submitLabel: string;
}

function createEmptyQuestion(id: number): QuestionData {
  return {
    questionId: id,
    questionText: "",
    options: {
      a: { text: "", is_true: true, explanation: "" },
      b: { text: "", is_true: false, explanation: "" },
    },
    correctAnswer: ["a"],
  };
}

export function QuizForm({
  initialTitle = "",
  initialDescription = "",
  initialQuestions,
  onSubmit,
  isSubmitting,
  submitLabel,
}: QuizFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [questions, setQuestions] = useState<QuestionData[]>(
    initialQuestions ?? [createEmptyQuestion(1)],
  );
  const [errors, setErrors] = useState<string[]>([]);

  const addQuestion = () => {
    const maxId = Math.max(0, ...questions.map((q) => q.questionId));
    setQuestions([...questions, createEmptyQuestion(maxId + 1)]);
  };

  const updateQuestion = (index: number, question: QuestionData) => {
    const updated = [...questions];
    updated[index] = question;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!title.trim()) errs.push("Title is required");

    questions.forEach((q, i) => {
      if (!q.questionText.trim())
        errs.push(`Question ${i + 1}: text is required`);

      const opts = Object.entries(q.options);
      if (opts.length < 2) errs.push(`Question ${i + 1}: at least 2 options`);

      for (const [key, opt] of opts) {
        if (!opt.text.trim())
          errs.push(`Question ${i + 1}, option ${key}: text is required`);
        if (!opt.explanation.trim())
          errs.push(`Question ${i + 1}, option ${key}: explanation is required`);
      }
    });

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      questions,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800 mb-1">
            Please fix the following:
          </p>
          <ul className="text-sm text-red-700 list-disc list-inside">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="My Quiz"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
          placeholder="A brief description..."
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
          <button
            type="button"
            onClick={addQuestion}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Question
          </button>
        </div>

        {questions.map((q, i) => (
          <QuestionEditor
            key={q.questionId}
            index={i}
            question={q}
            onChange={(updated) => updateQuestion(i, updated)}
            onRemove={() => removeQuestion(i)}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
