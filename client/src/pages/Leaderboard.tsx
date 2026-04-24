import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import Pagination from "../components/Pagination";
import Spinner from "../components/Spinner";
import StatePanel from "../components/StatePanel";

type LeaderboardEntry = {
  rank: number;
  userId: number;
  displayName: string;
  points: number;
};

const RANK_LABELS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const RANK_BG: Record<number, string> = {
  1: "border-yellow-500/30 bg-yellow-500/5",
  2: "border-gray-400/30 bg-gray-400/5",
  3: "border-amber-600/30 bg-amber-600/5",
};

const PAGE_SIZE = 20;
const SUMMARY_LIMIT = 100;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function getDisplayName(player: LeaderboardEntry) {
  const normalized = player.displayName?.trim();
  if (!normalized || normalized.toLowerCase() === "anonymous") {
    return `Player ${player.userId}`;
  }
  return normalized;
}

function buildDisplayRanks(entries: LeaderboardEntry[]) {
  const ranks = new Map<number, number>();
  let currentRank = 0;
  let lastPoints: number | null = null;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (lastPoints !== entry.points) {
      currentRank = index + 1;
      lastPoints = entry.points;
    }
    ranks.set(entry.userId, currentRank);
  }

  return ranks;
}

export default function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));

  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [allLeaders, setAllLeaders] = useState<LeaderboardEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{
    title: string;
    description: string;
    icon: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setErrorState(null);
      try {
        const [pageRes, summaryRes] = await Promise.all([
          api.get("/leaderboard", {
            params: { page, limit: PAGE_SIZE },
          }),
          api.get("/leaderboard", {
            params: { page: 1, limit: SUMMARY_LIMIT },
          }).catch(() => null),
        ]);
        setLeaders(pageRes.data.data);
        setAllLeaders(summaryRes?.data?.data ?? pageRes.data.data);
        setTotalPages(pageRes.data.meta?.totalPages ?? 1);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        setLeaders([]);
        setAllLeaders([]);
        setErrorState(
          axiosErr.response
            ? {
                title: "Leaderboard is taking a breather",
                description: "Please try again in a moment to see the latest rankings.",
                icon: "📊",
              }
            : {
                title: "You're offline",
                description: "Reconnect to refresh the leaderboard and see where everyone stands.",
                icon: "📡",
              },
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, reloadKey]);

  // Clamp out-of-range ?page=N back to the last valid page.
  useEffect(() => {
    if (!loading && page > totalPages) {
      const next = new URLSearchParams(searchParams);
      if (totalPages > 1) next.set("page", String(totalPages));
      else next.delete("page");
      setSearchParams(next, { replace: true });
    }
  }, [loading, page, totalPages, searchParams, setSearchParams]);

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams);
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    setSearchParams(params);
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const rankMap = buildDisplayRanks(allLeaders);
  const currentUserEntry = allLeaders.find((player) => player.userId === user?.id) ?? null;

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      <div className="max-w-4xl mx-auto">
        {errorState ? (
          <StatePanel
            title={errorState.title}
            description={errorState.description}
            icon={errorState.icon}
            actionLabel="Retry"
            onAction={handleRetry}
            tone="error"
          />
        ) : leaders.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-3" aria-hidden="true">⚽</p>
            <h2 className="text-lg font-semibold mb-2">No ranked players yet</h2>
            <p className="text-[var(--color-text-muted)] max-w-lg mx-auto">
              Leaderboard points will appear after the first scored matches are settled.
            </p>
            <Link
              to="/matches"
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Make your first prediction
            </Link>
          </div>
        ) : (
          <>
            <section className="card mb-6">
              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] mb-2">
                    How Scoring Works
                  </p>
                  <h2 className="text-xl font-semibold">Points reward accurate match picks</h2>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    The leaderboard totals points from scored matches only. Exact scorelines earn the most credit, and
                    players with the same points share the same rank.
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-white/4 px-4 py-4">
                  <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                    Your Standing
                  </p>
                  {currentUserEntry ? (
                    <>
                      <p className="text-3xl font-bold mt-2 text-[var(--color-accent)]">
                        #{rankMap.get(currentUserEntry.userId) ?? currentUserEntry.rank}
                      </p>
                      <p className="mt-2 font-medium">{getDisplayName(currentUserEntry)}</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-2">
                        {currentUserEntry.points} point{currentUserEntry.points === 1 ? "" : "s"} from scored matches.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-semibold mt-2">You&apos;re not ranked yet</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-2">
                        Make predictions and wait for scored matches to see your standing here.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </section>

            <div className="space-y-2 stagger-children">
              {leaders.map((player) => {
                const isCurrentUser = user?.id === player.userId;
                const displayRank = rankMap.get(player.userId) ?? player.rank;
                const isTop3 = displayRank <= 3;
                const samePointsCount = allLeaders.filter((entry) => entry.points === player.points).length;

                return (
                  <div
                    key={player.userId}
                    className={`card flex justify-between items-center ${
                      isCurrentUser
                        ? "ring-1 ring-[var(--color-accent)] border-[var(--color-accent)]/40"
                        : isTop3
                          ? RANK_BG[displayRank]
                          : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg w-8 text-center">
                        {RANK_LABELS[displayRank] || `#${displayRank}`}
                      </span>
                      <span className="font-medium">
                        {getDisplayName(player)}
                        {isCurrentUser && (
                          <span className="text-xs text-[var(--color-accent)] ml-2">(you)</span>
                        )}
                        {samePointsCount > 1 && (
                          <span className="text-xs text-[var(--color-text-muted)] ml-2">
                            tied on points
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-[var(--color-accent)] tabular-nums">
                        {player.points} pts
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {samePointsCount > 1 ? `Shared rank with ${samePointsCount - 1} other${samePointsCount === 2 ? "" : "s"}` : "Solo position"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
