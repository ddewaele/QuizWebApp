interface ScoreDisplayProps {
  score: number;
  total: number;
  percentage: number;
}

export function ScoreDisplay({ score, total, percentage }: ScoreDisplayProps) {
  const color =
    percentage >= 80
      ? "text-green-600"
      : percentage >= 50
        ? "text-amber-600"
        : "text-red-600";

  const bgColor =
    percentage >= 80
      ? "bg-green-50 border-green-200"
      : percentage >= 50
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  return (
    <div className={`rounded-lg border p-6 text-center ${bgColor}`}>
      <p className={`text-5xl font-bold ${color}`}>{percentage.toFixed(0)}%</p>
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
