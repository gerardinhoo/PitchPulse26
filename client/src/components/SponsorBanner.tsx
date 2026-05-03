export default function SponsorBanner() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 flex items-center justify-center gap-3 text-sm text-[var(--color-text-muted)]">
        <span className="uppercase tracking-wider text-xs font-medium opacity-60">
          Sponsored by
        </span>
        <a
          href="https://yoursponsorship.link"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--color-accent)] hover:underline"
        >
           Coming Soon...
        </a>
      </div>
    </div>
  );
}
