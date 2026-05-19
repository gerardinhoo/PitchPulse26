# PitchPulse26 Load Test Baseline

## Purpose

This document combines the intent of:

- `PP-034 Load Testing (Artillery)`
- `PP-052 Load Test Baseline`

The goal is to make load testing repeatable and useful, not just runnable.

It gives us:

- a reusable Artillery scenario
- a documented baseline for latency and error rates
- a place to record CloudWatch observations
- a place to note likely bottlenecks and scaling risks

## Why the scenarios are split

PitchPulse26 has an important business rule:

- only **verified** users can submit predictions

That means a single `register -> login -> predict` flow is not a realistic end-to-end gameplay flow in the current app. To reflect the real product behavior, the load test is split into:

1. **Public registration flow**
   - measures onboarding pressure and auth creation latency
2. **Verified user prediction flow**
   - measures the main gameplay workload:
     - matches fetch
     - prediction save
     - leaderboard fetch

This makes the test more truthful and gives better data.

## Files

- Scenario: `tests/load/pitchpulse-baseline.yml`
- Processor helpers: `tests/load/processor.cjs`
- Verified-user fixture template: `tests/load/fixtures/verified-users.csv.example`
- Runner script: `scripts/run-load-test.sh`

## What the test covers

### Public registration flow

- `POST /api/auth/register`

### Verified user prediction flow

- `GET /api/matches?page=1&limit=20`
- `POST /api/predictions`
- `GET /api/leaderboard?page=1&limit=20`

This covers the highest-value traffic path for the app:

- auth
- match browsing
- prediction writes
- leaderboard reads

## Traffic profile

Current baseline profile in the Artillery scenario:

- warm up: `1 -> 5` arrivals/sec for `60s`
- core traffic: `5 -> 20` arrivals/sec for `120s`
- stress window: `20 -> 40` arrivals/sec for `120s`

This is intentionally a starting point, not a final production guarantee.

## Prerequisites

1. Have the target app running and reachable.
2. Copy the example fixture:

```bash
cp tests/load/fixtures/verified-users.csv.example tests/load/fixtures/verified-users.csv
```

3. Replace the example rows with **real JWT tokens for verified test users**.
4. Ensure the selected match fixture(s) are still open for predictions if testing against a real environment.

### Why tokens instead of logging in during the test?

The first version of the scenario logged in every virtual user. That mostly tested the auth rate limiter instead of the gameplay flows, because `/api/auth/login` is intentionally protected against bursts.

Using pre-generated JWTs makes the gameplay baseline more useful because it stresses:

- matches reads
- prediction writes
- leaderboard reads

instead of repeatedly tripping login protection.

### Getting a token

You can get a token by logging into the app normally and copying the JWT from local storage or from a successful login response.

Fixture format:

```csv
token
eyJhbGciOi...
eyJhbGciOi...
```

The processor reads this file directly and rotates through the listed tokens for verified-user traffic.

## How to run locally

Default target:

```bash
scripts/run-load-test.sh
```

The runner script provides the default:

- `http://localhost:5050/api`

Custom target:

```bash
TARGET_URL="https://your-api.example.com/api" scripts/run-load-test.sh
```

If you prefer a custom binary:

```bash
ARTILLERY_BIN="npx artillery@latest" TARGET_URL="https://your-api.example.com/api" scripts/run-load-test.sh
```

## How this can run in CI

The same scenario can be reused in CI later by:

- provisioning or injecting valid JWTs for verified test users
- setting `TARGET_URL`
- running `scripts/run-load-test.sh`

That keeps the baseline repeatable outside local development.

## CloudWatch checks during the run

During the test, capture the following from CloudWatch:

- Lambda `Invocations`
- Lambda `Errors`
- Lambda `Duration`
- API Gateway `4xx`
- API Gateway `5xx`
- request volume trends
- relevant structured logs using request/correlation ids if debugging is needed

## Baseline results

Fill this section in after each real run.

### Test metadata

- Date: May 18, 2026
- Environment: local backend
- Target URL: `http://localhost:5050/api`
- Verified-user fixture size: 2 JWTs
- Artillery version: local `artillery` install via `npx artillery`

### Response metrics

- Overall median latency: `242.3ms`
- Overall p95 latency: `7260.8ms`
- Overall p99 latency: `7865.6ms`
- Successful responses: `5156 x 200`, `20 x 201`
- Rate-limited responses: `1072 x 429`
- Timeout failures: `2776 ERR_SOCKET_TIMEOUT`

### Endpoint observations

- `/auth/register`: rate limiting behaved as expected under burst traffic and produced `429` responses during the public registration flow.
- `/matches`: participated in the verified-user flow successfully during warm-up and core traffic, but latency rose sharply during stress traffic.
- `/predictions`: prediction saves succeeded during moderate load but were affected by the same multi-second slowdown during stress traffic.
- `/leaderboard`: successful during moderate load; likely contributed to backend and database pressure once concurrency increased because it is a derived read.

### CloudWatch observations

- Lambda duration behavior: not captured in this local run
- Error spikes: local run showed request timeouts rather than cloud-runtime errors
- API 4xx / 5xx patterns: `429` responses were expected from auth rate limiting; no dominant `5xx` pattern was captured in the Artillery output
- Any cold-start or throttling signs: not applicable for local-only execution

## Likely bottlenecks / scaling risks

Use this section to record what the baseline suggests.

Examples:

- match dashboard or prediction summary reads are heavier than expected
- leaderboard remains expensive because it derives ranking from source-of-truth data
- database tier becomes the first constraint under concurrent gameplay traffic
- auth-related latency spikes during bursts

### Findings from the May 18, 2026 local baseline

- The app handled moderate traffic reasonably well in earlier phases, with successful-request medians around `200-215ms` and p95 often under `300ms`.
- Performance degraded heavily in the stress phase, where successful-request latency climbed into multi-second territory.
- At peak stress, p95 and p99 response times moved to roughly `7-8s`, and `ERR_SOCKET_TIMEOUT` failures appeared in large numbers.
- The registration scenario continued to trigger expected auth-rate-limit protection, which should not be confused with core gameplay instability.
- The first serious scaling warning for this app appears to be backend and database pressure under concurrent verified-user traffic, not frontend hosting.

## Follow-up actions

- Record this run as the first local baseline for `PP-034` and `PP-052`.
- Run a second baseline with a lower stress ceiling to define a cleaner “comfortable operating range.”
- Add a gameplay-only scenario if needed to isolate `/matches`, `/predictions`, and `/leaderboard` from registration-rate-limit noise.
- Inspect backend logs and database query behavior during high-latency windows to identify the main bottleneck.

Record the next optimization or reliability steps after each run.

Examples:

- cache leaderboard summaries
- reduce expensive match-related reads
- upgrade Neon tier
- add or tune edge delivery / CDN
- refine Lambda or DB connection behavior
