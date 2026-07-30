# Production runbook

Operational guide for PitchPulse 26 after World Cup 2026. Production data is a **historical archive** — prefer read-only verification. Admin score correction remains available when a historical result must be fixed.

Related: [deployment-rollback.md](runbooks/deployment-rollback.md), [server/prisma/ARCHIVE.md](../server/prisma/ARCHIVE.md), [tournament-operations.md](tournament-operations.md).

## Environments

| Environment | Purpose |
|-------------|---------|
| Local | Developer machine + personal Neon (or other) database |
| Staging / branch Neon | Experiments and dry-runs — never confuse with production |
| Production | Live archive at [pitchpulse26.com](https://pitchpulse26.com) + Lambda API |

Always confirm which `DATABASE_URL` you are using before migrations or imports.

## Health and readiness

Production API base (from CI / existing docs):

`https://fqblsiujfj.execute-api.us-east-1.amazonaws.com/api`

```bash
# Liveness — process is up
curl -i https://fqblsiujfj.execute-api.us-east-1.amazonaws.com/api/health

# Readiness — includes database check
curl -i https://fqblsiujfj.execute-api.us-east-1.amazonaws.com/api/ready
```

| Endpoint | Meaning |
|----------|---------|
| `/api/health` | Service responds; does not prove DB schema correctness |
| `/api/ready` | Service can reach Postgres (`SELECT 1`) |

## Verify the frontend

1. Open https://pitchpulse26.com
2. Confirm archive homepage (tournament complete messaging)
3. Open `/leaderboard`, `/statistics`, `/rules`
4. Sign in and open `/matches` (match archive; predictions closed)
5. Check browser console for hard failures

## Verify the API

```bash
curl -s https://fqblsiujfj.execute-api.us-east-1.amazonaws.com/api/health
curl -s https://fqblsiujfj.execute-api.us-east-1.amazonaws.com/api/leaderboard?page=1\&limit=5
curl -s https://fqblsiujfj.execute-api.us-east-1.amazonaws.com/api/statistics/tournament | jq '{tournamentComplete,participation,standings,worldCupFinal}'
```

Authenticated prediction **POST** should return `403` while the Final remains complete.

## CloudWatch logs

1. Dashboard: `pitchpulse26-prod-overview`
2. Log group: `/aws/lambda/pitchpulse26-api`
3. Filter on `level\":\"error\"` or a known `requestId` / `event`
4. Correlate with API Gateway 5xx on the same dashboard

Useful structured fields: `timestamp`, `level`, `event`, `requestId`, `correlationId`, `method`, `path`, `statusCode`, `userId`, `durationMs`.

## Database connectivity

- Prefer `/api/ready` over guessing.
- Prisma Studio / `psql` against production only when necessary and intentional.
- Confirm Neon project/branch name before any write.

## Prisma migrations (safe)

```bash
cd server
# Confirm DATABASE_URL target first
npx prisma migrate status
npx prisma migrate deploy
```

### Dangerous — do not use on production history

```bash
npx prisma migrate reset
npx prisma db push --force-reset
# seed.js against production
```

**Code deployment does not automatically guarantee database schema compatibility.** Apply migrations to the correct database before depending on new schema fields in Lambda.

## Fixture imports (historical / rare)

Scripts under `server/prisma/` (`import:round-of-32`, … `import:final`) use idempotent upserts and support `--dry-run`.

```bash
cd server
npm run import:final -- --dry-run
# Only proceed against an intentional target database
```

### Warnings

- Do **not** casually re-run imports against production history.
- Do **not** overwrite completed results or predictions.
- Do **not** point production `DATABASE_URL` at a staging Neon branch.
- Do **not** truncate production tables.

See [ARCHIVE.md](../server/prisma/ARCHIVE.md).

## Verify leaderboard / statistics

1. Compare UI `/leaderboard` top ranks with API `GET /api/leaderboard`
2. Compare UI `/statistics` with `GET /api/statistics/tournament`
3. After an admin score correction, refresh both — points are computed at read time via `calculatePoints`

## Rollback a bad deployment

Follow [runbooks/deployment-rollback.md](runbooks/deployment-rollback.md):

- Frontend: Amplify previous good build or revert `main`
- Backend: redeploy prior S3 Lambda artifact by commit SHA
- Database: last resort; prefer forward-fixing migrations

## Restore after a schema mismatch

Typical pattern (also covered in [incident-history.md](incident-history.md)):

1. Detect 500s on match/prediction routes referencing missing columns/enums
2. Roll back Lambda to last compatible artifact if needed to restore service
3. Baseline or apply pending migrations correctly on production Neon
4. Redeploy application code that expects the new schema
5. Import any missing fixtures with `--dry-run` first
6. Re-check health, ready, matches, leaderboard

## Command cheatsheet

### Generally safe

```bash
curl -i .../api/health
curl -i .../api/ready
npx prisma migrate status
npx prisma migrate deploy          # after confirming DATABASE_URL
npm test                           # local/CI
aws lambda get-function --function-name pitchpulse26-api
```

### Dangerous on production

```bash
npx prisma migrate reset
npx prisma db push --force-reset
node prisma/seed.js                # with production DATABASE_URL
# Any SQL TRUNCATE / DROP on users, predictions, matches
# Fixture import without --dry-run and without target confirmation
```
