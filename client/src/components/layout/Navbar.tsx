import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Navbar() {
  const { user, logout, isLoggingOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-bold text-gray-900">
            QuizApp
          </Link>
          <div className="hidden md:flex items-center gap-4">
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

        <div className="hidden md:flex items-center gap-4">
          {user && (
            <>
              <div className="flex items-center gap-2">
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="text-sm text-gray-700">
                  {user.name || user.email}
                </span>
              </div>
              <button
                onClick={logout}
                disabled={isLoggingOut}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                Sign out
              </button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-600"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          <Link
            to="/quizzes"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-gray-700 py-2"
          >
            My Quizzes
          </Link>
          <Link
            to="/results"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-gray-700 py-2"
          >
            Results
          </Link>
          {user && (
            <div className="border-t border-gray-100 pt-2 mt-2">
              <p className="text-sm text-gray-500 py-1">
                {user.name || user.email}
              </p>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                disabled={isLoggingOut}
                className="text-sm text-gray-500 hover:text-gray-700 py-1"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
