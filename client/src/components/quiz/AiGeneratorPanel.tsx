import { useState } from "react";
import { streamGenerateQuiz, useSuggestChips } from "../../api/quizzes";
import type { QuestionData } from "./QuestionEditor";

interface AiGeneratorPanelProps {
  title: string;
  description: string;
  onGenerated: (questions: QuestionData[]) => void;
}

const DEFAULT_CHIPS: { label: string; insert: string }[] = [
  { label: "5 questions",      insert: "Generate 5 questions." },
  { label: "10 questions",     insert: "Generate 10 questions." },
  { label: "Easy",             insert: "Difficulty: easy." },
  { label: "Medium",           insert: "Difficulty: medium." },
  { label: "Hard",             insert: "Difficulty: hard." },
  { label: "Mixed difficulty", insert: "Use a mix of easy, medium, and hard questions." },
];

export function AiGeneratorPanel({ title, description, onGenerated }: AiGeneratorPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [suggestedChips, setSuggestedChips] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const suggestChips = useSuggestChips();

  const titleMissing = !title.trim();

  const appendChip = (insert: string) => {
    setPrompt((prev) => {
      const base = prev.trim();
      return base ? `${base} ${insert}` : insert;
    });
  };

  const handleSuggest = () => {
    suggestChips.mutate(
      { title, description: description || undefined },
      { onSuccess: (data) => setSuggestedChips(data.chips) },
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    setStatusMessage("Starting…");

    await streamGenerateQuiz(
      { title, description: description || undefined, prompt },
      (message) => setStatusMessage(message),
      (questions) => {
        setIsGenerating(false);
        setStatusMessage(null);
        onGenerated(questions as QuestionData[]);
      },
      (message) => {
        setIsGenerating(false);
        setStatusMessage(null);
        setGenerateError(message);
      },
    );
  };

  return (
    <div className="space-y-5">
      {titleMissing && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Enter a quiz title above before generating questions.
        </p>
      )}

      {/* Prompt textarea */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Describe your quiz
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          disabled={isGenerating}
          placeholder={`Example: "Generate 10 medium-difficulty questions about Docker networking for intermediate DevOps engineers. Use scenario-based questions and focus on common mistakes."`}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
        />
      </div>

      {/* Default chips */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Quick adds:</p>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={isGenerating}
              onClick={() => appendChip(chip.insert)}
              className="px-2.5 py-1 text-xs rounded-full border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-40 transition-colors"
            >
              + {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI-suggested chips */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs font-medium text-gray-500">Suggestions for this quiz:</p>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={titleMissing || suggestChips.isPending || isGenerating}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            {suggestChips.isPending ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>✦ {suggestedChips.length > 0 ? "Regenerate suggestions" : "Suggest for this quiz"}</>
            )}
          </button>
        </div>

        {suggestChips.error && (
          <p className="text-xs text-red-600 mb-2">{suggestChips.error.message}</p>
        )}

        {suggestedChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestedChips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={isGenerating}
                onClick={() => appendChip(chip)}
                className="px-2.5 py-1 text-xs rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
              >
                + {chip}
              </button>
            ))}
          </div>
        ) : (
          !suggestChips.isPending && (
            <p className="text-xs text-gray-400 italic">
              Click "Suggest for this quiz" to get topic-specific prompt ideas based on your title and description.
            </p>
          )
        )}
      </div>

      {/* Generation error */}
      {generateError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {generateError}
        </p>
      )}

      {/* Generate button / live status */}
      {isGenerating ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 border border-purple-200 rounded-lg">
          <svg className="animate-spin w-5 h-5 text-purple-600 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm text-purple-800 font-medium">{statusMessage}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!prompt.trim() || titleMissing}
          className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          Generate Questions
        </button>
      )}
    </div>
  );
}
