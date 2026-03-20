import { getScoreColor, getScoreBgColor } from "../../lib/utils";

interface ScoreDisplayProps {
  score: number;
  total: number;
  percentage: number;
}

export function ScoreDisplay({ score, total, percentage }: ScoreDisplayProps) {
  return (
    <div className={`rounded-lg border p-6 text-center ${getScoreBgColor(percentage)}`}>
      <p className={`text-5xl font-bold ${getScoreColor(percentage)}`}>{percentage.toFixed(0)}%</p>
      <p className="text-lg text-gray-700 mt-2">
        {score} out of {total} correct
      </p>
      <p className="text-sm text-gray-500 mt-1">
        {percentage >= 80
          ? "Great job!"
          : percentage >= 50
            ? "Not bad, keep practicing!"
            : "Keep studying, you'll get there!"}
      </p>
    </div>
  );
}
