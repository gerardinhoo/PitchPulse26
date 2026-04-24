type Props = {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "default" | "error" | "empty";
};

const TONE_STYLES: Record<NonNullable<Props["tone"]>, string> = {
  default: "border-[var(--color-border)]",
  error: "border-red-400/30 bg-red-400/5",
  empty: "border-[var(--color-border)]",
};

export default function StatePanel({
  title,
  description,
  icon = "ℹ️",
  actionLabel,
  onAction,
  tone = "default",
}: Props) {
  return (
    <div className={`card text-center py-12 ${TONE_STYLES[tone]}`}>
      <p className="text-3xl mb-3" aria-hidden="true">{icon}</p>
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-[var(--color-text-muted)] max-w-lg mx-auto">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
