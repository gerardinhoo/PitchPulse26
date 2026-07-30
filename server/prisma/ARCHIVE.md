# Tournament operations archive

PitchPulse 26 ran as a live World Cup 2026 prediction app. After the Final, production data is preserved as a read-only historical archive for users, with admin result correction still available.

## Fixture import scripts (historical)

These one-time scripts live next to Prisma for operational continuity. They were used stage by stage during the tournament:

| Script | npm command |
|--------|-------------|
| `import-round-of-32-fixtures.js` | `npm run import:round-of-32` |
| `import-round-of-16-fixtures.js` | `npm run import:round-of-16` |
| `import-quarter-final-fixtures.js` | `npm run import:quarter-final` |
| `import-semi-final-fixtures.js` | `npm run import:semi-final` |
| `import-third-place-fixtures.js` | `npm run import:third-place` |
| `import-final-fixtures.js` | `npm run import:final` |

Related maintenance tools:

- `backfill-group-stage-matches.js` — `npm run backfill:group-stage`
- `sync-official-group-stage-fixtures.js` — `npm run sync:official-group-stage`
- `seed.js` — **local/dev only**; never run against the historical production database

### Safety

- Imports use **idempotent upsert** behavior with `--dry-run` support.
- They must **not** overwrite completed results or existing predictions.
- Do **not** casually re-run them against production.
- Do **not** reset, reseed, or delete tournament history.

Root-level wrappers (`npm run import:final`, etc.) still call the server scripts for documentation and rare maintenance.

## Match reminders (historical)

During the live tournament, next-day match reminders were sent via:

- `POST /api/reminders/run-next-day` (secret-protected)
- `.github/workflows/reminders.yml`

**Scheduled cron execution is disabled** after tournament completion. Manual `workflow_dispatch` remains available for dry-runs or future events (still gated by `ENABLE_MATCH_REMINDERS`).

Unsubscribe and preference endpoints remain so historical emails and settings stay coherent. Account verification and password-reset email are unrelated and stay active.

## Admin maintenance

Admins can still correct historical match results through the existing admin UI and `PATCH /api/admin/matches/:id/result` flow, including audit logging and scoring recalculation.

Case-study docs: [docs/README.md](../../docs/README.md), [docs/production-runbook.md](../../docs/production-runbook.md).

## Package script classification

**Active:** `dev`, `test`, Prisma migrate/generate (via standard Prisma CLI), deploy workflows.

**Historical / manual:** all `import:*`, `backfill:group-stage`, `sync:official-group-stage`, reminder workflow dispatch.

**Do not use on production history:** Prisma `seed`.
