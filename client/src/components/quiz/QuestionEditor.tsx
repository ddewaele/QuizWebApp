import type { QuizOption } from "../../types";

interface QuestionData {
  questionId: number;
  questionText: string;
  options: Record<string, QuizOption>;
  correctAnswer: string[];
}

interface QuestionEditorProps {
  index: number;
  question: QuestionData;
  onChange: (question: QuestionData) => void;
  onRemove: () => void;
}

const OPTION_KEYS = ["a", "b", "c", "d", "e", "f"];

export function QuestionEditor({
  index,
  question,
  onChange,
  onRemove,
}: QuestionEditorProps) {
  const optionEntries = Object.entries(question.options);
  const isMultiSelect = question.correctAnswer.length > 1;

  const updateField = <K extends keyof QuestionData>(
    key: K,
    value: QuestionData[K],
  ) => {
    onChange({ ...question, [key]: value });
  };

  const updateOption = (key: string, field: keyof QuizOption, value: string | boolean) => {
    const newOptions = { ...question.options };
    newOptions[key] = { ...newOptions[key], [field]: value };
    onChange({ ...question, options: newOptions });
  };

  const addOption = () => {
    const usedKeys = Object.keys(question.options);
    const nextKey = OPTION_KEYS.find((k) => !usedKeys.includes(k));
    if (!nextKey) return;

    const newOptions = {
      ...question.options,
      [nextKey]: { text: "", is_true: false, explanation: "" },
    };
    onChange({ ...question, options: newOptions });
  };

  const removeOption = (key: string) => {
    if (Object.keys(question.options).length <= 2) return;
    const newOptions = { ...question.options };
    delete newOptions[key];

    let newCorrect = question.correctAnswer.filter((k) => k !== key);
    if (newCorrect.length === 0) newCorrect = [Object.keys(newOptions)[0]];

    onChange({ ...question, options: newOptions, correctAnswer: newCorrect });
  };

  const toggleCorrect = (key: string) => {
    if (!isMultiSelect) {
      // Single-select: set this as the only correct answer
      const newOptions = { ...question.options };
      for (const k of Object.keys(newOptions)) {
        newOptions[k] = { ...newOptions[k], is_true: k === key };
      }
      onChange({ ...question, options: newOptions, correctAnswer: [key] });
    } else {
      // Multi-select: toggle in the array
      let newCorrect: string[];
      if (question.correctAnswer.includes(key)) {
        newCorrect = question.correctAnswer.filter((k) => k !== key);
        if (newCorrect.length === 0) return; // Must have at least one
      } else {
        newCorrect = [...question.correctAnswer, key];
      }

      const newOptions = { ...question.options };
      for (const k of Object.keys(newOptions)) {
        newOptions[k] = { ...newOptions[k], is_true: newCorrect.includes(k) };
      }
      onChange({ ...question, options: newOptions, correctAnswer: newCorrect });
    }
  };

  const toggleMultiSelect = () => {
    if (isMultiSelect) {
      // Switch to single-select: keep only first correct answer
      const newCorrect = [question.correctAnswer[0]];
      const newOptions = { ...question.options };
      for (const k of Object.keys(newOptions)) {
        newOptions[k] = { ...newOptions[k], is_true: newCorrect.includes(k) };
      }
      onChange({ ...question, options: newOptions, correctAnswer: newCorrect });
    }
    // Switching to multi-select doesn't change anything — just allow more toggles
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Question {index + 1}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMultiSelect}
            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            {isMultiSelect ? "Multiple select" : "Single select"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            Question Text
          </label>
          <textarea
            value={question.questionText}
            onChange={(e) => updateField("questionText", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-600">Options</label>
          {optionEntries.map(([key, opt]) => (
            <div key={key} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => toggleCorrect(key)}
                className={`mt-1.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                  question.correctAnswer.includes(key)
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 text-gray-400 hover:border-green-400"
                }`}
                title={question.correctAnswer.includes(key) ? "Correct answer" : "Mark as correct"}
              >
                {key}
              </button>
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => updateOption(key, "text", e.target.value)}
                  placeholder="Option text"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={opt.explanation}
                  onChange={(e) =>
                    updateOption(key, "explanation", e.target.value)
                  }
                  placeholder="Explanation"
                  className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {optionEntries.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(key)}
                  className="mt-1.5 text-gray-400 hover:text-red-500 text-sm"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
          {optionEntries.length < OPTION_KEYS.length && (
            <button
              type="button"
              onClick={addOption}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Add option
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export type { QuestionData };
