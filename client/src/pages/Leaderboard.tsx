import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import Pagination from "../components/Pagination";
import Spinner from "../components/Spinner";
import StatePanel from "../components/StatePanel";

type LeaderboardEntry = {
  rank: number;
  tiedCount: number;
  userId: number;
  displayName: string;
  points: number;
  groupStagePoints: number;
  knockoutPoints: number;
  totalPoints: number;
};

type LeaderboardScope = "group" | "knockout" | "overall";

const RANK_LABELS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const RANK_BG: Record<number, string> = {
  1: "border-yellow-500/30 bg-yellow-500/5",
  2: "border-gray-400/30 bg-gray-400/5",
  3: "border-amber-600/30 bg-amber-600/5",
};

const PAGE_SIZE = 20;
const LEADERBOARD_SCOPES: Array<{ value: LeaderboardScope; label: string }> = [
  { value: "group", label: "Group Stage" },
  { value: "knockout", label: "Knockout Stage" },
  { value: "overall", label: "Overall" },
];

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function parseScope(value: string | null): LeaderboardScope {
  return LEADERBOARD_SCOPES.some((scope) => scope.value === value)
    ? (value as LeaderboardScope)
    : "overall";
}

function getDisplayName(player: LeaderboardEntry) {
  const normalized = player.displayName?.trim();
  if (!normalized || normalized.toLowerCase() === "anonymous") {
    return `Player ${player.userId}`;
  }
  return normalized;
}

export default function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const activeScope = parseScope(searchParams.get("scope"));

  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{
    title: string;
    description: string;
    icon: string;
  } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared" | "error">("idle");
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setErrorState(null);
      try {
        const pageRes = await api.get("/leaderboard", {
          params: { page, limit: PAGE_SIZE, currentUserId: user?.id, scope: activeScope },
        });
        setLeaders(pageRes.data.data);
        setCurrentUserEntry(pageRes.data.currentUser ?? null);
        setTotalPages(pageRes.data.meta?.totalPages ?? 1);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        setLeaders([]);
        setCurrentUserEntry(null);
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
  }, [page, reloadKey, user?.id, activeScope]);

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

  const handleScopeChange = (scope: LeaderboardScope) => {
    const params = new URLSearchParams(searchParams);
    if (scope === "overall") params.delete("scope");
    else params.set("scope", scope);
    params.delete("page");
    setSearchParams(params);
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const everyoneTied =
    leaders.length > 1 && leaders.every((entry) => entry.points === leaders[0].points);
  const allTiedAtZero = everyoneTied && leaders[0]?.points === 0;
  const leader = leaders[0] ?? null;
  const scopeLabel =
    activeScope === "group"
      ? "Group Stage"
      : activeScope === "knockout"
        ? "Knockout Stage"
        : "Overall";

  const shareCardCopy = leader
    ? `PitchPulse 26 ${scopeLabel} Leaderboard\n${getDisplayName(leader)} is leading with ${leader.points} pts.\n${currentUserEntry ? `I'm ${currentUserEntry.tiedCount > 1 ? `tied with ${currentUserEntry.tiedCount - 1} others` : `ranked #${currentUserEntry.rank}`} on the table.` : "The race is live after every final score."}\nhttps://pitchpulse26.com/leaderboard`
    : `PitchPulse 26 ${scopeLabel} Leaderboard\nThe World Cup challenge is live.\nhttps://pitchpulse26.com/leaderboard`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "PitchPulse 26 Leaderboard",
          text: shareCardCopy,
          url: "https://pitchpulse26.com/leaderboard",
        });
        setShareStatus("shared");
        return;
      }

      await navigator.clipboard.writeText(shareCardCopy);
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-wrap gap-3">
          {LEADERBOARD_SCOPES.map((scope) => {
            const isActive = activeScope === scope.value;
            return (
              <button
                key={scope.value}
                type="button"
                onClick={() => handleScopeChange(scope.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                    : "border-white/12 bg-white/4 text-[var(--color-text-muted)] hover:border-white/25 hover:text-white"
                }`}
              >
                {scope.label}
              </button>
            );
          })}
        </div>

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
                    {activeScope === "group" &&
                      "This view locks in your group-stage history. Exact scorelines earn the most credit, and players with the same points share the same rank."}
                    {activeScope === "knockout" &&
                      "This view tracks only knockout-round points. Group-stage history stays preserved separately."}
                    {activeScope === "overall" &&
                      "This view stacks knockout points on top of your group-stage total so the full tournament table keeps moving."}
                  </p>
                </div>

                <div className="rounded-xl border border-[var(--color-border)] bg-white/4 px-4 py-4">
                  <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                    Your Standing
                  </p>
                  {currentUserEntry ? (
                    <>
                      {currentUserEntry.tiedCount > 1 ? (
                        <p className="text-2xl font-bold mt-2 text-[var(--color-accent)]">
                          Currently tied with {currentUserEntry.tiedCount - 1} other
                          {currentUserEntry.tiedCount === 2 ? "" : "s"}
                        </p>
                      ) : (
                        <p className="text-3xl font-bold mt-2 text-[var(--color-accent)]">
                          #{currentUserEntry.rank}
                        </p>
                      )}
                      <p className="mt-2 font-medium">{getDisplayName(currentUserEntry)}</p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-2">
                        {currentUserEntry.points} point{currentUserEntry.points === 1 ? "" : "s"} from scored matches.
                        {allTiedAtZero ? " Everyone is level until the first scored matches are posted." : ""}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2">
                        Group Stage {currentUserEntry.groupStagePoints} • Knockout {currentUserEntry.knockoutPoints} • Total {currentUserEntry.totalPoints}
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

            <section className="mb-6 rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(15,23,42,0.96))] px-5 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80 mb-2">
                    Share the Table
                  </p>
                  <h2 className="text-2xl font-bold">Make your leaderboard screenshot-worthy</h2>
                  <p className="mt-2 text-sm text-white/75">
                    This card is built to look good in a screenshot. Share your standing and keep the football banter going.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                  Share leaderboard
                </button>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-[rgba(7,12,14,0.5)] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                      PitchPulse 26
                    </p>
                    <h3 className="mt-2 text-xl font-bold">
                      {leader
                        ? `${getDisplayName(leader)} leads the World Cup challenge`
                        : "The World Cup challenge is live"}
                    </h3>
                  <p className="mt-2 text-sm text-white/75">
                    {leader
                      ? `${leader.points} point${leader.points === 1 ? "" : "s"} on the board after the latest finals.`
                      : "Final scores will keep reshaping the table every matchday."}
                  </p>
                  {leader && (
                    <p className="mt-2 text-xs text-white/60">
                      Group Stage {leader.groupStagePoints} • Knockout {leader.knockoutPoints} • Total {leader.totalPoints}
                    </p>
                  )}
                </div>
                {currentUserEntry && (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left sm:min-w-[14rem]">
                      <p className="text-xs uppercase tracking-wider text-white/60">Your spot</p>
                      <p className="mt-1 text-2xl font-bold text-[var(--color-accent)]">
                        {currentUserEntry.tiedCount > 1
                          ? `Tied #${currentUserEntry.rank}`
                          : `#${currentUserEntry.rank}`}
                      </p>
                      <p className="mt-1 text-sm text-white/75">
                        {currentUserEntry.points} point{currentUserEntry.points === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Group {currentUserEntry.groupStagePoints} • Knockout {currentUserEntry.knockoutPoints} • Total {currentUserEntry.totalPoints}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {shareStatus !== "idle" && (
                <p className="mt-3 text-sm text-white/70">
                  {shareStatus === "shared" && "Share sheet opened."}
                  {shareStatus === "copied" && "Leaderboard copy saved to your clipboard."}
                  {shareStatus === "error" && "Could not share right now. Try taking a screenshot instead."}
                </p>
              )}
            </section>

            {allTiedAtZero && (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/4 px-4 py-3 text-sm text-[var(--color-text-muted)]">
                {activeScope === "group" && "Group stage leaderboard goes live after the opening matches."}
                {activeScope === "knockout" && "Knockout leaderboard will start once knockout results are posted."}
                {activeScope === "overall" && "Overall leaderboard will update as each stage posts final scores."}
              </div>
            )}

            {activeScope === "overall" && (
              <div className="mb-4 rounded-xl border border-emerald-400/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100/85">
                Knockout predictions build on top of your group-stage total. Group history stays intact while the overall table keeps moving.
              </div>
            )}

            <div className="space-y-2 stagger-children">
              {leaders.map((player, index) => {
                const isCurrentUser = user?.id === player.userId;
                const displayRank = player.rank;
                const listPosition = index + 1;
                const isTop3 = !allTiedAtZero && displayRank <= 3;
                const samePointsCount = player.tiedCount;

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
                        {allTiedAtZero ? `#${listPosition}` : RANK_LABELS[displayRank] || `#${displayRank}`}
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
                        Group {player.groupStagePoints} • Knockout {player.knockoutPoints} • Total {player.totalPoints}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {samePointsCount > 1
                          ? `Shared rank with ${samePointsCount - 1} other${samePointsCount === 2 ? "" : "s"}`
                          : "Solo position"}
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
