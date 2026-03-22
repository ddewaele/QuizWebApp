import { useCurrentUser, useLogout } from "../api/auth";
import { useNavigate } from "react-router-dom";

export function useAuth() {
  const { data, isLoading, error } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/login"),
    });
  };

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
    logout: handleLogout,
    isLoggingOut: logout.isPending,
  };
}
