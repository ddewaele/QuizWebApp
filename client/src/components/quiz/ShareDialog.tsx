import { useState } from "react";
import {
  useQuizShares,
  useShareQuiz,
  useRevokeShare,
  useDeleteShare,
} from "../../api/sharing";
import { ApiError } from "../../api/client";

interface ShareDialogProps {
  quizId: string;
  onClose: () => void;
}

export function ShareDialog({ quizId, onClose }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [accessLevel, setAccessLevel] = useState<"TAKER" | "VIEWER">("TAKER");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { data, isLoading } = useQuizShares(quizId);
  const shareQuiz = useShareQuiz();
  const revokeShare = useRevokeShare();
  const deleteShare = useDeleteShare();

  const shares = data?.shares ?? [];

  const handleShare = () => {
    if (!email.trim()) return;
    setFeedback(null);
    shareQuiz.mutate(
      { quizId, email: email.trim(), accessLevel },
      {
        onSuccess: () => {
          setEmail("");
          setFeedback({ type: "success", message: "Invitation sent!" });
        },
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : "Failed to share quiz";
          setFeedback({ type: "error", message });
        },
      },
    );
  };

  const handleRevoke = (shareId: string) => {
    revokeShare.mutate(
      { quizId, shareId },
      {
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : "Failed to revoke share";
          setFeedback({ type: "error", message });
        },
      },
    );
  };

  const handleDelete = (shareId: string) => {
    deleteShare.mutate(
      { quizId, shareId },
      {
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : "Failed to remove share";
          setFeedback({ type: "error", message });
        },
      },
    );
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-block text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case "ACCEPTED":
        return (
          <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
            Accepted
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-block text-xs px-2 py-0.5 rounded bg-red-100 text-red-800">
            Revoked
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Share Quiz
        </h2>

        {/* Share form */}
        <div className="space-y-3 mb-4">
          <div>
            <label
              htmlFor="share-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email address
            </label>
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleShare();
              }}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={accessLevel}
              onChange={(e) =>
                setAccessLevel(e.target.value as "TAKER" | "VIEWER")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="TAKER">Taker</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button
              onClick={handleShare}
              disabled={shareQuiz.isPending || !email.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {shareQuiz.isPending ? "Sharing..." : "Share"}
            </button>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`text-sm px-3 py-2 rounded-lg mb-4 ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Shares list */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Current shares
          </h3>
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : shares.length === 0 ? (
            <p className="text-sm text-gray-500">
              No shares yet. Invite someone above.
            </p>
          ) : (
            <div className="space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {share.email}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {statusBadge(share.status)}
                      <span className="text-xs text-gray-500">
                        {share.accessLevel.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  {share.status !== "REVOKED" ? (
                    <button
                      onClick={() => handleRevoke(share.id)}
                      disabled={revokeShare.isPending}
                      className="text-xs text-red-600 hover:text-red-700 font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(share.id)}
                      disabled={deleteShare.isPending}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium whitespace-nowrap disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
