type Props = {
  homeScore: string;
  awayScore: string;
  onChange: (field: "homeScore" | "awayScore", value: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitting?: boolean;
  variant?: "default" | "saved" | "admin";
  disabled?: boolean;
};

const VARIANT_STYLES = {
  default: "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]",
  saved: "bg-emerald-700 hover:bg-emerald-600",
  admin: "bg-red-600 hover:bg-red-500",
};

export default function ScoreInput({
  homeScore,
  awayScore,
  onChange,
  onSubmit,
  submitLabel = "Submit",
  submitting = false,
  variant = "default",
  disabled = false,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min="0"
        placeholder="H"
        className="w-12 p-1.5 text-center text-sm rounded-md"
        value={homeScore}
        onChange={(e) => onChange("homeScore", e.target.value)}
        disabled={disabled}
      />
      <span className="text-[var(--color-text-muted)] font-bold">–</span>
      <input
        type="number"
        min="0"
        placeholder="A"
        className="w-12 p-1.5 text-center text-sm rounded-md"
        value={awayScore}
        onChange={(e) => onChange("awayScore", e.target.value)}
        disabled={disabled}
      />
      <button
        onClick={onSubmit}
        disabled={submitting || disabled}
        className={`px-3 py-1.5 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 ${VARIANT_STYLES[variant]}`}
      >
        {submitting ? "..." : submitLabel}
      </button>
    </div>
  );
}
