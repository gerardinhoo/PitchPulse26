# Testing

## Automated suites

### Backend (`server/`, Vitest)

| Area | Where |
|------|--------|
| Scoring (`calculatePoints`, dense ranking) | `tests/services/leaderboard.test.js` |
| Tournament stage helpers | `tests/services/tournamentStage.test.js` |
| Tournament-complete detection | `tests/services/tournamentComplete.test.js` |
| Statistics aggregates + privacy | `tests/services/tournamentStatistics.test.js` |
| Auth middleware | `tests/middleware/auth.test.js` |
| Zod validators | `tests/validators.test.js` |
| Groups standings | `tests/services/groups.test.js` |
| Reminder workflow YAML (no cron) | `tests/workflows/remindersWorkflow.test.js` |
| HTTP integration (register, predict, lock, admin, leaderboard, write gate) | `tests/integration/api.test.js` |

Integration tests use an in-memory Prisma mock + Supertest against the Express app.

### Frontend (`client/`, Vitest + Testing Library)

| Area | Where |
|------|--------|
| Matches archive mode | `src/test/pages/Matches.test.tsx` |
| Final standings / champion derivation | `src/test/pages/Leaderboard.test.tsx` |
| Statistics loading / error / metrics | `src/test/pages/Statistics.test.tsx` |
| Auth pages | `src/test/pages/AuthPages.test.tsx` |
| Tournament complete helpers | `src/test/utils/tournamentComplete.test.ts` |
| Stage helpers | `src/test/utils/tournamentStage.test.ts` |
| Install banner, Navbar, ScoreInput, etc. | `src/test/components/*` |

### CI

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs frontend lint/test/build and backend tests on PRs and `main`.

### Load testing (optional)

Artillery baseline notes: [performance/load-test-baseline.md](performance/load-test-baseline.md). Not a merge gate.

## Commands

```bash
cd client && npm run lint && npm test && npm run build
cd server && JWT_SECRET=test-secret npm test
```

## Manual production QA checklist

- [ ] Register / login / logout
- [ ] Email verification resend path (mail provider permitting)
- [ ] Password forgot/reset (staging preferred)
- [ ] Match archive loads; stage filters work
- [ ] User prediction history visible for past picks
- [ ] Prediction POST rejected after Final (`403`)
- [ ] Final standings + champion card
- [ ] Statistics page metrics load / retry
- [ ] Admin result correction + audit (admin only)
- [ ] Mobile nav + touch targets
- [ ] PWA manifest reachable; install banner not aggressive post-tournament
- [ ] `/api/health` and `/api/ready` return success

## Regression priorities after docs-only changes

Documentation PRs should not change product behavior. Still run frontend lint/test/build and backend tests if the branch also contains code — for pure markdown, CI may still run on PR depending on workflow paths (current workflow runs on all PR files).
