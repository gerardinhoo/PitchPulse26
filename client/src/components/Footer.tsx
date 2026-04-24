import { Link } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/matches", label: "Matches" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-card)] mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-sm">
          {/* Left — Branding */}
          <div className="text-center md:text-left">
            <p className="font-bold text-base">
              <span className="text-[var(--color-accent)]">Pitch</span>Pulse 26
            </p>
            <p className="text-[var(--color-text-muted)] mt-1">
              Predict. Compete. Glory.
            </p>
          </div>

          {/* Center — Navigation */}
          <nav className="flex items-center gap-4">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-[var(--color-text-muted)] hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right — Credits */}
          <div className="text-center md:text-right">
            <p className="text-[var(--color-text-muted)] mt-1">Built by Gerard Eklu</p>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
          &copy; {new Date().getFullYear()} PitchPulse
        </p>
      </div>
    </footer>
  );
}
