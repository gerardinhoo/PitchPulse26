import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import trophyBg from "../assets/trophy-bg.jpg";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in -mx-4 -mt-8">
      {/* Hero Section */}
      <section
        className="relative flex items-center justify-center text-center"
        style={{ minHeight: "calc(100vh - 3.5rem)" }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${trophyBg})` }}
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Content */}
        <div className="relative z-10 max-w-2xl px-6">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4 animate-slide-up">
            Predict. Compete.{" "}
            <span className="text-[var(--color-accent)]">Win.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[var(--color-text-muted)] mb-8 animate-slide-up" style={{ animationDelay: "100ms" }}>
            Pick your scores for every group stage of World Cup 2026 match. Climb the
            leaderboard. Prove you can accurately predict football scores better than everyone else.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Link
              to={user ? "/matches" : "/register"}
              className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-white font-semibold text-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-lg shadow-emerald-900/30"
            >
              {user ? "View Matches" : "Start Predicting"}
            </Link>
            <Link
              to="/leaderboard"
              className="px-6 py-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] font-medium hover:text-white hover:border-white/30 transition-colors"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto stagger-children">
          <div className="card text-center">
            <div className="text-3xl mb-3">🏟️</div>
            <h3 className="font-semibold mb-1">Pick Your Scores</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Predict the final score for every group stage match.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">⚽</div>
            <h3 className="font-semibold mb-1">Earn Points</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              3 points for the exact score.
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              1 point for the correct winner or draw.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold mb-1">Climb the Ranks</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Compete against other fans on the global leaderboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
