import { Link } from "react-router-dom";

const QUICK_RULES = [
  "Group-stage history stays preserved.",
  "Knockout fixtures open only after teams and kickoff are confirmed.",
  "Predictions lock at kickoff and cannot be changed after the match starts.",
  "PitchPulse 26 is free to play with no betting or gambling.",
];

const RULE_SECTIONS = [
  {
    eyebrow: "Tournament Scope",
    title: "Group stage history stays locked in",
    body:
      "Your group-stage predictions, points, and results are preserved. As knockout fixtures open, new predictions build on top of that history instead of replacing it.",
  },
  {
    eyebrow: "Knockout Stage",
    title: "New round, same challenge",
    body:
      "Knockout predictions open only for confirmed remaining fixtures. Already-started or completed matches stay locked, and your overall total keeps moving as new rounds finish.",
  },
  {
    eyebrow: "Prediction Lock",
    title: "Submit before kickoff",
    body:
      "You can update your scoreline until the match starts. Once kickoff happens, that prediction is locked and can no longer be changed, even if a new round has already begun.",
  },
  {
    eyebrow: "Scoring",
    title: "Simple scoring, every matchday",
    body:
      "Exact score = 3 points. Correct winner or draw = 1 point. Incorrect prediction = 0 points. The same simple scoring carries from the group stage into the knockout rounds.",
  },
  {
    eyebrow: "Leaderboards",
    title: "Track group stage, knockout, and overall",
    body:
      "Use the leaderboard tabs to view group-stage results, knockout-only points, or the full overall table. Group-stage points still count in the overall race.",
  },
  {
    eyebrow: "Fixture Status",
    title: "TBD knockout matches stay closed until they are real",
    body:
      "If a knockout slot still depends on another result, you may see a coming-soon or TBD state. Predictions only open once both teams and kickoff details are confirmed.",
  },
  {
    eyebrow: "Competition",
    title: "Friendly, free, and just football",
    body:
      "PitchPulse 26 is free to play and built for football fans. No betting or gambling is involved.",
  },
];

const SUPPORT_SECTIONS = [
  {
    title: "Verification before your first pick",
    body:
      "New accounts still need email verification before submitting predictions. If the message does not show up right away, check spam or promotions, then use the resend option in the app.",
  },
  {
    title: "Reminders are optional",
    body:
      "Match reminder emails are meant to help you return before kickoff, not flood your inbox. You can unsubscribe from reminders directly from any reminder email.",
  },
  {
    title: "Need help or spot an issue?",
    body:
      "If a fixture, score, or account flow looks wrong, reach out through the in-app support option so it can be corrected without affecting the rest of the tournament history.",
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
            Everything you need to know before you start predicting: how group-stage history carries forward, when picks lock, how points work, and why this stays a free football fan challenge.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,10,9,0.94))] px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:mt-10 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/85">
          Quick Rules
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {QUICK_RULES.map((rule) => (
            <div
              key={rule}
              className="rounded-2xl border border-white/10 bg-black/18 px-4 py-4 text-sm leading-6 text-white/84"
            >
              {rule}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-sky-500/20 bg-[linear-gradient(135deg,rgba(56,189,248,0.14),rgba(6,10,9,0.94))] px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:mt-10 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-sky-300/85">
          Tournament Update
        </p>
        <h2 className="mt-2 text-xl font-bold text-white">Knockout predictions are now open for remaining matches</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/78">
          Group stage is complete, and your points from that phase carry over into the overall leaderboard. Knockout rounds now add fresh results on top, while completed or already-started matches remain locked.
        </p>
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

      <section className="mt-8 rounded-2xl border border-amber-400/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.1),rgba(6,10,9,0.94))] px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:mt-10 sm:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-200/85">
          Good To Know
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {SUPPORT_SECTIONS.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-white/10 bg-black/16 p-4 shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
            >
              <h3 className="text-base font-semibold text-white">{section.title}</h3>
              <p className="mt-2 text-sm leading-7 text-white/75">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,10,9,0.9))] px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.12)] sm:mt-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-emerald-200/85">
              Ready to play?
            </p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Head to the Matches page, lock in the remaining fixtures, and watch the overall leaderboard keep shifting as each round finishes.
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
