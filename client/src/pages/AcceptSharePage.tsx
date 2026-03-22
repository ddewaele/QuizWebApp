import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAcceptShare } from "../api/sharing";
import { ApiError } from "../api/client";

export function AcceptSharePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const acceptShare = useAcceptShare();
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    acceptShare.mutate(token, {
      onSuccess: (data) => {
        navigate(`/quizzes/${data.quizId}/take`, { replace: true });
      },
    });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 max-w-md mx-auto">
          Invalid invitation link. No token provided.
        </div>
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (acceptShare.isPending) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Accepting invitation...</p>
      </div>
    );
  }

  if (acceptShare.isError) {
    const message =
      acceptShare.error instanceof ApiError
        ? acceptShare.error.message
        : "Failed to accept invitation";

    return (
      <div className="text-center py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 max-w-md mx-auto">
          {message}
        </div>
        <Link to="/" className="text-sm text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Go to dashboard
        </Link>
      </div>
    );
  }

  return null;
}
