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
  homeTeam: { name: string; code?: string; group: string };
  awayTeam: { name: string; code?: string; group: string };
  homeScore: number | null;
  awayScore: number | null;
};

type PredictionRecord = {
  matchId: number;
  homeScore: number;
  awayScore: number;
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

type MatchView = "all" | "today" | "upcoming" | "completed";

const PAGE_SIZE = 20;
const MATCH_VIEWS: Array<{ value: MatchView; label: string }> = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function parseView(value: string | null): MatchView {
  return MATCH_VIEWS.some((view) => view.value === value) ? (value as MatchView) : "all";
}

function isMatchLocked(match: Match) {
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  return !hasResult && new Date(match.date).getTime() <= Date.now();
}

function isMatchCompleted(match: Match) {
  return match.homeScore !== null && match.awayScore !== null;
}

function isMatchToday(match: Match) {
  const now = new Date();
  const date = new Date(match.date);

  return (
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  );
}

function matchesActiveView(match: Match, view: MatchView) {
  if (view === "today") return isMatchToday(match);
  if (view === "upcoming") return !isMatchCompleted(match) && new Date(match.date).getTime() > Date.now();
  if (view === "completed") return isMatchCompleted(match);
  return true;
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
  const activeView = parseView(searchParams.get("view"));
  const activeGroup = (searchParams.get("group") ?? "").toUpperCase();

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
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
        const [matchesRes, predictionsRes, summaryRes] = await Promise.all([
          api.get("/matches", { params: { page: 1, limit: 100 } }),
          // Fetch up to the server max so predictions cover every page of matches.
          api.get("/predictions/my", { params: { limit: 100, includeMatch: false } }).catch(() => null),
          api.get<DashboardSummary>("/predictions/summary").catch(() => null),
        ]);

        const fetchedMatches: Match[] = matchesRes.data.data;
        setAllMatches(fetchedMatches);
        setGroups(
          Array.from(new Set(fetchedMatches.map((match) => match.homeTeam.group))).sort(),
        );

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

        setSummary(summaryRes?.data ?? null);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        setAllMatches([]);
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
  }, [reloadKey]);

  const filteredMatches = allMatches.filter((match) => matchesActiveView(match, activeView));
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const matches = filteredMatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  const updateFilters = (updates: { page?: number; view?: MatchView; group?: string }) => {
    const params = new URLSearchParams(searchParams);

    if (updates.page !== undefined) {
      if (updates.page <= 1) params.delete("page");
      else params.set("page", String(updates.page));
    }

    if (updates.view !== undefined) {
      if (updates.view === "all") params.delete("view");
      else params.set("view", updates.view);
    }

    if (updates.group !== undefined) {
      if (!updates.group) params.delete("group");
      else params.set("group", updates.group);
    }

    setSearchParams(params);
  };

  const handlePageChange = (next: number) => {
    updateFilters({ page: next });
  };

  const handleViewChange = (nextView: MatchView) => {
    updateFilters({ view: nextView, page: 1 });
  };

  const handleGroupChange = (nextGroup: string) => {
    updateFilters({ group: nextGroup, page: 1 });
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

  const hasActiveFilters = activeView !== "all" || Boolean(activeGroup);

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
      ) : allMatches.length === 0 ? (
        <StatePanel
          title="No matches scheduled yet"
          description="Once fixtures are published, you'll be able to make your picks here."
          icon="🏟️"
          tone="empty"
        />
      ) : (
        <>
          {!isVerified && (
            <section className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-yellow-300 mb-2">
                Verification Required
              </p>
              <h2 className="text-lg font-semibold">Verify your email to start saving predictions</h2>
              <p className="mt-2 text-sm text-yellow-100/90">
                You can browse the full group-stage schedule now, but predictions stay disabled until your
                email address is verified.
              </p>
            </section>
          )}

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
          </section>

          <section className="card mb-6">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] mb-2">
                  Quick Navigation
                </p>
                <h2 className="text-lg font-semibold">Jump to the matches you care about</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Filter by match status or group without losing your place in the schedule.
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                  Match Status
                </p>
                <div className="flex flex-wrap gap-2">
                  {MATCH_VIEWS.map((view) => {
                    const isActive = activeView === view.value;
                    return (
                      <button
                        key={view.value}
                        type="button"
                        onClick={() => handleViewChange(view.value)}
                        aria-pressed={isActive}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "border-emerald-400 bg-emerald-500/15 text-white"
                            : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-emerald-500/40 hover:text-white"
                        }`}
                      >
                        {view.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                    Group Stage
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => updateFilters({ group: "", view: "all", page: 1 })}
                      className="text-xs font-medium text-[var(--color-accent)] hover:text-emerald-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleGroupChange("")}
                    aria-pressed={!activeGroup}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      !activeGroup
                        ? "border-sky-400 bg-sky-500/15 text-white"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-sky-500/40 hover:text-white"
                    }`}
                  >
                    All groups
                  </button>
                  {groups.map((group) => {
                    const isActive = activeGroup === group;
                    return (
                      <button
                        key={group}
                        type="button"
                        onClick={() => handleGroupChange(group)}
                        aria-pressed={isActive}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "border-sky-400 bg-sky-500/15 text-white"
                            : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-sky-500/40 hover:text-white"
                        }`}
                      >
                        Group {group}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {matches.length === 0 ? (
            <StatePanel
              title="No matches fit this view"
              description={
                activeGroup && activeView !== "all"
                  ? `There are no ${activeView} matches in Group ${activeGroup} right now. Try another filter or clear both filters.`
                  : activeGroup
                    ? `There are no matches available in Group ${activeGroup} right now. Try another group or clear the filter.`
                    : activeView === "today"
                      ? "There are no matches scheduled for today. Try Upcoming or All to see more fixtures."
                      : activeView === "completed"
                        ? "No final scores have been posted yet. Check back after the first matches finish."
                        : "There are no upcoming matches to predict right now. Try All to review the full schedule."
              }
              icon={activeView === "completed" ? "📋" : "🧭"}
              actionLabel="Clear filters"
              onAction={() => updateFilters({ group: "", view: "all", page: 1 })}
              tone="empty"
            />
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Showing <span className="text-white font-medium">{matches.length}</span> of{" "}
                  <span className="text-white font-medium">{filteredMatches.length}</span>{" "}
                  {filteredMatches.length === 1 ? "match" : "matches"}
                  {activeGroup ? ` in Group ${activeGroup}` : ""}
                  {activeView !== "all" ? ` for ${activeView}` : ""}.
                </p>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Page {page} of {totalPages}
                </p>
              </div>

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
                    statusLabel = "Verification required";
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

                  const cardStatusLabel = `Group ${match.homeTeam.group}${
                    statusLabel ? ` • ${statusLabel}` : ""
                  }`;

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
                      statusLabel={cardStatusLabel}
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
            </>
          )}

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
