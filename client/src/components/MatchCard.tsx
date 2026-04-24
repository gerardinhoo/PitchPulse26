import Flag from "./Flag";

type Props = {
  homeTeam: string;
  awayTeam: string;
  homeCode?: string | null;
  awayCode?: string | null;
  date: string;
  homeScore: number | null;
  awayScore: number | null;
  children?: React.ReactNode; // slot for ScoreInput or prediction info
  statusLabel?: string;
  statusColor?: string;
};

export default function MatchCard({
  homeTeam,
  awayTeam,
  homeCode,
  awayCode,
  date,
  homeScore,
  awayScore,
  children,
  statusLabel,
  statusColor = "text-[var(--color-text-muted)]",
}: Props) {
  const hasResult = homeScore !== null && awayScore !== null;

  return (
    <article className="card flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: teams + date */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm sm:text-base flex items-center gap-1.5 flex-wrap leading-snug">
          <Flag code={homeCode} size={16} /> {homeTeam}
          <span className="text-[var(--color-text-muted)]">vs</span>
          <Flag code={awayCode} size={16} /> {awayTeam}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          {new Date(date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {statusLabel && (
          <p aria-live="polite" className={`text-xs mt-1 ${statusColor}`}>{statusLabel}</p>
        )}
      </div>

      {/* Right: score or input */}
      <div className="w-full shrink-0 sm:w-auto">
        {hasResult ? (
          <div className="text-center animate-score-pop">
            <p className="text-xl font-bold tabular-nums">
              {homeScore} <span className="text-[var(--color-text-muted)]">–</span> {awayScore}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Final
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </article>
  );
}
