import { Link, useNavigate } from "react-router-dom";
import { useCurrentUser, useLogout } from "../../api/auth";

export function Navbar() {
  const { data } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const user = data?.user;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate("/login"),
    });
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-gray-900">
            QuizApp
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/quizzes"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              My Quizzes
            </Link>
            <Link
              to="/results"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Results
            </Link>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm text-gray-700">{user.name || user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
