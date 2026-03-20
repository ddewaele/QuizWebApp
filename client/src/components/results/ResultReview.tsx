import type { QuizAttemptAnswer } from "../../types";

interface ResultReviewProps {
  answers: QuizAttemptAnswer[];
}

export function ResultReview({ answers }: ResultReviewProps) {
  return (
    <div className="space-y-4">
      {answers.map((answer, i) => {
        const q = answer.question;
        const correctKeys = Array.isArray(q.correctAnswer)
          ? q.correctAnswer
          : [q.correctAnswer];

        return (
          <div
            key={answer.id}
            className={`bg-white rounded-lg border p-4 ${
              answer.isCorrect ? "border-green-200" : "border-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  answer.isCorrect
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
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
                  {Object.entries(q.options).map(([key, opt]) => {
                    const wasSelected = (answer.selectedKeys as string[]).includes(key);
                    const isCorrectOption = correctKeys.includes(key);

                    let style = "bg-gray-50 text-gray-700 border-gray-100";
                    if (wasSelected && isCorrectOption) {
                      style = "bg-green-50 text-green-800 border-green-200";
                    } else if (wasSelected && !isCorrectOption) {
                      style = "bg-red-50 text-red-800 border-red-200";
                    } else if (!wasSelected && isCorrectOption) {
                      style =
                        "bg-green-50/50 text-green-700 border-green-200 border-dashed";
                    }

                    return (
                      <div
                        key={key}
                        className={`text-sm px-3 py-2 rounded border ${style}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            <span className="font-medium">{key}.</span>{" "}
                            {opt.text}
                            {wasSelected && (
                              <span className="ml-2 text-xs opacity-70">
                                (your answer)
                              </span>
                            )}
                            {isCorrectOption && !wasSelected && (
                              <span className="ml-2 text-xs opacity-70">
                                (correct)
                              </span>
                            )}
                          </span>
                        </div>
                        <p className="text-xs mt-1 opacity-75">
                          {opt.explanation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
