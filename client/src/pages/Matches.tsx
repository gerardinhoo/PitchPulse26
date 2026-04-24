import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import MatchCard from "../components/MatchCard";
import Pagination from "../components/Pagination";
import ScoreInput from "../components/ScoreInput";
import Spinner from "../components/Spinner";
import StatePanel from "../components/StatePanel";

type Match = {
  id: number;
  date: string;
  homeTeam: { name: string; code?: string };
  awayTeam: { name: string; code?: string };
  homeScore: number | null;
  awayScore: number | null;
};

type PredictionRecord = {
  matchId: number;
  homeScore: number;
  awayScore: number;
};

type LeaderboardEntry = {
  rank: number;
  userId: number;
  displayName: string;
  points: number;
};

type PredictionInput = {
  homeScore: string;
  awayScore: string;
  saved?: boolean;
  status?: "idle" | "dirty" | "success" | "error";
  message?: string;
};

type PageState = {
  title: string;
  description: string;
  icon: string;
};

type DashboardSummary = {
  predictedCount: number;
  remainingCount: number;
  lockedCount: number;
  nextMatch: Match | null;
  rank: number | null;
  points: number | null;
};

const PAGE_SIZE = 20;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function isMatchLocked(match: Match) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  return !hasResult && new Date(match.date).getTime() <= Date.now();
}

function formatMatchTime(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Matches() {
  const { user } = useAuth();
  const isVerified = user?.emailVerified !== false;
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));

  const [matches, setMatches] = useState<Match[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState | null>(null);
  const [predictions, setPredictions] = useState<Record<number, PredictionInput>>({});
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [focusedMatchId, setFocusedMatchId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setPageState(null);
      try {
        const [matchesRes, predictionsRes, summaryMatchesRes, leaderboardRes] = await Promise.all([
          api.get("/matches", { params: { page, limit: PAGE_SIZE } }),
          // Fetch up to the server max so predictions cover every page of matches.
          api.get("/predictions/my", { params: { limit: 100 } }).catch(() => null),
          api.get("/matches", { params: { page: 1, limit: 100 } }).catch(() => null),
          api.get("/leaderboard", { params: { page: 1, limit: 100 } }).catch(() => null),
        ]);

        setMatches(matchesRes.data.data);
        setTotalPages(matchesRes.data.meta?.totalPages ?? 1);

        const predictionRows: PredictionRecord[] = predictionsRes?.data?.data ?? [];
        if (predictionsRes?.data?.data) {
          const saved: Record<number, PredictionInput> = {};
          for (const p of predictionRows) {
            saved[p.matchId] = {
              homeScore: String(p.homeScore),
              awayScore: String(p.awayScore),
              saved: true,
              status: "idle",
            };
          }
          setPredictions(saved);
        }

        if (summaryMatchesRes?.data?.data) {
          const allMatches: Match[] = summaryMatchesRes.data.data;
          const predictedIds = new Set(predictionRows.map((p) => p.matchId));
          const playableMatches = allMatches.filter(
            (match) => match.homeScore === null && match.awayScore === null,
          );
          const nextMatch =
            playableMatches.find(
              (match) =>
                new Date(match.date).getTime() > Date.now() &&
                !predictedIds.has(match.id),
            ) ?? null;
          const currentUserStanding = (leaderboardRes?.data?.data as LeaderboardEntry[] | undefined)
            ?.find((entry) => entry.userId === user?.id);

          setSummary({
            predictedCount: predictedIds.size,
            remainingCount: playableMatches.filter(
              (match) =>
                new Date(match.date).getTime() > Date.now() &&
                !predictedIds.has(match.id),
            ).length,
            lockedCount: playableMatches.filter((match) => isMatchLocked(match)).length,
            nextMatch,
            rank: currentUserStanding?.rank ?? null,
            points: currentUserStanding?.points ?? null,
          });
        } else {
          setSummary(null);
        }
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        setMatches([]);
        setSummary(null);
        setPageState(
          axiosErr.response
            ? {
                title: "We couldn't load the matches right now",
                description: "Please try again. If this keeps happening, the schedule may be updating.",
                icon: "😵",
              }
            : {
                title: "You're offline",
                description: "Reconnect to the internet and try again to load the latest matches and predictions.",
                icon: "📡",
              },
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Scroll to top when changing pages for a cleaner transition
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, reloadKey]);

  // If the server reports fewer pages than requested (e.g. deep-linked ?page=99),
  // clamp the URL to the last valid page.
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

  const handleChange = (matchId: number, field: "homeScore" | "awayScore", value: string) => {
    setPredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
        saved: false,
        status: "dirty",
        message: undefined,
      },
    }));
  };

  const handleSubmit = async (matchId: number) => {
    const pred = predictions[matchId];
    if (pred?.homeScore === undefined || pred?.homeScore === "" ||
        pred?.awayScore === undefined || pred?.awayScore === "") {
      return;
    }

    setSubmitting(matchId);
    try {
      const wasSaved = Boolean(pred.saved);
      await api.post("/predictions", {
        matchId,
        homeScore: Number(pred.homeScore),
        awayScore: Number(pred.awayScore),
      });
      setPredictions((prev) => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          saved: true,
          status: "success",
          message: wasSaved ? "Prediction updated" : "Prediction saved",
        },
      }));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setPredictions((prev) => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          status: "error",
          message: `${axiosErr.response?.data?.error || "Failed to save prediction"}. Try again.`,
        },
      }));
    } finally {
      setSubmitting(null);
    }
  };

  const focusedMatch =
    focusedMatchId !== null
      ? matches.find((match) => match.id === focusedMatchId) ?? null
      : null;

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in pb-24 sm:pb-10">
      <h1 className="text-2xl font-bold mb-6">Matches</h1>

      {pageState ? (
        <StatePanel
          title={pageState.title}
          description={pageState.description}
          icon={pageState.icon}
          actionLabel="Retry"
          onAction={handleRetry}
          tone="error"
        />
      ) : matches.length === 0 ? (
        <StatePanel
          title="No matches scheduled yet"
          description="Once fixtures are published, you'll be able to make your picks here."
          icon="🏟️"
          tone="empty"
        />
      ) : (
        <>
          <section className="card mb-6 overflow-hidden">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] mb-2">
                  Personal Dashboard
                </p>
                <h2 className="text-xl font-semibold">
                  {user?.displayName ? `${user.displayName}, here’s your progress` : "Here’s your prediction progress"}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-2">
                  Track how many picks you&apos;ve made, what&apos;s still open, and the next match that needs your attention.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:max-w-xl">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-emerald-300">Predicted</p>
                  <p className="text-2xl font-bold mt-1">{summary?.predictedCount ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-sky-300">Remaining</p>
                  <p className="text-2xl font-bold mt-1">{summary?.remainingCount ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-amber-300">Locked</p>
                  <p className="text-2xl font-bold mt-1">{summary?.lockedCount ?? "—"}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-[var(--color-border)] bg-white/4 px-4 py-4">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Next Match To Predict
                </p>
                {summary?.nextMatch ? (
                  <>
                    <p className="text-lg font-semibold mt-2">
                      {summary.nextMatch.homeTeam.name} vs {summary.nextMatch.awayTeam.name}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      {formatMatchTime(summary.nextMatch.date)}
                    </p>
                    <p className="text-sm mt-3 text-[var(--color-text-muted)]">
                      Scroll down to add your scoreline before kickoff.
                    </p>
                  </>
                ) : summary?.predictedCount ? (
                  <>
                    <p className="text-lg font-semibold mt-2">You&apos;re caught up</p>
                    <p className="text-sm mt-3 text-[var(--color-text-muted)]">
                      Every upcoming match currently has a saved prediction from you.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold mt-2">Make your first prediction</p>
                    <p className="text-sm mt-3 text-[var(--color-text-muted)]">
                      Pick an upcoming match below to get on the board and unlock your progress summary.
                    </p>
                  </>
                )}
              </div>

              <div className="rounded-xl border border-[var(--color-border)] bg-white/4 px-4 py-4">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Leaderboard Snapshot
                </p>
                {summary?.rank ? (
                  <>
                    <p className="text-3xl font-bold mt-2 text-[var(--color-accent)]">#{summary.rank}</p>
                    <p className="text-sm mt-2 text-[var(--color-text-muted)]">
                      Current rank{summary.points !== null ? ` with ${summary.points} point${summary.points === 1 ? "" : "s"}` : ""}.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold mt-2">Rank will appear soon</p>
                    <p className="text-sm mt-3 text-[var(--color-text-muted)]">
                      Once scored results hit the leaderboard, your current standing will show up here.
                    </p>
                  </>
                )}
              </div>
            </div>

            {!isVerified && (
              <p className="mt-4 text-sm text-yellow-300">
                Verify your email to start saving predictions and populate your personal dashboard.
              </p>
            )}
          </section>

          <div className="space-y-3 stagger-children">
            {matches.map((match) => {
              const pred = predictions[match.id];
              const hasResult = match.homeScore !== null && match.awayScore !== null;
              const isLocked = isMatchLocked(match);

              let statusLabel: string | undefined;
              let statusColor = "text-emerald-400";
              if (isLocked) {
                statusLabel = pred?.saved
                  ? `Match locked — your prediction: ${pred.homeScore} – ${pred.awayScore}`
                  : "Match locked";
                statusColor = "text-[var(--color-text-muted)]";
              } else if (!isVerified) {
                statusLabel = "Verify your email to submit predictions";
                statusColor = "text-yellow-300";
              } else if (pred?.status === "error") {
                statusLabel = pred.message;
                statusColor = "text-red-400";
              } else if (
                pred?.status === "dirty" &&
                pred.homeScore !== "" &&
                pred.awayScore !== ""
              ) {
                statusLabel = `Unsaved changes — ${pred.homeScore} – ${pred.awayScore}`;
                statusColor = "text-yellow-300";
              } else if (pred?.status === "success" && !hasResult) {
                statusLabel = `${pred.message} — ${pred.homeScore} – ${pred.awayScore}`;
              } else if (pred?.saved && !hasResult) {
                statusLabel = `Saved prediction: ${pred.homeScore} – ${pred.awayScore}`;
              }

              return (
                <MatchCard
                  key={match.id}
                  homeTeam={match.homeTeam.name}
                  awayTeam={match.awayTeam.name}
                  homeCode={match.homeTeam.code}
                  awayCode={match.awayTeam.code}
                  date={match.date}
                  homeScore={match.homeScore}
                  awayScore={match.awayScore}
                  statusLabel={statusLabel}
                  statusColor={statusColor}
                >
                  {!isLocked && isVerified && (
                    <ScoreInput
                      homeScore={pred?.homeScore || ""}
                      awayScore={pred?.awayScore || ""}
                      onChange={(field, value) => handleChange(match.id, field, value)}
                      onSubmit={() => handleSubmit(match.id)}
                      submitLabel={pred?.saved ? "Update" : "Submit"}
                      submitAriaLabel={`${pred?.saved ? "Update" : "Submit"} prediction for ${match.homeTeam.name} versus ${match.awayTeam.name}`}
                      submitting={submitting === match.id}
                      variant={pred?.saved ? "saved" : "default"}
                      homeLabel={`${match.homeTeam.name} predicted score`}
                      awayLabel={`${match.awayTeam.name} predicted score`}
                      idPrefix={`prediction-${match.id}`}
                      onFocusCapture={() => setFocusedMatchId(match.id)}
                      onBlurCapture={(event) => {
                        const nextTarget = event.relatedTarget;
                        if (
                          nextTarget instanceof Node &&
                          event.currentTarget.contains(nextTarget)
                        ) {
                          return;
                        }
                        setFocusedMatchId((current) => (current === match.id ? null : current));
                      }}
                    />
                  )}
                </MatchCard>
              );
            })}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />

          {focusedMatch && (
            <div className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)]/95 px-4 py-3 shadow-2xl backdrop-blur sm:hidden">
              <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                Editing prediction
              </p>
              <p className="mt-1 text-sm font-semibold">
                {focusedMatch.homeTeam.name} vs {focusedMatch.awayTeam.name}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                The save button stays attached to this card while the keyboard is open.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
