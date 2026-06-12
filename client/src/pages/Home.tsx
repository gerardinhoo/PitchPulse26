import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Flag from "../components/Flag";
import { useAuth } from "../hooks/useAuth";
import heroBgDesktop from "../assets/custom-trophy-bg-1600.webp";
import heroBgFallback from "../assets/custom-trophy-bg.jpg";
import { formatMatchDateTime } from "../utils/dateTime";

type Match = {
  id: number;
  date: string;
  homeTeam: { name: string; code?: string | null; group: string };
  awayTeam: { name: string; code?: string | null; group: string };
  homeScore: number | null;
  awayScore: number | null;
};

type LeaderboardEntry = {
  rank: number;
  userId: number;
  displayName: string;
  points: number;
};

type ActivityItem = {
  id: string;
  label: string;
  detail: string;
};

function getDisplayName(entry: LeaderboardEntry) {
  const name = entry.displayName?.trim();
  if (!name || name.toLowerCase() === "anonymous") {
    return `Player ${entry.userId}`;
  }
  return name;
}

function PreviewTeam({ name, code }: { name: string; code?: string | null }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Flag code={code} size={18} className="shrink-0 rounded-sm" />
      <span>{name}</span>
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      try {
        const [matchesResponse, leaderboardResponse] = await Promise.all([
          api.get("/matches", { params: { page: 1, limit: 100 } }),
          api.get("/leaderboard", { params: { page: 1, limit: 5 } }),
        ]);

        if (cancelled) {
          return;
        }

        const fetchedMatches: Match[] = matchesResponse.data?.data ?? [];
        const fetchedLeaders: LeaderboardEntry[] = leaderboardResponse.data?.data ?? [];

        setAllMatches(fetchedMatches);
        setLeaders(fetchedLeaders);
      } catch {
        // Keep the homepage resilient even if one of the preview endpoints is unavailable.
      }
    }

    loadHomeData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const upcomingMatches = useMemo(
    () =>
      allMatches
        .filter((match) => match.homeScore === null && match.awayScore === null)
        .filter((match) => new Date(match.date).getTime() > currentTimeMs)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3),
    [allMatches, currentTimeMs],
  );

  const latestCompletedMatch = useMemo(
    () =>
      allMatches
        .filter((match) => match.homeScore !== null && match.awayScore !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null,
    [allMatches],
  );

  const nextKickoffMatch = upcomingMatches[0] ?? null;

  const activityItems = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = [];

    if (leaders[0]) {
      items.push({
        id: "leader-top",
        label: `🏆 ${getDisplayName(leaders[0])} currently leads the challenge`,
        detail: "The leaderboard race is live and every new result can shake things up.",
      });
    }

    if (user?.displayName) {
      items.push({
        id: "user-ready",
        label: `🙌 ${user.displayName} is ready for the next kickoff`,
        detail: "Open your matches and lock in your next football read.",
      });
    }

    if (upcomingMatches[0]) {
      items.push({
        id: "next-match",
        label: `⚽ ${upcomingMatches[0].homeTeam.name} vs ${upcomingMatches[0].awayTeam.name} is next up`,
        detail: `${formatMatchDateTime(upcomingMatches[0].date)} is the next prediction deadline.`,
      });
    }

    if (leaders[1]) {
      items.push({
        id: "leader-chase",
        label: `🔥 ${getDisplayName(leaders[1])} is chasing the top spot`,
        detail: "One sharp matchday could change the order at the top.",
      });
    }

    return items.slice(0, 4);
  }, [leaders, upcomingMatches, user]);

  return (
    <div className="animate-fade-in -mx-4 -mt-8">
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,5,4,0.7)_0%,rgba(3,5,4,0.46)_24%,rgba(3,5,4,0.56)_58%,rgba(3,5,4,0.8)_100%)] sm:bg-[radial-gradient(circle_at_center,rgba(8,12,10,0.34),rgba(3,5,4,0.92))] pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(0deg,rgba(7,24,14,0.18)_0%,rgba(7,24,14,0.04)_44%,rgba(7,24,14,0)_100%)] sm:bg-[radial-gradient(circle_at_38%_42%,rgba(204,164,74,0.22)_0%,rgba(204,164,74,0.12)_16%,rgba(204,164,74,0)_34%)] sm:opacity-80" />

        <div className="relative z-10 max-w-3xl px-3 sm:px-6">
          <div className="rounded-[2rem] border border-white/8 bg-[rgba(7,12,14,0.12)] px-4 py-6 shadow-[0_28px_70px_rgba(0,0,0,0.22)] backdrop-blur-[1px] sm:bg-[rgba(7,12,14,0.16)] sm:px-10 sm:py-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/90 animate-slide-up sm:text-xs">
              Free Football Challenge
            </div>
            <h1 className="mb-4 animate-slide-up text-4xl font-extrabold leading-[0.96] tracking-tight text-white [text-shadow:0_10px_28px_rgba(0,0,0,0.5)] sm:text-6xl">
              Predict the World Cup.
              <span className="mt-2 block text-emerald-300 [text-shadow:0_10px_28px_rgba(0,0,0,0.55)]">
                No betting. Just football.
              </span>
            </h1>
            <div
              className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[rgba(6,10,9,0.42)] px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-md sm:px-5 sm:py-5"
              style={{ animationDelay: "100ms" }}
            >
              <p className="animate-slide-up text-left text-base leading-7 text-white/95 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)] sm:text-center sm:text-lg sm:leading-8 sm:text-white/90 sm:drop-shadow-[0_6px_18px_rgba(0,0,0,0.42)]">
                Make your picks, earn points, and compete with friends throughout the
                tournament. PitchPulse 26 is free to play and built for football fans.
              </p>
              <div
                className="mt-6 flex flex-col items-stretch gap-3 animate-slide-up sm:flex-row sm:items-center sm:justify-center"
                style={{ animationDelay: "200ms" }}
              >
                <Link
                  to={user ? "/matches" : "/register"}
                  className="px-6 py-3 rounded-lg bg-[var(--color-accent)] text-center text-white font-semibold text-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-lg shadow-emerald-900/30 btn-glow"
                >
                  Start Predicting
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

          {(latestCompletedMatch || nextKickoffMatch) && (
            <div
              className="mt-6 mx-auto max-w-3xl animate-slide-up rounded-2xl border border-white/12 bg-[rgba(7,11,10,0.62)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.34)] backdrop-blur-sm sm:mt-8 sm:p-5"
              style={{ animationDelay: "260ms" }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200/80 sm:text-xs sm:tracking-[0.24em]">
                Today at PitchPulse 26
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/75 sm:text-[11px]">
                    Latest Result
                  </p>
                  {latestCompletedMatch ? (
                    <>
                      <p className="mt-2 text-base font-semibold text-white sm:text-lg">
                        {latestCompletedMatch.homeTeam.name} {latestCompletedMatch.homeScore}–{latestCompletedMatch.awayScore}{" "}
                        {latestCompletedMatch.awayTeam.name}
                      </p>
                      <p className="mt-1 text-sm text-white/65">
                        Final in Group {latestCompletedMatch.homeTeam.group}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-white/65">No final score yet.</p>
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-left">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-sky-200/75 sm:text-[11px]">
                    Next Kickoff
                  </p>
                  {nextKickoffMatch ? (
                    <>
                      <p className="mt-2 text-base font-semibold text-white sm:text-lg">
                        {nextKickoffMatch.homeTeam.name} vs {nextKickoffMatch.awayTeam.name}
                      </p>
                      <p className="mt-1 text-sm text-white/65">
                        {formatMatchDateTime(nextKickoffMatch.date)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-white/65">All current fixtures have kicked off.</p>
                  )}
                </div>
              </div>
              <Link
                to="/matches"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                Open Matches
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="px-6 py-8 sm:py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(6,10,9,0.92))] px-5 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
          <div className="grid grid-cols-2 gap-3 text-center sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
            <span className="rounded-full border border-emerald-400/20 bg-white/5 px-3 py-2 text-sm font-semibold text-emerald-200 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-base">
              100% Free
            </span>
            <span className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold text-white/88 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-base">
              No Betting
            </span>
            <span className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold text-white/88 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-base">
              No Gambling
            </span>
            <span className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold text-white/88 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:text-base">
              Friendly Competition
            </span>
          </div>
        </div>
      </section>

      <section className="py-12 px-6 sm:py-16">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid gap-6 max-w-5xl mx-auto sm:grid-cols-3 stagger-children">
          <div className="card text-center">
            <div className="text-3xl mb-3">🏟️</div>
            <h3 className="font-semibold mb-1">Make Your Picks</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Predict every group-stage match before kickoff and stay locked into the
              tournament.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">⚽</div>
            <h3 className="font-semibold mb-1">Earn Points</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Score 3 points for an exact scoreline and 1 point for the correct winner or draw.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-semibold mb-1">Compete with Friends</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Climb the leaderboard, compare football instincts, and enjoy the tournament race.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-5xl rounded-2xl border border-white/10 bg-white/4 p-5 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Scoring</p>
              <h3 className="mt-2 text-xl font-bold">Simple points, every matchday</h3>
            </div>
            <p className="text-sm text-[var(--color-text-muted)]">
              Quick reminder before you start locking in picks.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-emerald-300">3 pts</p>
              <p className="mt-1 text-sm font-medium text-white">Exact score</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-sky-300">1 pt</p>
              <p className="mt-1 text-sm font-medium text-white">Correct winner or draw</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/4 px-4 py-4 text-center">
              <p className="text-2xl font-bold text-white/80">0 pts</p>
              <p className="mt-1 text-sm font-medium text-white">Incorrect prediction</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-6">
        <div className="mx-auto grid max-w-5xl gap-6 lg:items-start lg:grid-cols-[1.2fr_0.8fr]">
          <div className="card p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Upcoming Matches</p>
                <h2 className="mt-2 text-2xl font-bold">
                  {user ? "Your next prediction windows" : "What’s coming up next"}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {user
                    ? "Stay ahead of kickoff and jump straight back into your next picks."
                    : "See the next few World Cup fixtures and get ready to join the challenge."}
                </p>
              </div>
              <Link
                to="/matches"
                className="text-sm font-medium text-[var(--color-accent)] hover:underline"
              >
                View all matches
              </Link>
            </div>

            {upcomingMatches.length > 0 ? (
              <div className="mt-6 space-y-4">
                {upcomingMatches.map((match) => (
                  <article
                    key={match.id}
                    className="rounded-2xl border border-white/10 bg-white/4 p-4 shadow-[0_10px_24px_rgba(0,0,0,0.14)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 lg:flex-1 lg:pr-4">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold leading-snug text-white">
                          <PreviewTeam name={match.homeTeam.name} code={match.homeTeam.code} />
                          <span className="text-white/50">vs</span>
                          <PreviewTeam name={match.awayTeam.name} code={match.awayTeam.code} />
                        </p>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          {formatMatchDateTime(match.date)}
                        </p>
                      </div>
                      <Link
                        to="/matches"
                        className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] sm:w-auto lg:min-w-[12rem] lg:shrink-0"
                      >
                        Predict Now
                      </Link>
                    </div>
                  </article>
                ))}
                <Link
                  to="/matches"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-accent-hover)]"
                >
                  Ready to make your picks? View all matches
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/4 p-5 text-sm text-[var(--color-text-muted)]">
                No upcoming matches are available yet. Check back soon for the next kickoff window.
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="card p-5 sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Leaderboard Preview</p>
                  <h2 className="mt-2 text-2xl font-bold">Top Players</h2>
                </div>
                <Link
                  to="/leaderboard"
                  className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                >
                  View full leaderboard
                </Link>
              </div>

              {leaders.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {leaders.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/4 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          <span className="mr-2 text-emerald-300">#{index + 1}</span>
                          {getDisplayName(entry)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-[var(--color-accent)]">
                        {entry.points} pts
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/4 p-5 text-sm text-[var(--color-text-muted)]">
                  Leaderboard points will show up here once scored matches start coming in.
                </div>
              )}
            </div>

            <div className="card p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Recent Activity</p>
              <h2 className="mt-2 text-2xl font-bold">Live community snapshot</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Simple activity based on current leaderboard and upcoming fixture data.
              </p>

              {activityItems.length > 0 ? (
                <div className="mt-6 space-y-3">
                  {activityItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/10 bg-white/4 px-4 py-3"
                    >
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/4 p-5 text-sm text-[var(--color-text-muted)]">
                  More fan activity will appear here once leaderboard and fixture data starts filling in.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
