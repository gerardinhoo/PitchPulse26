type Props = {
  homeTeam: string;
  awayTeam: string;
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
  date,
  homeScore,
  awayScore,
  children,
  statusLabel,
  statusColor = "text-[var(--color-text-muted)]",
}: Props) {
  const hasResult = homeScore !== null && awayScore !== null;

  return (
    <div className="card flex items-center justify-between gap-4">
      {/* Left: teams + date */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm sm:text-base truncate">
          {homeTeam} <span className="text-[var(--color-text-muted)]">vs</span>{" "}
          {awayTeam}
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
          <p className={`text-xs mt-1 ${statusColor}`}>{statusLabel}</p>
        )}
      </div>

      {/* Right: score or input */}
      <div className="shrink-0">
        {hasResult ? (
          <div className="text-center">
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
    </div>
  );
}
