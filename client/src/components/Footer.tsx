import { Link } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/matches", label: "Matches" },
  { to: "/leaderboard", label: "Leaderboard" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-card)] mt-auto">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-sm">
          {/* Left — Branding */}
          <div className="text-center md:text-left">
            <p className="font-bold text-base">
              <span className="text-[var(--color-accent)]">Pitch</span>Pulse 26
            </p>
            <p className="text-[var(--color-text-muted)] mt-1">
              Predict. Compete. Win.
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

          <div className="text-center md:text-right space-y-2">
            {/* Right — Credits */}
              {/* Instagram */}
              <a
                href="https://instagram.com/pitchpulse26"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-end gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
              >
                {/* Instagram SVG */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M7.75 2h8.5A5.76 5.76 0 0 1 22 7.75v8.5A5.76 5.76 0 0 1 16.25 22h-8.5A5.76 5.76 0 0 1 2 16.25v-8.5A5.76 5.76 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.25-2.4a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
                </svg>

                {/* Text */}
                <span className="text-xs">
                  Follow us @pitchpulse26
                </span>
              </a>

              {/* Credits */}
              <p className="text-[var(--color-text-muted)] text-xs">
                Built by Gerard Eklu
              </p>
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
