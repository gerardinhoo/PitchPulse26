import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import heroBgDesktop from "../assets/custom-trophy-bg-1600.webp";
import heroBgFallback from "../assets/custom-trophy-bg.jpg";

function formatCountdownParts(distanceMs: number) {
  if (distanceMs <= 0) {
    return [
      { label: "Days", value: "00" },
      { label: "Hours", value: "00" },
      { label: "Minutes", value: "00" },
      { label: "Seconds", value: "00" },
    ];
  }

  const totalSeconds = Math.floor(distanceMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "Days", value: String(days).padStart(2, "0") },
    { label: "Hours", value: String(hours).padStart(2, "0") },
    { label: "Minutes", value: String(minutes).padStart(2, "0") },
    { label: "Seconds", value: String(seconds).padStart(2, "0") },
  ];
}

function formatKickoffLabel(isoDate: string | null) {
  if (!isoDate) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

export default function Home() {
  const { user } = useAuth();
  const [kickoffIso, setKickoffIso] = useState<string | null>(null);
  const [countdownParts, setCountdownParts] = useState(() =>
    formatCountdownParts(0),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadKickoff() {
      try {
        const response = await api.get("/matches", {
          params: { page: 1, limit: 1 },
        });
        const firstMatchDate = response.data?.data?.[0]?.date ?? null;

        if (!cancelled && firstMatchDate) {
          setKickoffIso(firstMatchDate);
        }
      } catch {
        // Keep the homepage resilient even if the schedule endpoint is unavailable.
      }
    }

    loadKickoff();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!kickoffIso) {
      return undefined;
    }

    const updateCountdown = () => {
      const distanceMs = new Date(kickoffIso).getTime() - Date.now();
      setCountdownParts(formatCountdownParts(distanceMs));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [kickoffIso]);

  const kickoffLabel = formatKickoffLabel(kickoffIso);

  return (
    <div className="animate-fade-in -mx-4 -mt-8">
      {/* Hero Section */}
      <section
        className="relative flex items-center justify-center text-center"
        style={{ minHeight: "calc(100vh - 3.5rem)" }}
      >
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,#0b120f_0%,#101915_40%,#0d1511_100%)] sm:hidden" />
        <picture className="absolute inset-0 pointer-events-none hidden sm:block">
          <source srcSet={heroBgDesktop} type="image/webp" />
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,4,0.64)_0%,rgba(3,5,4,0.42)_24%,rgba(3,5,4,0.5)_58%,rgba(3,5,4,0.78)_100%)] sm:bg-[radial-gradient(circle_at_center,rgba(8,12,10,0.32),rgba(3,5,4,0.9))] pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(0deg,rgba(7,24,14,0.2)_0%,rgba(7,24,14,0.02)_45%,rgba(7,24,14,0)_100%)] sm:bg-[radial-gradient(circle_at_38%_42%,rgba(204,164,74,0.22)_0%,rgba(204,164,74,0.12)_16%,rgba(204,164,74,0)_34%)] sm:opacity-80" />

        {/* Content */}
        <div className="relative z-10 max-w-3xl px-3 sm:px-6">
          <div className="rounded-[2rem] border border-white/8 bg-[rgba(7,12,14,0.12)] px-4 py-6 shadow-[0_28px_70px_rgba(0,0,0,0.22)] backdrop-blur-[1px] sm:bg-[rgba(7,12,14,0.16)] sm:px-10 sm:py-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/90 animate-slide-up sm:text-xs">
              Free Fan Challenge
            </div>
            <h1 className="mb-4 animate-slide-up text-4xl font-extrabold leading-[0.96] tracking-tight text-white [text-shadow:0_10px_28px_rgba(0,0,0,0.5)] sm:text-6xl">
              Predict every match.
              <span className="mt-2 block text-emerald-300 [text-shadow:0_10px_28px_rgba(0,0,0,0.55)]">
                Follow the tournament with friends.
              </span>
            </h1>
            <div
              className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[rgba(6,10,9,0.42)] px-4 py-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-md sm:px-5 sm:py-5"
              style={{ animationDelay: "100ms" }}
            >
              <p className="animate-slide-up text-left text-[1.0625rem] leading-7 text-white/95 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)] sm:text-center sm:text-lg sm:leading-8 sm:text-white/90 sm:drop-shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
                A free World Cup prediction game for football fans. Make predictions, compete with
                friends, climb the leaderboard, and help unlock small community prizes as the
                challenge grows.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 animate-slide-up" style={{ animationDelay: "200ms" }}>
                <Link
                  to={user ? "/matches" : "/register"}
                  className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-center text-white font-semibold text-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-lg shadow-emerald-900/30 btn-glow"
                >
                  {user ? "View Matches" : "Join the Challenge"}
                </Link>
                <Link
                  to="/leaderboard"
                  className="px-6 py-3 rounded-lg border border-white/24 bg-black/28 text-center text-white font-medium hover:bg-black/38 hover:border-white/38 transition-colors shadow-sm"
                >
                  View Leaderboard
                </Link>
              </div>
            </div>
          </div>

          {kickoffLabel && (
            <div
              className="mt-6 mx-auto max-w-3xl animate-slide-up rounded-2xl border border-white/12 bg-[rgba(7,11,10,0.62)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.34)] backdrop-blur-sm sm:mt-8 sm:p-5"
              style={{ animationDelay: "260ms" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80 sm:text-xs sm:tracking-[0.24em]">
                Countdown to Opening Kickoff
              </p>
              <p className="mt-2 text-sm text-white/70">{kickoffLabel}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {countdownParts.map((part) => (
                  <div
                    key={part.label}
                    className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-3 text-center sm:px-3 sm:py-3"
                  >
                    <div className="text-lg font-bold text-white sm:text-2xl">{part.value}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/55 sm:text-[11px] sm:tracking-[0.18em]">
                      {part.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(6,10,9,0.92))] px-5 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-4">
            <span className="text-sm font-semibold text-emerald-200 sm:text-base">Free to play</span>
            <span className="hidden text-emerald-300/60 sm:inline" aria-hidden="true">•</span>
            <span className="text-sm font-semibold text-white/82 sm:text-base">Built for football fans</span>
            <span className="hidden text-emerald-300/60 sm:inline" aria-hidden="true">•</span>
            <span className="text-sm font-semibold text-white/82 sm:text-base">No betting required</span>
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
              Make your predictions for every group-stage match before kickoff.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">⚽</div>
            <h3 className="font-semibold mb-1">Track Your Football Reads</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Score 3 points for an exact score and 1 point for the correct winner or draw.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold mb-1">See How You Stack Up</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Follow the leaderboard, compare picks with other fans, and celebrate a strong
              tournament run.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
