import { Link } from "react-router-dom";

const RULE_SECTIONS = [
  {
    eyebrow: "Tournament Scope",
    title: "Built for the World Cup tournament",
    body:
      "PitchPulse 26 covered the FIFA World Cup 2026 from the group stage through the knockout rounds and Final. Group-stage points carried over, and every eligible knockout prediction could change the leaderboard.",
  },
  {
    eyebrow: "Prediction Lock",
    title: "Predictions locked at kickoff",
    body:
      "Players could update a scoreline until the match started. Once kickoff happened, that prediction was locked and could no longer be changed.",
  },
  {
    eyebrow: "Scoring",
    title: "Simple scoring, every matchday",
    body:
      "Exact score = 3 points. Correct winner or draw = 1 point. Incorrect prediction = 0 points.",
  },
  {
    eyebrow: "Competition",
    title: "Friendly, free, and football-first",
    body:
      "PitchPulse 26 was free to play and built for football fans. No betting or gambling was involved.",
  },
  {
    eyebrow: "Prize",
    title: "Top prize",
    body:
      "The player who finished 1st on the leaderboard chose a World Cup jersey. The winner selected a Cape Verde jersey.",
    note: "Prize was a thank-you for participating. Free to play. No betting. No gambling.",
  },
  {
    eyebrow: "Status",
    title: "Tournament complete",
    body:
      "The World Cup 2026 tournament is complete and predictions are closed. PitchPulse 26 remains available as a historical archive and portfolio project.",
  },
];

export default function Rules() {
  return (
    <div className="animate-fade-in">
      <section className="rounded-[2rem] border border-white/10 bg-[rgba(7,12,14,0.5)] px-5 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-sm sm:px-8 sm:py-10">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/85">
            Rules
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            How PitchPulse 26 worked
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
            Documentation for the completed World Cup 2026 prediction experience: which matches
            counted, when picks locked, how points worked, and how the leaderboard ran through the
            Final.
          </p>
          <p className="mt-3 text-sm font-medium text-amber-100/90">
            The World Cup 2026 tournament is complete and predictions are closed.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2">
        {RULE_SECTIONS.map((section) => (
          <article
            key={section.title}
            className="rounded-2xl border border-white/10 bg-white/4 p-5 shadow-[0_10px_24px_rgba(0,0,0,0.12)]"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
              {section.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
              {section.body}
            </p>
            {"note" in section && section.note ? (
              <p className="mt-3 text-xs leading-6 text-white/55">{section.note}</p>
            ) : null}
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,10,9,0.9))] px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:mt-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/85">
              Explore the archive
            </p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Review final standings and browse every match result from the completed tournament.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/matches?view=completed"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Explore Match History
            </Link>
            <Link
              to="/leaderboard"
              className="inline-flex items-center justify-center rounded-lg border border-white/18 bg-black/20 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black/30 hover:border-white/28"
            >
              View Final Standings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
