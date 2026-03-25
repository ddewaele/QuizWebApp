import type { QuizAttemptSummary } from "../../types";

interface AttemptStatsProps {
  attempts: QuizAttemptSummary[];
}

function scoreColor(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-400";
  return "bg-red-400";
}

function scoreTextColor(pct: number): string {
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-500";
}

function scoreLabel(pct: number): string {
  if (pct >= 80) return "text-green-600 bg-green-50";
  if (pct >= 60) return "text-yellow-700 bg-yellow-50";
  return "text-red-600 bg-red-50";
}

export function AttemptStats({ attempts }: AttemptStatsProps) {
  if (attempts.length === 0) return null;

  const best = Math.max(...attempts.map((a) => a.percentage));
  const last = attempts[0].percentage;
  const avg = Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length);

  // Dots are shown oldest→newest (left to right)
  const dots = [...attempts].reverse();

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      {/* Score summary */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className={`px-2 py-0.5 rounded-full font-medium ${scoreLabel(last)}`}>
          Last: {Math.round(last)}%
        </span>
        <span className={`px-2 py-0.5 rounded-full font-medium ${scoreLabel(best)}`}>
          Best: {Math.round(best)}%
        </span>
        <span className="px-2 py-0.5 rounded-full font-medium text-gray-600 bg-gray-100">
          Avg: {avg}%
        </span>
      </div>

      {/* Dot sparkline */}
      <div className="flex items-center gap-1.5" title="Recent attempts (oldest → newest)">
        {dots.map((a, i) => (
          <div
            key={i}
            className="relative group"
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${scoreColor(a.percentage)} cursor-default`}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                <span className={scoreTextColor(a.percentage).replace("text-", "text-")}>
                  {Math.round(a.percentage)}%
                </span>
                <span className="text-gray-400 ml-1">
                  {new Date(a.completedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="w-1.5 h-1.5 bg-gray-900 rotate-45 mx-auto -mt-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
