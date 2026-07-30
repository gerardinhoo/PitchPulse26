# Observability

## What exists

| Signal | Implementation |
|--------|----------------|
| Structured application logs | `server/lib/logger.js` → JSON lines to stdout (CloudWatch via Lambda) |
| Request logging middleware | Attaches request/correlation ids; logs completed HTTP requests |
| Health | `GET /api/health` — process up |
| Readiness | `GET /api/ready` — `SELECT 1` against Postgres |
| Dashboard | CloudWatch `pitchpulse26-prod-overview` (Terraform `infra/monitoring.tf`) |
| Alarms | Lambda errors, API Gateway 5xx, high Lambda duration |
| Log retention | 14 days (`/aws/lambda/pitchpulse26-api`, API Gateway log group) |

No dedicated APM vendor, distributed tracing product, or error-tracking SaaS is required by the current codebase.

## Useful log fields

```json
{
  "timestamp": "2026-07-30T19:13:09.538Z",
  "level": "info",
  "event": "http.request.completed",
  "requestId": "...",
  "correlationId": "...",
  "method": "GET",
  "path": "/api/leaderboard",
  "statusCode": 200,
  "userId": null,
  "durationMs": 0.4
}
```

Admin result updates also emit events such as `admin.match_result.updated` with match id and old/new scores.

## Health vs readiness

| Check | Passes when | Does not prove |
|-------|-------------|----------------|
| Health | Lambda/Express responds | Schema correctness, Amplify UI, Resend |
| Ready | DB accepts a trivial query | Migration currency, fixture completeness |

## Deployment verification

CI post-deploy step curls production `/api/health` and fails the job on non-200. Operators should also hit `/api/ready` and spot-check UI after schema-sensitive deploys.

## 500 investigation checklist

1. CloudWatch dashboard: Lambda Errors / API 5xx spike?
2. Lambda duration rising (timeouts / DB stalls)?
3. Open `/aws/lambda/pitchpulse26-api` — search `level\":\"error\"` near the spike.
4. Note `path`, `event`, stack/message, `requestId`.
5. Hit `/api/health` and `/api/ready`.
6. If deploy-correlated: compare current Lambda artifact SHA vs last good; consider rollback runbook.
7. If Prisma/schema symptoms: check `migrate status` on the **production** database (do not reset).
8. Confirm frontend Amplify deploy independently if only the UI is broken.

## Production troubleshooting workflow

```text
User report / alarm
  → Dashboard metrics
  → Lambda logs (requestId)
  → health + ready
  → recent GitHub Actions deploy
  → rollback or migrate/fix forward
  → re-verify leaderboard/statistics/matches
```
