# Tournament operations (post World Cup 2026)

Concise operational history for PitchPulse 26. Full case-study docs belong in a later documentation phase.

## What happened

1. Fixtures were imported stage by stage (group stage → Round of 32 → … → Final) using idempotent Prisma scripts under `server/prisma/`.
2. Match reminders ran during the live tournament via GitHub Actions + `POST /api/reminders/run-next-day`.
3. After the Final, the product became a public archive (homepage, Matches, Leaderboard) with prediction writes closed.
4. **Scheduled reminder cron is disabled**; manual workflow dispatch remains for maintenance.
5. Production tournament data (users, predictions, fixtures, results, leaderboard) is preserved.
6. Admin historical result correction remains available.

## Do not

- Reset or seed the production database
- Casually re-run fixture import scripts against production
- Delete users, predictions, or matches

See also: [server/prisma/ARCHIVE.md](../server/prisma/ARCHIVE.md).
