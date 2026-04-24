import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/matches", label: "Matches" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/groups", label: "Groups" }
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(location.pathname);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Close on route change — adjust state during render instead of in an effect
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (menuOpen) setMenuOpen(false);
  }

  // Close on outside tap / click
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  const linkClasses = (to: string) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      location.pathname === to
        ? "bg-[var(--color-accent)] text-white"
        : "text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-card)]"
    }`;

  const mobileLinkClasses = (to: string) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      location.pathname === to
        ? "bg-[var(--color-accent)] text-white"
        : "text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-card)]"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-lg font-bold tracking-tight">
          <span className="text-[var(--color-accent)]">Pitch</span>Pulse 26
        </Link>

        {/* Center links (desktop) */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className={linkClasses(to)}>
              {label}
            </Link>
          ))}

          {user?.role === "admin" && (
            <Link to="/admin/results" className={linkClasses("/admin/results")}>
              Admin
            </Link>
          )}
        </div>

        {/* Auth actions (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-[var(--color-text-muted)] hidden sm:inline">
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex text-sm px-3 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent)] transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex text-sm px-3 py-1.5 rounded-md text-[var(--color-text-muted)] hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="hidden sm:inline-flex text-sm px-3 py-1.5 rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Hamburger button (mobile only) */}
          <button
            ref={buttonRef}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent)] transition-colors"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      <div
        id="mobile-menu"
        ref={menuRef}
        className={`sm:hidden overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur transition-[max-height,opacity] duration-300 ease-out ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={mobileLinkClasses(to)}
            >
              {label}
            </Link>
          ))}

          {user?.role === "admin" && (
            <Link
              to="/admin/results"
              onClick={() => setMenuOpen(false)}
              className={mobileLinkClasses("/admin/results")}
            >
              Admin
            </Link>
          )}

          <div className="border-t border-[var(--color-border)] my-2" />

          {user ? (
            <>
              <span className="px-3 py-1 text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                {user.displayName || user.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-left px-3 py-2 rounded-md text-sm font-medium text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-card)] transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-center border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent)] transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-center bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
