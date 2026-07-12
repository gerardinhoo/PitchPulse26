import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import MatchCard from "../components/MatchCard";
import Pagination from "../components/Pagination";
import ScoreInput from "../components/ScoreInput";
import Spinner from "../components/Spinner";
import StatePanel from "../components/StatePanel";
import { isEmailVerificationRequired } from "../config";
import { formatMatchDateTime } from "../utils/dateTime";
import {
  getMatchStage,
  STAGE_LABELS,
  type TournamentStage,
} from "../utils/tournamentStage";

type Match = {
  id: number;
  date: string;
  tournamentStage?: TournamentStage;
  homeTeam: { name: string; code?: string; group: string };
  awayTeam: { name: string; code?: string; group: string };
  homeScore: number | null;
  awayScore: number | null;
};

type PredictionRecord = {
  id: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
  createdAt?: string;
  updatedAt?: string;
  match?: Match;
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
type PicksView = "all" | "completed" | "saved";
type StageFilter = "all" | TournamentStage;

const PAGE_SIZE = 20;
const MATCH_VIEWS: Array<{ value: MatchView; label: string }> = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
];
const STAGE_FILTERS: Array<{ value: StageFilter; label: string }> = [
  { value: "all", label: "All stages" },
  { value: "GROUP_STAGE", label: "Group Stage" },
  { value: "ROUND_OF_32", label: "Round of 32" },
  { value: "ROUND_OF_16", label: "Round of 16" },
  { value: "QUARTER_FINAL", label: "Quarterfinals" },
  { value: "SEMI_FINAL", label: "Semifinals" },
  { value: "THIRD_PLACE", label: "Third Place" },
  { value: "FINAL", label: "Final" },
];

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

function parseView(value: string | null): MatchView {
  return MATCH_VIEWS.some((view) => view.value === value) ? (value as MatchView) : "all";
}

function parseStage(value: string | null): StageFilter {
  return STAGE_FILTERS.some((stage) => stage.value === value) ? (value as StageFilter) : "all";
}

function isKnockoutMatch(match: Match) {
  return getMatchStage(match) !== "GROUP_STAGE";
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

function calculatePredictionPoints(prediction: PredictionRecord, match: Match) {
  if (match.homeScore === null || match.awayScore === null) return null;

  if (
    prediction.homeScore === match.homeScore &&
    prediction.awayScore === match.awayScore
  ) {
    return 3;
  }

  const predictedDiff = prediction.homeScore - prediction.awayScore;
  const actualDiff = match.homeScore - match.awayScore;

  if (
    (predictedDiff > 0 && actualDiff > 0) ||
    (predictedDiff < 0 && actualDiff < 0) ||
    (predictedDiff === 0 && actualDiff === 0)
  ) {
    return 1;
  }

  return 0;
}

export default function Matches() {
  const { user, setUser } = useAuth();
  const verificationRequired = isEmailVerificationRequired();
  const isVerified = !verificationRequired || user?.emailVerified !== false;
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const activeView = parseView(searchParams.get("view"));
  const activeGroup = (searchParams.get("group") ?? "").toUpperCase();
  const activeStage = parseStage(searchParams.get("stage"));

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageState, setPageState] = useState<PageState | null>(null);
  const [predictions, setPredictions] = useState<Record<number, PredictionInput>>({});
  const [predictionHistory, setPredictionHistory] = useState<PredictionRecord[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [focusedMatchId, setFocusedMatchId] = useState<number | null>(null);
  const [picksView, setPicksView] = useState<PicksView>("all");
  const [updatingReminders, setUpdatingReminders] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setPageState(null);
      try {
        const [matchesResult, predictionsResult, summaryResult] = await Promise.allSettled([
          api.get("/matches", { params: { page: 1, limit: 150 } }),
          api.get("/predictions/my", { params: { limit: 100, includeMatch: true } }),
          api.get<DashboardSummary>("/predictions/summary"),
        ]);

        if (matchesResult.status === "rejected") {
          throw matchesResult.reason;
        }

        const fetchedMatches: Match[] = (matchesResult.value.data.data ?? []).filter(
          (match: Match) => match?.homeTeam && match?.awayTeam,
        );
        setAllMatches(fetchedMatches);
        setGroups(
          Array.from(
            new Set(
              fetchedMatches
                .filter((match) => getMatchStage(match) === "GROUP_STAGE" && match.homeTeam?.group)
                .map((match) => match.homeTeam.group),
            ),
          ).sort(),
        );

        if (predictionsResult.status === "fulfilled") {
          const predictionRows: PredictionRecord[] = predictionsResult.value.data?.data ?? [];
          setPredictionHistory(predictionRows);
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
        } else {
          setPredictionHistory([]);
        }

        setSummary(summaryResult.status === "fulfilled" ? summaryResult.value.data ?? null : null);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number } };
        setAllMatches([]);
        setPredictionHistory([]);
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

  const availableStages = Array.from(
    new Set(allMatches.map((match) => getMatchStage(match))),
  ) as Array<Exclude<StageFilter, "all">>;
  const stageFilterOptions = STAGE_FILTERS.filter(
    (stage) => stage.value === "all" || availableStages.includes(stage.value),
  );
  const hasKnockoutMatches = allMatches.some(isKnockoutMatch);

  const filteredMatches = allMatches.filter((match) => {
    const matchesView = matchesActiveView(match, activeView);
    const matchStage = getMatchStage(match);
    const matchesStage = activeStage === "all" || matchStage === activeStage;
    const matchesGroup =
      !activeGroup || (matchStage === "GROUP_STAGE" && match.homeTeam.group === activeGroup);
    return matchesView && matchesStage && matchesGroup;
  });
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const matches = filteredMatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const todaysMatches = allMatches.filter((match) => isMatchToday(match));
  const todaysOpenMatches = todaysMatches.filter(
    (match) => !isMatchCompleted(match) && !isMatchLocked(match),
  );
  const todaysRemainingCount = todaysOpenMatches.filter((match) => {
    const pred = predictions[match.id];
    return !(pred?.saved && pred.homeScore !== "" && pred.awayScore !== "");
  }).length;
  const todaysNextKickoff =
    todaysOpenMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ??
    null;
  const completedPredictionHistory = predictionHistory
    .filter((prediction) => prediction.match && isMatchCompleted(prediction.match))
    .sort(
      (a, b) =>
        new Date(b.match!.date).getTime() - new Date(a.match!.date).getTime(),
    );
  const upcomingPredictionHistory = predictionHistory
    .filter((prediction) => prediction.match && !isMatchCompleted(prediction.match))
    .sort(
      (a, b) =>
        new Date(a.match!.date).getTime() - new Date(b.match!.date).getTime(),
    );
  const filteredPicks =
    picksView === "completed"
      ? completedPredictionHistory
      : picksView === "saved"
        ? upcomingPredictionHistory
        : [...completedPredictionHistory, ...upcomingPredictionHistory];
  const picksPreview = filteredPicks.slice(0, 6);
  const completedPointsTotal = completedPredictionHistory.reduce((sum, prediction) => {
    const points = calculatePredictionPoints(prediction, prediction.match!);
    return sum + (points ?? 0);
  }, 0);

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

  const updateFilters = (updates: {
    page?: number;
    view?: MatchView;
    group?: string;
    stage?: StageFilter;
  }) => {
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

    if (updates.stage !== undefined) {
      if (updates.stage === "all") params.delete("stage");
      else params.set("stage", updates.stage);
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

  const handleStageChange = (nextStage: StageFilter) => {
    updateFilters({
      stage: nextStage,
      group: nextStage === "all" || nextStage === "GROUP_STAGE" ? activeGroup : "",
      page: 1,
    });
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const handleReminderToggle = async () => {
    if (!user) return;

    const nextValue = !(user.emailNotifications ?? true);
    setUpdatingReminders(true);
    setReminderMessage(null);

    try {
      const response = await api.patch("/auth/preferences", {
        emailNotifications: nextValue,
      });

      setUser((current) =>
        current
          ? {
              ...current,
              emailNotifications: response.data.emailNotifications,
            }
          : current,
      );
      setReminderMessage(
        response.data.emailNotifications
          ? "Match reminders are on."
          : "Match reminders are off.",
      );
    } catch {
      setReminderMessage("We couldn't update reminder preferences. Try again.");
    } finally {
      setUpdatingReminders(false);
    }
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

  const hasActiveFilters = activeView !== "all" || Boolean(activeGroup) || activeStage !== "all";
  const showingGroupStageFilters = activeStage === "all" || activeStage === "GROUP_STAGE";

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
          {verificationRequired && !isVerified && (
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

          {hasKnockoutMatches && (
            <section className="mb-6 rounded-2xl border border-sky-500/20 bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(6,10,9,0.94))] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300 mb-2">
                Tournament Update
              </p>
              <h2 className="text-lg font-semibold">
                Knockout predictions are open for remaining matches.
              </h2>
              <p className="mt-2 text-sm text-white/75">
                Your group-stage points carry over.
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
                      {formatMatchDateTime(summary.nextMatch.date)}
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

            <div className="mt-5 rounded-xl border border-[var(--color-border)] bg-white/4 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                    Match reminders
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Get an email before the next day&apos;s fixtures if you still have predictions left to make.
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-end">
                  <button
                    type="button"
                    onClick={handleReminderToggle}
                    disabled={updatingReminders}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      user?.emailNotifications ?? true
                        ? "border-emerald-400 bg-emerald-500/15 text-white hover:bg-emerald-500/20"
                        : "border-[var(--color-border)] bg-white/5 text-[var(--color-text-muted)] hover:text-white"
                    } ${updatingReminders ? "cursor-wait opacity-70" : ""}`}
                  >
                    {updatingReminders
                      ? "Saving…"
                      : user?.emailNotifications ?? true
                        ? "Email reminders: On"
                        : "Email reminders: Off"}
                  </button>
                  {reminderMessage && (
                    <p className="text-xs text-[var(--color-text-muted)]">{reminderMessage}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(6,10,9,0.94))] px-5 py-5 shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80 mb-2">
                  Don&apos;t Miss Today
                </p>
                <h2 className="text-xl font-semibold">Today&apos;s World Cup window is live</h2>
                <p className="mt-2 text-sm text-white/75">
                  Stay ahead of kickoff, lock in today&apos;s open picks, and keep climbing the leaderboard.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:max-w-2xl">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-emerald-300">Today&apos;s matches</p>
                  <p className="mt-1 text-2xl font-bold">{todaysMatches.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-sky-300">Still open</p>
                  <p className="mt-1 text-2xl font-bold">{todaysRemainingCount}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-amber-300">Next deadline</p>
                  {todaysNextKickoff ? (
                    <>
                      <p className="mt-1 text-sm font-semibold leading-snug">
                        {todaysNextKickoff.homeTeam.name} vs {todaysNextKickoff.awayTeam.name}
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        {formatMatchDateTime(todaysNextKickoff.date)}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-white/70">All today&apos;s matches are locked or complete.</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="card mb-6">
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-accent)] mb-2">
                  Your Picks
                </p>
                <h2 className="text-lg font-semibold">See how your predictions are landing</h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  Review completed picks, points earned, and the upcoming matches you&apos;ve already locked in.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { value: "all", label: "All picks" },
                    { value: "completed", label: "Completed" },
                    { value: "saved", label: "Saved ahead" },
                  ].map((option) => {
                    const isActive = picksView === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPicksView(option.value as PicksView)}
                        aria-pressed={isActive}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "border-emerald-400 bg-emerald-500/15 text-white"
                            : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-emerald-500/40 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-emerald-300">Points earned so far</p>
                  <p className="mt-1 text-2xl font-bold">{completedPointsTotal}</p>
                  <p className="mt-1 text-sm text-white/70">
                    From {completedPredictionHistory.length} completed prediction{completedPredictionHistory.length === 1 ? "" : "s"}.
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {picksPreview.length > 0 ? (
                    picksPreview.map((prediction) => {
                      const match = prediction.match!;
                      const completed = isMatchCompleted(match);
                      const points = completed ? calculatePredictionPoints(prediction, match) : null;
                      const outcomeLabel = !completed
                        ? isMatchLocked(match)
                          ? "Locked in"
                          : "Saved ahead"
                        : points === 3
                          ? "Exact score"
                          : points === 1
                            ? "Correct result"
                            : "Missed";
                      const outcomeColor = !completed
                        ? isMatchLocked(match)
                          ? "text-amber-300"
                          : "text-sky-300"
                        : points === 3
                          ? "text-emerald-300"
                          : points === 1
                            ? "text-sky-300"
                            : "text-[var(--color-text-muted)]";

                      return (
                        <div
                          key={`pick-${prediction.id}`}
                          className="rounded-xl border border-[var(--color-border)] bg-white/4 px-4 py-4"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold">
                                {match.homeTeam.name} vs {match.awayTeam.name}
                              </p>
                              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                {formatMatchDateTime(match.date)}
                              </p>
                            </div>
                            <p className={`text-sm font-semibold ${outcomeColor}`}>
                              {completed
                                ? `${outcomeLabel} • ${points} pt${points === 1 ? "" : "s"}`
                                : outcomeLabel}
                            </p>
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                Your pick
                              </p>
                              <p className="mt-1 font-medium">
                                {prediction.homeScore} – {prediction.awayScore}
                              </p>
                            </div>
                            <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-2">
                              <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                {completed ? "Final score" : "Status"}
                              </p>
                              <p className="mt-1 font-medium">
                                {completed
                                  ? `${match.homeScore} – ${match.awayScore}`
                                  : isMatchLocked(match)
                                    ? "Predictions locked — kickoff has passed."
                                    : "Still editable"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-[var(--color-border)] bg-white/4 px-4 py-4">
                      <p className="font-semibold">
                        {picksView === "completed"
                          ? "No completed picks yet"
                          : picksView === "saved"
                            ? "No saved picks yet"
                            : "No picks yet"}
                      </p>
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        {picksView === "completed"
                          ? "Once your predicted matches finish, you'll see the score, result, and points earned here."
                          : picksView === "saved"
                            ? "Your upcoming predictions will appear here as soon as you start locking them in."
                            : "Start making predictions and this section will become your running match log."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="rounded-xl border border-[var(--color-border)] bg-white/4 px-4 py-4">
                  <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                    Saved and coming up
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                    Your next locked-in predictions, so you can double-check what&apos;s already covered.
                  </p>

                  <div className="mt-4 space-y-3">
                    {upcomingPredictionHistory.length > 0 ? (
                      upcomingPredictionHistory.slice(0, 4).map((prediction) => {
                        const match = prediction.match!;
                        const locked = isMatchLocked(match);

                        return (
                          <div
                            key={`upcoming-${prediction.id}`}
                            className="rounded-lg border border-white/8 bg-black/10 px-3 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium leading-snug">
                                  {match.homeTeam.name} vs {match.awayTeam.name}
                                </p>
                                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                  {formatMatchDateTime(match.date)}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                                  locked
                                    ? "bg-amber-500/15 text-amber-300"
                                    : "bg-emerald-500/15 text-emerald-300"
                                }`}
                              >
                                {locked ? "Locked" : "Saved"}
                              </span>
                            </div>
                            <p className="mt-3 text-sm text-white/85">
                              Your pick: {prediction.homeScore} – {prediction.awayScore}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-white/8 bg-black/10 px-3 py-3">
                        <p className="font-medium">Nothing saved ahead yet</p>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          Your upcoming predictions will appear here as soon as you start locking them in.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
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
                  Filter by stage, match status, or group without losing your place in the schedule.
                </p>
              </div>

              {stageFilterOptions.length > 1 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-2">
                    Tournament Stage
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stageFilterOptions.map((stage) => {
                      const isActive = activeStage === stage.value;
                      return (
                        <button
                          key={stage.value}
                          type="button"
                          onClick={() => handleStageChange(stage.value)}
                          aria-pressed={isActive}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "border-emerald-400 bg-emerald-500/15 text-white"
                              : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-emerald-500/40 hover:text-white"
                          }`}
                        >
                          {stage.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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

              {showingGroupStageFilters && (
                <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                    Group Stage
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => updateFilters({ group: "", view: "all", stage: "all", page: 1 })}
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
              )}
            </div>
          </section>

          {matches.length === 0 ? (
            <StatePanel
              title="No matches fit this view"
              description={
                activeGroup && activeView !== "all"
                  ? `There are no ${activeView} matches in Group ${activeGroup} right now. Try another filter or clear both filters.`
                  : activeStage !== "all"
                    ? `There are no ${STAGE_LABELS[activeStage]} matches in this view right now. Try another stage or clear the filters.`
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
              onAction={() => updateFilters({ group: "", view: "all", stage: "all", page: 1 })}
              tone="empty"
            />
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Showing <span className="text-white font-medium">{matches.length}</span> of{" "}
                  <span className="text-white font-medium">{filteredMatches.length}</span>{" "}
                  {filteredMatches.length === 1 ? "match" : "matches"}
                  {activeStage !== "all" ? ` in ${STAGE_LABELS[activeStage]}` : ""}
                  {activeGroup ? ` in Group ${activeGroup}` : ""}
                  {activeView !== "all" ? ` for ${activeView}` : ""}.
                </p>
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Page {page} of {totalPages}
                </p>
              </div>

              {activeStage === "SEMI_FINAL" && (
                <section
                  className="final-four-header mb-5 rounded-2xl px-5 py-5"
                  aria-label="Semifinals spotlight"
                >
                  <div className="relative z-10 flex items-start gap-4">
                    <span className="final-four-trophy shrink-0" aria-hidden="true">
                      🏆
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-amber-200/80">
                        Semifinals
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                        The Final Four
                      </h2>
                      <p className="mt-1.5 text-sm text-white/75">
                        Two matches. One place in the World Cup Final.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              <div className="space-y-3 stagger-children">
                {matches.map((match) => {
                  const pred = predictions[match.id];
                  const hasResult = match.homeScore !== null && match.awayScore !== null;
                  const isLocked = isMatchLocked(match);
                  const matchStage = getMatchStage(match);
                  const isSemifinal = matchStage === "SEMI_FINAL";

                  let statusLabel: string | undefined;
                  let statusColor = "text-emerald-400";
                  if (isLocked) {
                    statusLabel = pred?.saved
                      ? `Predictions locked — kickoff has passed. Your prediction: ${pred.homeScore} – ${pred.awayScore}`
                      : "Predictions locked — kickoff has passed.";
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

                  const stageLabel =
                    matchStage === "GROUP_STAGE"
                      ? `Group ${match.homeTeam.group}`
                      : STAGE_LABELS[matchStage];
                  const cardStatusLabel = `${stageLabel}${
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
                      featured={isSemifinal}
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
