import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import StatePanel from "../components/StatePanel";

type StandingEntry = {
  displayName: string;
  points: number;
  rank: number;
} | null;

type StageEntry = {
  stage: string;
  label: string;
  fixtureCount: number;
  completedCount: number;
  completed: boolean;
  predictionCount: number;
  archivePath: string;
};

type TournamentStatistics = {
  generatedAt: string;
  tournamentComplete: boolean;
  definitions: {
    accuracy: string;
    scoredPredictions: string;
    exactScore: string;
    correctResult: string;
  };
  participation: {
    registeredPlayers: number;
    activePredictors: number;
    leaderboardParticipants: number;
  };
  matches: {
    total: number;
    completed: number;
    stagesCovered: number;
    byStage: StageEntry[];
  };
  predictions: {
    total: number;
    scored: number;
    exactScore: number;
    correctResult: number;
    incorrect: number;
    accuracyPercentage: number;
    byStage: Array<{ stage: string; label: string; predictionCount: number }>;
  };
  standings: {
    champion: StandingEntry;
    runnerUp: StandingEntry;
    thirdPlace: StandingEntry;
    firstSecondPointGap: number;
  };
  highlights: {
    mostPredictedMatch: {
      matchId: number;
      label: string;
      predictionCount: number;
      stage: string;
    } | null;
    mostExactScoreMatch: {
      matchId: number;
      label: string;
      exactScoreCount: number;
      stage: string;
    } | null;
    mostActivePredictor: {
      displayName: string;
      predictionCount: number;
    } | null;
  };
  worldCupFinal: {
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    champion: string | null;
  } | null;
};

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300/80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-white sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{hint}</p> : null}
    </article>
  );
}

function HorizontalBars({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <section
      className="rounded-2xl border border-white/10 bg-[var(--color-card)]/80 px-4 py-5 sm:px-5"
      aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
    >
      <h3
        id={`${title.replace(/\s+/g, "-").toLowerCase()}-heading`}
        className="text-lg font-semibold text-white"
      >
        {title}
      </h3>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">{description}</p>
      <ul className="mt-5 space-y-3" aria-label={title}>
        {items.map((item) => {
          const width = `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%`;
          return (
            <li key={item.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-white/90">{item.label}</span>
                <span className="shrink-0 tabular-nums text-[var(--color-text-muted)]">
                  {item.value}
                </span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-white/8"
                role="presentation"
              >
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] motion-safe:transition-[width] motion-safe:duration-500"
                  style={{ width }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OutcomeBreakdown({
  exactScore,
  correctResult,
  incorrect,
}: {
  exactScore: number;
  correctResult: number;
  incorrect: number;
}) {
  const total = exactScore + correctResult + incorrect;
  const segments = [
    { label: "Exact scores", value: exactScore, className: "bg-emerald-400" },
    { label: "Correct results", value: correctResult, className: "bg-sky-400" },
    { label: "Incorrect", value: incorrect, className: "bg-white/25" },
  ];

  return (
    <section
      className="rounded-2xl border border-white/10 bg-[var(--color-card)]/80 px-4 py-5 sm:px-5"
      aria-labelledby="outcome-breakdown-heading"
    >
      <h3 id="outcome-breakdown-heading" className="text-lg font-semibold text-white">
        Prediction outcome breakdown
      </h3>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Scored predictions only — matches without final scores are excluded.
      </p>

      <div
        className="mt-5 flex h-3 overflow-hidden rounded-full bg-white/8"
        role="img"
        aria-label={`Exact ${exactScore}, correct result ${correctResult}, incorrect ${incorrect}`}
      >
        {segments.map((segment) => {
          if (segment.value <= 0 || total === 0) return null;
          return (
            <div
              key={segment.label}
              className={`${segment.className} motion-safe:transition-[width]`}
              style={{ width: `${(segment.value / total) * 100}%` }}
              title={`${segment.label}: ${segment.value}`}
            />
          );
        })}
      </div>

      <ul className="mt-4 space-y-2">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center justify-between gap-3 text-sm text-white/90"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-sm ${segment.className}`}
                aria-hidden="true"
              />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-[var(--color-text-muted)]">
              {segment.value}
              {total > 0 ? ` (${Math.round((segment.value / total) * 100)}%)` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-live="polite">
      <div className="mb-6 h-8 w-64 max-w-full rounded-lg bg-white/8" />
      <div className="mb-8 h-4 w-full max-w-xl rounded bg-white/6" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-2xl border border-white/8 bg-white/4 motion-safe:animate-pulse"
          />
        ))}
      </div>
      <p className="sr-only">Loading tournament statistics</p>
    </div>
  );
}

export default function Statistics() {
  const [stats, setStats] = useState<TournamentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const response = await api.get("/statistics/tournament");
        if (!cancelled) {
          setStats(response.data);
        }
      } catch {
        if (!cancelled) {
          setStats(null);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <StatisticsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <StatePanel
          title="Tournament statistics could not be loaded."
          description="Please try again in a moment."
          icon="📊"
          actionLabel="Retry"
          onAction={() => setReloadKey((key) => key + 1)}
          tone="error"
        />
      </div>
    );
  }

  if (!stats || (stats.matches.total === 0 && stats.predictions.total === 0)) {
    return (
      <div className="animate-fade-in">
        <StatePanel
          title="Statistics will appear when tournament data is available"
          description="Once fixtures and predictions are recorded, this page will summarize participation, accuracy, and final standings."
          icon="📈"
          tone="empty"
        />
      </div>
    );
  }

  const summaryMetrics = [
    {
      label: "Registered players",
      value: stats.participation.registeredPlayers,
      hint: "Non-admin accounts",
    },
    {
      label: "Active predictors",
      value: stats.participation.activePredictors,
      hint: "Submitted at least one prediction",
    },
    {
      label: "Total predictions",
      value: stats.predictions.total,
    },
    {
      label: "Tournament matches",
      value: stats.matches.total,
    },
    {
      label: "Completed matches",
      value: stats.matches.completed,
    },
    {
      label: "Tournament stages",
      value: stats.matches.stagesCovered,
      hint: "Distinct stages, not groups A–L",
    },
    {
      label: "Exact-score predictions",
      value: stats.predictions.exactScore,
      hint: "3 points each",
    },
    {
      label: "Correct-result predictions",
      value: stats.predictions.correctResult,
      hint: "1 point each (not exact)",
    },
    {
      label: "Prediction accuracy",
      value: `${stats.predictions.accuracyPercentage}%`,
      hint: "Exact + correct result ÷ scored",
    },
  ];

  const stageBars = stats.predictions.byStage
    .filter((entry) => entry.predictionCount > 0)
    .map((entry) => ({ label: entry.label, value: entry.predictionCount }));

  const participationBars = [
    { label: "Registered players", value: stats.participation.registeredPlayers },
    { label: "Active predictors", value: stats.participation.activePredictors },
  ];

  return (
    <div className="animate-fade-in pb-16">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/85">
          Tournament Recap
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            PitchPulse 26 by the numbers
          </h1>
          {stats.tournamentComplete ? (
            <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
              World Cup 2026 Complete
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)] sm:text-base">
          A look back at the matches, predictions, participation, and final standings from the
          World Cup 2026.
        </p>
      </header>

      <section aria-labelledby="core-metrics-heading" className="mb-10">
        <h2 id="core-metrics-heading" className="sr-only">
          Core summary metrics
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaryMetrics.map((metric) => (
            <MetricCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              hint={metric.hint}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Accuracy uses scored predictions only ({stats.predictions.scored} total):{" "}
          {stats.definitions.accuracy}.
        </p>
      </section>

      <section
        aria-labelledby="final-competition-heading"
        className="mb-10 rounded-2xl border border-amber-400/20 bg-[linear-gradient(135deg,rgba(250,204,21,0.08),rgba(6,10,9,0.94))] px-4 py-5 sm:px-6"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Final Competition Results</p>
        <h2 id="final-competition-heading" className="mt-2 text-xl font-semibold text-white">
          PitchPulse 26 standings snapshot
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-400/20 bg-black/25 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/80">Champion</p>
            <p className="mt-1 truncate text-lg font-semibold text-white">
              {stats.standings.champion?.displayName ?? "—"}
            </p>
            <p className="mt-1 text-sm tabular-nums text-white/70">
              {stats.standings.champion
                ? `${stats.standings.champion.points} pts`
                : "Awaiting standings"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Runner-up</p>
            <p className="mt-1 truncate text-lg font-semibold text-white">
              {stats.standings.runnerUp?.displayName ?? "—"}
            </p>
            <p className="mt-1 text-sm tabular-nums text-white/70">
              {stats.standings.runnerUp ? `${stats.standings.runnerUp.points} pts` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">Third place</p>
            <p className="mt-1 truncate text-lg font-semibold text-white">
              {stats.standings.thirdPlace?.displayName ?? "—"}
            </p>
            <p className="mt-1 text-sm tabular-nums text-white/70">
              {stats.standings.thirdPlace ? `${stats.standings.thirdPlace.points} pts` : "—"}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
          <div className="flex justify-between gap-3 border-b border-white/8 py-2 sm:border-0 sm:py-0">
            <dt>Leaderboard participants</dt>
            <dd className="tabular-nums font-medium text-white">
              {stats.participation.leaderboardParticipants}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-white/8 py-2 sm:border-0 sm:py-0">
            <dt>1st–2nd point gap</dt>
            <dd className="tabular-nums font-medium text-white">
              {stats.standings.firstSecondPointGap}
            </dd>
          </div>
        </dl>

        {stats.worldCupFinal?.champion ? (
          <p className="mt-4 text-sm text-white/80">
            World Cup champion:{" "}
            <span className="font-semibold text-white">{stats.worldCupFinal.champion}</span>
            {stats.worldCupFinal.homeScore !== null &&
            stats.worldCupFinal.awayScore !== null ? (
              <>
                {" "}
                — Final result: {stats.worldCupFinal.homeTeam} {stats.worldCupFinal.homeScore}–
                {stats.worldCupFinal.awayScore} {stats.worldCupFinal.awayTeam}
              </>
            ) : null}
          </p>
        ) : null}

        <p className="mt-3 text-xs text-white/55">
          Champion prize: Cape Verde national team jersey selected by the winner.
        </p>

        <Link
          to="/leaderboard"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-white/18 bg-black/20 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/30"
        >
          View Final Standings
        </Link>
      </section>

      <div className="mb-10 grid gap-5 lg:grid-cols-2">
        {stageBars.length > 0 ? (
          <HorizontalBars
            title="Predictions by tournament stage"
            description="How prediction volume distributed across the World Cup."
            items={stageBars}
          />
        ) : null}
        <OutcomeBreakdown
          exactScore={stats.predictions.exactScore}
          correctResult={stats.predictions.correctResult}
          incorrect={stats.predictions.incorrect}
        />
        <HorizontalBars
          title="Participation summary"
          description="Registered accounts versus players who submitted predictions."
          items={participationBars}
        />
      </div>

      <section aria-labelledby="tournament-journey-heading" className="mb-10">
        <h2 id="tournament-journey-heading" className="text-xl font-semibold text-white">
          Tournament Journey
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Fixture counts by stage, with links into the match archive.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {stats.matches.byStage.map((stage) => (
            <article
              key={stage.stage}
              className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-white">{stage.label}</h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    stage.completed
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-white/8 text-white/65"
                  }`}
                >
                  {stage.completed ? "Completed" : `${stage.completedCount}/${stage.fixtureCount}`}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {stage.fixtureCount} fixture{stage.fixtureCount === 1 ? "" : "s"}
                {stage.predictionCount > 0
                  ? ` · ${stage.predictionCount} prediction${stage.predictionCount === 1 ? "" : "s"}`
                  : ""}
              </p>
              <Link
                to={stage.archivePath}
                className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-[var(--color-accent)] hover:text-emerald-300"
              >
                View in match archive
              </Link>
            </article>
          ))}
        </div>
      </section>

      {(stats.highlights.mostPredictedMatch ||
        stats.highlights.mostExactScoreMatch ||
        stats.highlights.mostActivePredictor) && (
        <section
          aria-labelledby="prediction-insights-heading"
          className="rounded-2xl border border-white/10 bg-[var(--color-card)]/80 px-4 py-5 sm:px-6"
        >
          <h2 id="prediction-insights-heading" className="text-xl font-semibold text-white">
            Prediction Insights
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Highlights from public prediction activity. Display names match the leaderboard.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {stats.highlights.mostPredictedMatch ? (
              <li className="rounded-xl border border-white/10 bg-white/4 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
                  Most predicted match
                </p>
                <p className="mt-2 text-sm font-semibold text-white break-words">
                  {stats.highlights.mostPredictedMatch.label}
                </p>
                <p className="mt-1 text-xs tabular-nums text-[var(--color-text-muted)]">
                  {stats.highlights.mostPredictedMatch.predictionCount} predictions
                </p>
              </li>
            ) : null}
            {stats.highlights.mostExactScoreMatch ? (
              <li className="rounded-xl border border-white/10 bg-white/4 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
                  Most exact scores
                </p>
                <p className="mt-2 text-sm font-semibold text-white break-words">
                  {stats.highlights.mostExactScoreMatch.label}
                </p>
                <p className="mt-1 text-xs tabular-nums text-[var(--color-text-muted)]">
                  {stats.highlights.mostExactScoreMatch.exactScoreCount} exact scores
                </p>
              </li>
            ) : null}
            {stats.highlights.mostActivePredictor ? (
              <li className="rounded-xl border border-white/10 bg-white/4 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">
                  Most active predictor
                </p>
                <p className="mt-2 text-sm font-semibold text-white break-words">
                  {stats.highlights.mostActivePredictor.displayName}
                </p>
                <p className="mt-1 text-xs tabular-nums text-[var(--color-text-muted)]">
                  {stats.highlights.mostActivePredictor.predictionCount} predictions
                </p>
              </li>
            ) : null}
          </ul>
        </section>
      )}

      <div className="mt-10 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Link
          to="/leaderboard"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          View Final Standings
        </Link>
        <Link
          to="/matches?view=completed"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/18 bg-black/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/30"
        >
          Explore Match Archive
        </Link>
      </div>
    </div>
  );
}
