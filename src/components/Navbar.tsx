"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // We use an effect to read from localStorage so it runs on the client
  useEffect(() => {
    const loadUser = () => {
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          console.error("Invalid user data");
        }
      } else {
        setUser(null);
      }
    };

    loadUser();

    // Listen for storage changes in case they log in on another tab
    window.addEventListener("storage", loadUser);

    // Custom event to update navbar immediately after login without refresh
    window.addEventListener("auth_changed", loadUser);

    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener("auth_changed", loadUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("session_token");
    setUser(null);
    window.dispatchEvent(new Event("auth_changed"));
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-lg bg-konmik-dark/90 border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 text-konmik-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span className="font-display font-black text-xl text-konmik-primary tracking-tight">
            KonMik
          </span>
        </Link>

        {/* Right: User Area (Top Komik + Matchmaking + Profile) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Top Komik — always visible */}
          <Link
            href="/explore"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/[0.08] px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 4h2a2 2 0 012 2v1c0 3.866-3.134 7-7 7S6 10.866 6 7V6a2 2 0 012-2h2m-2 0V3m8 1V3m-4 11v3m-3 3h6"
              />
            </svg>
            <span className="hidden sm:inline">Top Komik</span>
          </Link>

          {user ? (
            <>
              {/* Matchmaking / Dashboard link */}
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                <span className="hidden sm:inline">Matchmaking</span>
              </Link>

              {/* Profile Link */}
              <Link
                href="/profile"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full border border-konmik-primary/50 overflow-hidden bg-konmik-card flex items-center justify-center">
                  {user.profile_url ? (
                    <img
                      src={user.profile_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-konmik-primary font-bold text-xs">
                      {user.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-200">
                  {user.display_name || user.username}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </>
          ) : (
            <Link
              href="/"
              className="text-sm font-semibold bg-konmik-primary/15 hover:bg-konmik-primary/25 border border-konmik-primary/30 text-konmik-primary px-4 py-2 rounded-xl transition-all"
            >
              Masuk
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
