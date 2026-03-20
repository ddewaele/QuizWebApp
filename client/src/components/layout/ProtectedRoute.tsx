import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../../api/auth";

export function ProtectedRoute() {
  const { data, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!data?.user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
