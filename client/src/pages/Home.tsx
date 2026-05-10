import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import heroBgFallback from "../assets/custom-trophy-bg.jpg";
import heroBgDesktop from "../assets/custom-trophy-bg-1600.webp";
import heroBgMobile from "../assets/custom-trophy-bg-960.webp";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in -mx-4 -mt-8">
      {/* Hero Section */}
      <section
        className="relative flex items-center justify-center text-center"
        style={{ minHeight: "calc(100vh - 3.5rem)" }}
      >
        <picture className="absolute inset-0 pointer-events-none">
          <source
            srcSet={`${heroBgMobile} 960w, ${heroBgDesktop} 1600w`}
            sizes="100vw"
            type="image/webp"
          />
          <img
            src={heroBgFallback}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-[42%_center] sm:object-center"
            loading="eager"
            decoding="async"
          />
        </picture>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,4,0.78)_0%,rgba(3,5,4,0.58)_24%,rgba(3,5,4,0.72)_60%,rgba(3,5,4,0.9)_100%)] sm:bg-[radial-gradient(circle_at_center,rgba(8,12,10,0.22),rgba(3,5,4,0.88))] pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 max-w-2xl px-6">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-4 animate-slide-up">
            Predict. Compete.{" "}
            <span className="text-[var(--color-accent)]">Win.</span>
          </h1>
          <p
            className="mx-auto mb-8 max-w-xl animate-slide-up text-base leading-8 text-white/88 drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-lg sm:leading-8 sm:text-white/82 sm:drop-shadow-[0_2px_14px_rgba(0,0,0,0.35)]"
            style={{ animationDelay: "100ms" }}
          >
            Predict the score for every World Cup 2026 group-stage match, climb the leaderboard,
            and prove your football instincts against other fans.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
            <Link
              to={user ? "/matches" : "/register"}
              className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-white font-semibold text-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-lg shadow-emerald-900/30 btn-glow"
            >
              {user ? "View Matches" : "Start Predicting"}
            </Link>
            <Link
              to="/leaderboard"
              className="px-6 py-3 rounded-lg border border-white/20 bg-black/25 text-white/90 font-medium hover:bg-black/35 hover:text-white hover:border-white/35 transition-colors shadow-sm"
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
              Make your picks for every World Cup 2026 group-stage match.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">⚽</div>
            <h3 className="font-semibold mb-1">Earn Points</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Score 3 points for an exact result and 1 point for the correct winner or draw.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold mb-1">Climb the Ranks</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              See how your predictions stack up against other fans on the leaderboard.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
