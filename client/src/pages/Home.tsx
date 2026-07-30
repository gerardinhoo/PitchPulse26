import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Flag from "../components/Flag";
import { useAuth } from "../hooks/useAuth";
import heroBgDesktop from "../assets/custom-trophy-bg-1600.webp";
import heroBgFallback from "../assets/custom-trophy-bg.jpg";
import { formatMatchDateTime } from "../utils/dateTime";
import {
  getFinalMatch,
  isTournamentComplete,
  POST_TOURNAMENT_UX_FREEZE,
} from "../utils/tournamentComplete";
import {
  getRoundStatusLabel,
  getTournamentRoundProgress,
  type TournamentStage,
} from "../utils/tournamentStage";

type Match = {
  id: number;
  date: string;
  tournamentStage?: TournamentStage;
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

const MOBILE_PROGRESS_STAGES = new Set([
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

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

function getWorldCupWinnerLabel(match: Match | null): string | null {
  if (!match || match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return match.homeTeam.name;
  if (match.awayScore > match.homeScore) return match.awayTeam.name;
  return null;
}

function ProgressRoundRow({
  round,
  condensed = false,
}: {
  round: ReturnType<typeof getTournamentRoundProgress>[number];
  condensed?: boolean;
}) {
  const isActive = round.status === "in_progress";
  const isFinalRound = round.stage === "FINAL";
  const isCompleted = round.status === "completed";
  const emphasize = isActive || isFinalRound || isCompleted;

  if (condensed) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
          isFinalRound
            ? "progress-round-final"
            : isCompleted
              ? "border-emerald-400/25 bg-emerald-500/8"
              : isActive
                ? "border-emerald-400/30 bg-emerald-500/10"
                : "border-white/10 bg-white/5"
        }`}
      >
        <p className="text-sm font-semibold text-white">{round.label}</p>
        <span
          className={`progress-round-badge shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] ${
            isFinalRound
              ? "bg-amber-500/20 text-amber-200"
              : isCompleted || isActive
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-white/8 text-white/70"
          }`}
        >
          {getRoundStatusLabel(round.status)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        isFinalRound
          ? "progress-round-final"
          : isCompleted
            ? "border-emerald-400/25 bg-emerald-500/8"
            : isActive
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{round.label}</p>
          <p className="mt-1 text-xs text-white/60">
            {round.fixtureCount} fixture{round.fixtureCount === 1 ? "" : "s"}
          </p>
        </div>
        <span
          className={`progress-round-badge shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            emphasize
              ? isFinalRound
                ? "bg-amber-500/20 text-amber-200"
                : "bg-emerald-500/20 text-emerald-200"
              : "bg-white/8 text-white/55"
          }`}
        >
          {getRoundStatusLabel(round.status)}
        </span>
      </div>
      {round.placeholder && (
        <p className="mt-2 text-xs text-white/50">Fixtures unlock as winners are confirmed.</p>
      )}
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [leadersLoaded, setLeadersLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      try {
        const [matchesResult, leaderboardResult] = await Promise.allSettled([
          api.get("/matches", { params: { page: 1, limit: 150 } }),
          api.get("/leaderboard", { params: { page: 1, limit: 5 } }),
        ]);

        if (cancelled) {
          return;
        }

        if (matchesResult.status === "fulfilled") {
          const fetchedMatches: Match[] = matchesResult.value.data?.data ?? [];
          setAllMatches(fetchedMatches);
        }

        if (leaderboardResult.status === "fulfilled") {
          const fetchedLeaders: LeaderboardEntry[] = leaderboardResult.value.data?.data ?? [];
          setLeaders(fetchedLeaders);
        }
      } catch {
        // Keep the homepage resilient even if one of the preview endpoints is unavailable.
      } finally {
        if (!cancelled) {
          setMatchesLoaded(true);
          setLeadersLoaded(true);
        }
      }
    }

    loadHomeData();

    return () => {
      cancelled = true;
    };
  }, []);

  const tournamentComplete = isTournamentComplete(allMatches);
  // Prefer archive UX while loading (or under portfolio freeze) to avoid flashing live CTAs.
  const showArchiveHome =
    POST_TOURNAMENT_UX_FREEZE || !matchesLoaded || tournamentComplete;

  const tournamentRoundProgress = useMemo(
    () => getTournamentRoundProgress(allMatches),
    [allMatches],
  );
  const mobileTournamentRoundProgress = useMemo(
    () => tournamentRoundProgress.filter((round) => MOBILE_PROGRESS_STAGES.has(round.stage)),
    [tournamentRoundProgress],
  );

  const finalMatch = useMemo(() => getFinalMatch(allMatches), [allMatches]);
  const worldCupChampion = getWorldCupWinnerLabel(finalMatch);
  const pitchPulseChampion = leaders[0] ? getDisplayName(leaders[0]) : null;
  const topThree = leaders.slice(0, 3);

  if (!showArchiveHome) {
    // Live-tournament fallback kept for local demos with POST_TOURNAMENT_UX_FREEZE=false
    // and an incomplete Final. Intentionally minimal — Phase 1 focuses on archive mode.
    return (
      <div className="animate-fade-in -mx-4 -mt-8">
        <section className="relative flex min-h-0 items-center justify-center px-4 py-16 text-center">
          <div className="relative z-10 max-w-2xl rounded-2xl border border-white/10 bg-[rgba(7,12,14,0.7)] px-6 py-8">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/85">PitchPulse 26</p>
            <h1 className="mt-3 text-3xl font-extrabold text-white">Tournament in progress</h1>
            <p className="mt-3 text-sm text-white/75">
              Live prediction UI is available when the Final is not yet complete and the portfolio
              freeze flag is off.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to={user ? "/matches" : "/register"}
                className="rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white"
              >
                Open Matches
              </Link>
              <Link
                to="/leaderboard"
                className="rounded-lg border border-white/20 px-5 py-3 text-sm font-medium text-white"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="animate-fade-in -mx-4 -mt-8">
      <section className="relative flex min-h-0 items-center justify-center px-1 py-6 text-center sm:min-h-[calc(100vh-3.5rem)] sm:px-0 sm:py-0">
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

        <div className="relative z-10 mx-auto max-w-6xl px-3 sm:px-6">
          <div className="lg:grid lg:grid-cols-[1.12fr_0.88fr] lg:items-start lg:gap-6">
            <div className="rounded-[1.5rem] border border-white/8 bg-[rgba(7,12,14,0.12)] px-4 py-5 shadow-[0_28px_70px_rgba(0,0,0,0.22)] backdrop-blur-[1px] sm:rounded-[2rem] sm:bg-[rgba(7,12,14,0.16)] sm:px-10 sm:py-10">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100 animate-slide-up sm:mb-4 sm:px-4 sm:py-1.5 sm:text-xs sm:tracking-[0.24em]">
                World Cup 2026 Complete
              </div>

              <h1 className="mb-3 animate-slide-up text-3xl font-extrabold leading-[1.02] tracking-tight sm:mb-4 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.04]">
                <span className="block text-white [text-shadow:0_8px_24px_rgba(0,0,0,0.55)]">
                  PitchPulse 26
                </span>
                <span className="mt-1 block text-lg font-semibold text-emerald-200/95 sm:text-2xl sm:font-bold [text-shadow:0_6px_18px_rgba(0,0,0,0.45)]">
                  A completed World Cup prediction experience.
                </span>
              </h1>

              <div
                className="mx-auto max-w-2xl rounded-2xl border border-amber-400/20 bg-[rgba(6,10,9,0.42)] px-4 py-3.5 shadow-[0_18px_40px_rgba(0,0,0,0.24)] backdrop-blur-md sm:px-5 sm:py-5"
                style={{ animationDelay: "100ms" }}
              >
                <p className="animate-slide-up text-left text-sm leading-6 text-white/95 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)] sm:text-center sm:text-base sm:leading-7 sm:text-white/90">
                  Built and operated throughout the FIFA World Cup 2026, with live predictions,
                  scoring, standings, and full knockout-stage support.
                </p>
                <p className="mt-3 text-left text-xs text-amber-100/85 sm:text-center sm:text-sm">
                  Predictions are now closed.
                </p>
                <p className="mt-2 text-left text-xs text-white/70 sm:text-center">
                  Free to play. No betting. No gambling.
                </p>

                <div
                  className="mt-5 flex flex-col items-stretch gap-2.5 animate-slide-up sm:mt-6 sm:flex-row sm:items-center sm:justify-center sm:gap-3"
                  style={{ animationDelay: "200ms" }}
                >
                  <Link
                    to="/leaderboard"
                    className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-[var(--color-accent)] px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] shadow-lg shadow-emerald-900/30 btn-glow sm:w-auto"
                  >
                    View Final Standings
                  </Link>
                  <Link
                    to="/matches?view=completed"
                    className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg border border-white/24 bg-black/28 px-6 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-black/38 hover:border-white/38 shadow-sm sm:w-auto"
                  >
                    Explore Tournament History
                  </Link>
                </div>
              </div>
            </div>

            <aside className="mt-4 lg:mt-0">
              <div className="rounded-[1.35rem] border border-white/12 bg-[rgba(7,11,10,0.72)] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.34)] backdrop-blur-sm sm:p-4 lg:rounded-[1.75rem] lg:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80 sm:text-[11px] sm:tracking-[0.22em]">
                  Tournament Bracket
                </p>
                <h2 className="mt-1.5 text-base font-bold text-white sm:text-lg lg:mt-2 lg:text-xl">
                  Knockout progress
                </h2>
                <p className="mt-1 hidden text-sm text-white/65 lg:mt-2 lg:block">
                  Every round from the Round of 32 through the Final.
                </p>
                <div className="mt-3 space-y-1.5 lg:hidden">
                  {mobileTournamentRoundProgress.map((round) => (
                    <ProgressRoundRow key={round.stage} round={round} condensed />
                  ))}
                </div>
                <div className="mt-4 hidden space-y-2 lg:block">
                  {tournamentRoundProgress.map((round) => (
                    <ProgressRoundRow key={round.stage} round={round} />
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <div
            className="mt-4 mx-auto max-w-3xl animate-slide-up rounded-2xl border border-amber-400/20 bg-[rgba(7,11,10,0.62)] p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.34)] backdrop-blur-sm sm:mt-6 sm:p-5"
            style={{ animationDelay: "220ms" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/80 sm:text-xs">
              Tournament Recap
            </p>
            <h2 className="mt-2 text-left text-lg font-bold text-white sm:text-xl">
              How the tournament finished
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3.5 text-left">
                <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/75">
                  World Cup Final
                </p>
                {finalMatch &&
                finalMatch.homeScore !== null &&
                finalMatch.awayScore !== null ? (
                  <>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-white">
                      <PreviewTeam
                        name={finalMatch.homeTeam.name}
                        code={finalMatch.homeTeam.code}
                      />
                      <span className="tabular-nums text-amber-100">
                        {finalMatch.homeScore}–{finalMatch.awayScore}
                      </span>
                      <PreviewTeam
                        name={finalMatch.awayTeam.name}
                        code={finalMatch.awayTeam.code}
                      />
                    </p>
                    {worldCupChampion && (
                      <p className="mt-1.5 text-xs text-white/70">
                        World Cup champions: {worldCupChampion}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-white/55">
                      {formatMatchDateTime(finalMatch.date)}
                    </p>
                  </>
                ) : !matchesLoaded ? (
                  <p className="mt-2 text-xs text-white/65">Loading Final result…</p>
                ) : (
                  <p className="mt-2 text-xs text-white/65">Final result not available yet.</p>
                )}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3.5 text-left">
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/75">
                  PitchPulse 26 Champion
                </p>
                {pitchPulseChampion ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-white sm:text-base">
                      {pitchPulseChampion}
                    </p>
                    <p className="mt-1 text-xs text-white/70 sm:text-sm">
                      {leaders[0].points} point{leaders[0].points === 1 ? "" : "s"}
                    </p>
                  </>
                ) : !leadersLoaded ? (
                  <p className="mt-2 text-xs text-white/65">Loading standings…</p>
                ) : (
                  <p className="mt-2 text-xs text-white/65">Standings will appear here.</p>
                )}
              </div>
            </div>

            {topThree.length > 0 && (
              <div className="mt-3 rounded-xl border border-white/10 bg-white/4 px-3.5 py-3 text-left">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/60">Top three</p>
                <ul className="mt-2 space-y-1.5">
                  {topThree.map((entry, index) => (
                    <li
                      key={entry.userId}
                      className="flex items-center justify-between gap-3 text-sm text-white"
                    >
                      <span>
                        <span className="mr-2 text-amber-200/90">#{index + 1}</span>
                        {getDisplayName(entry)}
                      </span>
                      <span className="tabular-nums text-[var(--color-accent)]">
                        {entry.points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 text-left text-xs leading-5 text-white/55">
              {pitchPulseChampion
                ? `Prize: PitchPulse 26 champion ${pitchPulseChampion} selected a Cape Verde jersey.`
                : "Prize: The PitchPulse 26 champion selected a Cape Verde jersey."}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Link
                to="/leaderboard"
                className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
              >
                View Final Standings
              </Link>
              <Link
                to="/matches?view=completed"
                className="inline-flex items-center justify-center rounded-lg border border-white/18 bg-black/20 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/30"
              >
                Open Match Archive
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/4 px-5 py-6 sm:px-6">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">About PitchPulse 26</p>
          <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
            From the opening match to the Final
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
            PitchPulse 26 brought football fans together to predict World Cup matches, earn points,
            and compete on the leaderboard from the group stage through the Final. The tournament is
            now complete, but every result, ranking, and match remains available to explore.
          </p>
        </div>
      </section>

      <section className="px-6 pb-12 sm:pb-16">
        <h2 className="mb-8 text-center text-2xl font-bold">How It Worked</h2>
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3 stagger-children">
          <div className="card text-center">
            <div className="mb-3 text-3xl">🏟️</div>
            <h3 className="mb-1 font-semibold">Make Your Picks</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Fans predicted match scores before kickoff across the group stage and knockout rounds.
            </p>
          </div>
          <div className="card text-center">
            <div className="mb-3 text-3xl">⚽</div>
            <h3 className="mb-1 font-semibold">Earn Points</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Exact scorelines earned 3 points. Correct winners or draws earned 1 point.
            </p>
          </div>
          <div className="card text-center">
            <div className="mb-3 text-3xl">🏆</div>
            <h3 className="mb-1 font-semibold">Compete on the Table</h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Points updated standings automatically as results were posted through the Final.
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
              The same rules applied from the opening match through the Final.
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

      <section className="px-6 pb-10">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <div className="card p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Final Standings</p>
            <h2 className="mt-2 text-2xl font-bold">Leaderboard snapshot</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Rankings after the World Cup 2026 Final.
            </p>

            {topThree.length > 0 ? (
              <div className="mt-5 space-y-3">
                {topThree.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/4 px-4 py-3"
                  >
                    <p className="font-semibold text-white">
                      <span className="mr-2 text-emerald-300">#{index + 1}</span>
                      {getDisplayName(entry)}
                    </p>
                    <p className="shrink-0 text-sm font-semibold text-[var(--color-accent)]">
                      {entry.points} pts
                    </p>
                  </div>
                ))}
              </div>
            ) : !leadersLoaded ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/4 p-5 text-sm text-[var(--color-text-muted)]">
                Loading standings…
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/4 p-5 text-sm text-[var(--color-text-muted)]">
                Standings will appear once leaderboard data is available.
              </div>
            )}

            <Link
              to="/leaderboard"
              className="mt-5 inline-flex text-sm font-medium text-[var(--color-accent)] hover:underline"
            >
              View full final standings
            </Link>
          </div>

          <div className="card p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/80">Match Archive</p>
            <h2 className="mt-2 text-2xl font-bold">Explore the tournament</h2>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Browse every fixture and result from the group stage through the Final.
            </p>
            <Link
              to="/matches?view=completed"
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] sm:w-auto"
            >
              Explore Tournament History
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
