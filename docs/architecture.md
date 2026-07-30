# Architecture

PitchPulse 26 is a serverless full-stack application: a React SPA on AWS Amplify talking to an Express API on AWS Lambda (HTTP API Gateway), with Neon PostgreSQL via Prisma and Resend for transactional email.

## High-level system architecture

```mermaid
flowchart TB
  subgraph Clients
    Browser[Browser]
    PWA[Installed PWA]
  end

  subgraph AWS
    Amplify[AWS Amplify<br/>static React + Vite build]
    APIGW[API Gateway<br/>HTTP API]
    Lambda[Lambda: pitchpulse26-api<br/>Express]
    CW[CloudWatch<br/>logs, dashboard, alarms]
    S3[S3: lambda-artifacts]
    SSM[SSM Parameter Store]
  end

  subgraph DataAndEmail
    Neon[(Neon PostgreSQL)]
    Resend[Resend API]
  end

  subgraph Delivery
    GH[GitHub Actions]
    TF[Terraform infra/]
  end

  Browser --> Amplify
  PWA --> Amplify
  Amplify -->|HTTPS JSON| APIGW
  APIGW --> Lambda
  Lambda --> Neon
  Lambda --> Resend
  Lambda --> CW
  GH -->|build + deploy zip| S3
  S3 --> Lambda
  GH -->|Amplify rebuild on main| Amplify
  TF --> Amplify
  TF --> APIGW
  TF --> Lambda
  TF --> CW
  TF --> SSM
```

### Component notes

| Component | Role in this repo |
|-----------|-------------------|
| `client/` | React + TypeScript UI, React Router, Tailwind, service worker in production |
| `server/src/index.js` | Express app: auth, matches, predictions, leaderboard, groups, admin, reminders, statistics |
| Prisma | Schema + migrations under `server/prisma/`; Neon adapter for serverless |
| Amplify | Hosts the frontend build from `main` |
| Lambda + API Gateway | Hosts `/api/*` |
| Resend | Verification, password reset, historical match-reminder emails |
| Terraform `infra/` | Lambda, API Gateway, Amplify app, monitoring, SSM, SES domain identity (email sending moved to Resend in application code) |

Services **not** used as primary runtime today: container orchestration, Redis, dedicated chart SaaS, native mobile apps.

## Prediction submission and scoring flow

```mermaid
sequenceDiagram
  actor User
  participant UI as React Matches UI
  participant API as Express /api/predictions
  participant DB as Neon via Prisma

  User->>UI: Enter score prediction
  UI->>API: POST /api/predictions (JWT)
  API->>API: Validate body (Zod)
  API->>API: Require verified email (if enabled)
  API->>API: Reject if tournament complete (Final scored)
  API->>DB: Load match
  API->>API: Reject if kickoff passed (lock)
  API->>DB: Upsert Prediction unique(userId, matchId)
  API-->>UI: Saved prediction

  Note over API,DB: Scoring is computed at read time

  User->>UI: Open Leaderboard / Statistics
  UI->>API: GET /api/leaderboard or /api/statistics/tournament
  API->>DB: Load users + predictions on scored matches
  API->>API: calculatePoints exact=3 / result=1 / else=0
  API-->>UI: Rankings or aggregate metrics
```

Admin flow: authenticated admin calls `PATCH /api/admin/matches/:id/result`, which updates scores, writes `AdminAuditLog`, and causes subsequent leaderboard/statistics reads to reflect new points.

## Deployment flow (GitHub → AWS)

```mermaid
flowchart LR
  Dev[Developer PR] --> CI[GitHub Actions<br/>lint / test / build]
  CI --> Main[Merge to main]
  Main --> FE[Amplify rebuild frontend]
  Main --> Zip[Build Lambda zip<br/>prisma generate]
  Zip --> S3[Upload S3 artifact<br/>commit SHA key]
  S3 --> Lambda[Update Lambda code]
  Lambda --> Health[curl /api/health]
  Note1[Operator applies Prisma migrate deploy<br/>to Neon separately when schema changes]
  Main -.-> Note1
```

**Code deployment does not automatically guarantee database schema compatibility.**

## Key runtime behaviors

- **Tournament complete:** Final match has both scores → prediction writes `403`; archive UX on the client.
- **Statistics:** `GET /api/statistics/tournament` aggregates participation, outcomes, standings highlights, Final result — read-only.
- **Reminders:** `POST /api/reminders/run-next-day` remains secret-protected; GitHub cron schedule is disabled post-tournament.
