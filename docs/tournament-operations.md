# Tournament operations (post World Cup 2026)

Short operational note. Fuller case-study docs live in this folder — start at [README.md](README.md).

## What happened

1. Fixtures were imported stage by stage (group stage → Round of 32 → … → Final) using idempotent Prisma scripts under `server/prisma/`.
2. Match reminders ran during the live tournament via GitHub Actions + `POST /api/reminders/run-next-day`.
3. After the Final, the product became a public archive (homepage, Matches, Leaderboard, Statistics) with prediction writes closed.
4. **Scheduled reminder cron is disabled**; manual `workflow_dispatch` remains for maintenance.
5. Production tournament data (users, predictions, fixtures, results, leaderboard) is preserved.
6. Admin historical result correction remains available.

## Do not

- Reset or seed the production database
- Casually re-run fixture import scripts against production
- Delete users, predictions, or matches

## See also

- [production-runbook.md](production-runbook.md)
- [incident-history.md](incident-history.md)
- [tournament-lifecycle.md](tournament-lifecycle.md)
- [server/prisma/ARCHIVE.md](../server/prisma/ARCHIVE.md)
