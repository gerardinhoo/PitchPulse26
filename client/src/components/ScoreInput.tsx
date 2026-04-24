import type React from "react";

type Props = {
  homeScore: string;
  awayScore: string;
  onChange: (field: "homeScore" | "awayScore", value: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitting?: boolean;
  variant?: "default" | "saved" | "admin";
  disabled?: boolean;
  homeLabel?: string;
  awayLabel?: string;
  submitAriaLabel?: string;
  idPrefix?: string;
  onFocusCapture?: React.FocusEventHandler<HTMLDivElement>;
  onBlurCapture?: React.FocusEventHandler<HTMLDivElement>;
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
  homeLabel = "Home score",
  awayLabel = "Away score",
  submitAriaLabel,
  idPrefix = "score-input",
  onFocusCapture,
  onBlurCapture,
}: Props) {
  return (
    <div
      className="w-full sm:w-auto"
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <label htmlFor={`${idPrefix}-home`} className="sr-only">
              {homeLabel}
            </label>
            <input
              id={`${idPrefix}-home`}
              type="number"
              min="0"
              placeholder="H"
              className="w-full min-h-12 p-2 text-center text-base sm:w-12 sm:min-h-0 sm:p-1.5 sm:text-sm rounded-md"
              value={homeScore}
              onChange={(e) => onChange("homeScore", e.target.value)}
              disabled={disabled}
              inputMode="numeric"
              aria-label={homeLabel}
              required
            />
          </div>
          <span className="text-[var(--color-text-muted)] font-bold text-center">–</span>
          <div>
            <label htmlFor={`${idPrefix}-away`} className="sr-only">
              {awayLabel}
            </label>
            <input
              id={`${idPrefix}-away`}
              type="number"
              min="0"
              placeholder="A"
              className="w-full min-h-12 p-2 text-center text-base sm:w-12 sm:min-h-0 sm:p-1.5 sm:text-sm rounded-md"
              value={awayScore}
              onChange={(e) => onChange("awayScore", e.target.value)}
              disabled={disabled}
              inputMode="numeric"
              aria-label={awayLabel}
              required
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || disabled}
          aria-label={submitAriaLabel || submitLabel}
          className={`min-h-12 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 sm:min-h-0 sm:w-auto sm:px-3 sm:py-1.5 sm:rounded-md sm:text-sm ${VARIANT_STYLES[variant]}`}
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
