# Incident history

Honest operational notes from running PitchPulse 26 during World Cup 2026. Timestamps and outage durations are intentionally omitted where not recorded; impact is described qualitatively.

---

## 1. Production schema mismatch during knockout-stage rollout

### Summary
Application code expecting knockout `tournamentStage` support was deployed before the production database schema fully matched that code path.

### Impact
Knockout-related API routes failed for users (HTTP 500s) when querying or writing against matches that depended on the new stage field/enum.

### Root Cause
Code and database migrations were treated as a single “deploy,” but Lambda updates and Prisma migrations were separate steps. Production Neon had not received the required migration when the new code went live.

### Detection
User-facing failures and elevated Lambda/API Gateway errors in CloudWatch after the knockout deployment.

### Resolution
Service restored by reverting to a previous Lambda artifact, then applying the correct migration path and re-deploying compatible code (see incidents 2–4 and 6–8).

### Prevention / Follow-up
Document that **code deploy ≠ schema deploy**. Add explicit migrate-status checks to operator checklists before schema-dependent releases.

### Lessons Learned
Production databases must be migrated deliberately; CI health checks that only hit `/api/health` will not catch missing columns.

---

## 2. Prisma P3005 baseline issue

### Summary
Prisma refused to apply migrations on a database that already had tables but lacked a matching migration history (P3005 / baseline situation).

### Impact
Blocked a clean `migrate deploy` on production until history was baselined, delaying the safe path to ship knockout schema changes.

### Root Cause
The live database had evolved (or been created) in a way that did not line up with the migration folder Prisma expected to apply from scratch.

### Detection
`prisma migrate deploy` / migrate status failures reporting P3005 (or equivalent “database schema is not empty”) during the knockout remediation.

### Resolution
Baselined existing migrations against production so Prisma recognized applied history, then continued with the remaining migration(s).

### Prevention / Follow-up
Keep migration history authoritative for every long-lived environment; avoid ad-hoc schema edits outside Prisma.

### Lessons Learned
Long-lived Neon branches need an intentional baseline strategy before the first production migration crisis.

---

## 3. Production API 500s from missing `tournamentStage` migration

### Summary
Queries involving `Match.tournamentStage` failed because the production column/enum was not present.

### Impact
Match listings and related flows errored; knockout expansion could not proceed safely.

### Root Cause
Same class of issue as incident 1: application assumed a migrated schema.

### Detection
CloudWatch exception logs referencing unknown column / enum / Prisma errors on match routes.

### Resolution
Applied the production migration after baselining (incident 6–7), then verified match reads.

### Prevention / Follow-up
Smoke-test authenticated and public match endpoints after any schema change — not only `/api/health`.

### Lessons Learned
Feature flags or expand-contract migrations would have reduced blast radius; at minimum, migrate-before-code for additive columns.

---

## 4. Round of 32 fixtures only in staging/local

### Summary
Knockout fixture rows existed in non-production databases while production still had group-stage (or incomplete) data.

### Impact
Even with schema fixed, production users could not predict Round of 32 matches until fixtures were imported into production.

### Root Cause
Fixture import scripts were run against local/staging during development; production import was a separate operational step that lagged the code rollout.

### Detection
Empty or missing knockout filters in production vs presence in staging; comparison of match counts by stage.

### Resolution
Ran idempotent Round of 32 import against production with dry-run first, then live import (incident 8).

### Prevention / Follow-up
Treat fixture import as a checklist item tied to each knockout release; document environment target explicitly.

### Lessons Learned
Data rollout is part of the feature. Schema + code without production rows is still an incomplete release.

---

## 5. Reverting the deployment to restore service

### Summary
The knockout expansion PR was reverted in production (see merge history: revert of knockout stage work) to restore a working group-stage experience while remediation continued.

### Impact
Temporary loss of knockout features; restored reliability for existing users and predictions.

### Root Cause
Forward fix was not yet safe; rollback was the fastest path to a known-good Lambda/frontend combination.

### Detection
Ongoing 500s / failed user journeys after the initial knockout deploy.

### Resolution
Git revert / redeploy previous artifact; communicate that knockout would return after schema + fixtures were ready.

### Prevention / Follow-up
Keep versioned Lambda artifacts in S3 (now part of CI) and maintain the [deployment rollback runbook](runbooks/deployment-rollback.md).

### Lessons Learned
A practiced rollback is more valuable than pushing harder on a broken forward deploy.

---

## 6. Baselining old migrations

### Summary
Operators marked historical migrations as applied on production so Prisma could move forward cleanly.

### Impact
Short operational maintenance window; unblocked subsequent `migrate deploy` of the knockout schema change.

### Root Cause
Migration history drift (incident 2).

### Detection
Migrate tooling errors until baseline completed.

### Resolution
Baseline procedure completed; migration status reconciled.

### Prevention / Follow-up
For new environments, always start from `migrate deploy` with empty DB or a documented baseline.

### Lessons Learned
Baselining is a deliberate, careful operation — not a routine shortcut.

---

## 7. Applying the production migration

### Summary
After baseline, the knockout-related Prisma migration was applied to production Neon.

### Impact
Enabled `tournamentStage` (and related) usage without 500s.

### Root Cause
N/A — this was the corrective action.

### Detection
`migrate status` clean; match queries succeeding.

### Resolution
`prisma migrate deploy` against the confirmed production `DATABASE_URL`.

### Prevention / Follow-up
Pair every schema PR with an explicit production migrate step in the release notes.

### Lessons Learned
Additive, backward-compatible migrations make rollback of **code** safer while schema remains.

---

## 8. Importing knockout fixtures safely

### Summary
Round of 32 (and later rounds) were imported with dry-run-capable upsert scripts that avoid clobbering completed results.

### Impact
Production gained the correct fixtures for prediction and archive history.

### Root Cause
N/A — planned operational work after schema recovery.

### Detection
Match counts by stage; UI stage filters populated.

### Resolution
`npm run import:<stage> -- --dry-run` then import; repeated per round through the Final.

### Prevention / Follow-up
Preserve scripts under `server/prisma/` and document in ARCHIVE.md rather than deleting after the tournament.

### Lessons Learned
Idempotent imports + dry-run turn a scary production data change into a reviewable step.

---

## 9. Email verification deliverability / spam issue

### Summary
Verification emails were delayed or filtered as spam for some providers during the SES era and early Resend configuration, blocking users from predicting when verification was required.

### Impact
Frustrated onboarding; some users needed resends or temporary process workarounds. Application branches/PRs tracked spam/deliverability fixes (`fix_spam_issue`, Resend migration notes in README history).

### Root Cause
Domain authentication (SPF/DKIM/DMARC), from-address reputation, and provider filtering — not application auth logic itself.

### Detection
User reports of missing verification mail; resend flows used heavily.

### Resolution
Improved sending domain configuration and moved transactional email to Resend in application code; kept verification + password reset on Resend.

### Prevention / Follow-up
Monitor bounce/spam complaints in the email provider; keep `EMAIL_FROM` on a verified domain (`updates.pitchpulse26.com` pattern in env examples).

### Lessons Learned
If predictions require verified email, mail deliverability is a core product dependency.

---

## 10. Missed early knockout prediction windows

### Summary
Some early knockout matches had short or awkward prediction windows relative to when fixtures appeared in the app (import timing vs kickoff).

### Impact
Fewer predictions on early knockout fixtures than group stage; some fans missed picks entirely for specific matches.

### Root Cause
Operational lag between real-world bracket determination, fixture import, and user notification — not a scoring bug.

### Detection
Lower prediction counts on early knockout stages (visible later in statistics by stage); user feedback.

### Resolution
Tightened the import cadence for later rounds; reminders existed during the live tournament (cron now disabled). No alteration of historical locks.

### Prevention / Follow-up
For a future tournament: publish fixtures earlier, automate bracket ingestion, and notify users when a new stage opens.

### Lessons Learned
Live sports products are paced by the real schedule. Engineering process has to match that pace.

---

## Cross-cutting takeaway

The hardest production week was not “writing React.” It was coordinating **schema, code, and data** under a live tournament clock — and recovering calmly when those three drifted apart.
