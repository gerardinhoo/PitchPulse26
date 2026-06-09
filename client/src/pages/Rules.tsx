import { Link } from "react-router-dom";

const RULE_SECTIONS = [
  {
    eyebrow: "Tournament Scope",
    title: "Built for the World Cup group stage",
    body:
      "PitchPulse 26 currently covers World Cup group-stage matches. Every prediction, point, and leaderboard movement is based on those fixtures.",
  },
  {
    eyebrow: "Prediction Lock",
    title: "Submit before kickoff",
    body:
      "You can update your scoreline until the match starts. Once kickoff happens, that prediction is locked and can no longer be changed.",
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
      "PitchPulse 26 is free to play and built for football fans. No betting or gambling is involved.",
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
            How to play PitchPulse 26
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
            Everything you need to know before you start predicting: what matches count,
            when picks lock, how points work, and why this stays a free football fan
            challenge.
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
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,10,9,0.9))] px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:mt-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/85">
              Ready to play?
            </p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Head to the Matches page, lock in your group-stage picks, and watch the
              leaderboard shift as results come in.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/matches"
              className="inline-flex items-center justify-center rounded-lg bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              Start Predicting
            </Link>
            <Link
              to="/leaderboard"
              className="inline-flex items-center justify-center rounded-lg border border-white/18 bg-black/20 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-black/30 hover:border-white/28"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
