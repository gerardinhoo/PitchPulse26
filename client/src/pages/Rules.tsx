import { Link } from "react-router-dom";

const RULE_SECTIONS = [
  {
    eyebrow: "Tournament Scope",
    title: "Built for the World Cup tournament",
    body:
      "PitchPulse 26 started with the group stage and now continues through the knockout rounds. Your group-stage points carry over, and every eligible knockout prediction can help you climb the leaderboard.",
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
  {
    eyebrow: "Prize",
    title: "Top prize",
    body:
      "Finish 1st on the leaderboard and win the World Cup jersey of your choice.",
    note: "Prize is a thank-you for participating. Free to play. No betting. No gambling.",
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
            Everything you need to know before predicting: which matches count, when picks
            lock, how points work, and how the leaderboard continues through the knockout
            stage.
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
              Ready to play?
            </p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Head to the Matches page, lock in your knockout picks before kickoff, and keep
              climbing the leaderboard as results come in.
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
