# Engineering decisions

ADR-style notes grounded in what the repository actually does. Not an exhaustive decision log.

---

## ADR-001: Serverless AWS for the API

### Context
Need a low-ops backend that can be deployed from GitHub without managing long-lived servers, suitable for a portfolio/production app with bursty sports traffic.

### Decision
Run Express inside AWS Lambda behind API Gateway; package with a build script; store versioned zips in S3.

### Consequences
(+) Simple deploy path, pay-per-use, Terraform-friendly.  
(−) Cold starts, zip size/Prisma constraints, env drift if Lambda config is not updated with code.

---

## ADR-002: Neon PostgreSQL

### Context
Need hosted Postgres with a generous free tier and serverless-friendly connections after leaving SQLite.

### Decision
Use Neon with Prisma’s Neon serverless adapter (`@prisma/adapter-neon` + `ws`).

### Consequences
(+) Managed Postgres, branch-friendly workflows for non-prod.  
(−) Easy to confuse branches; production URL discipline is mandatory.

---

## ADR-003: Prisma ORM

### Context
Want typed schema, migrations, and a single source of truth for models (User, Match, Prediction, …).

### Decision
Prisma schema + migrate deploy; generate client in CI before Lambda packaging.

### Consequences
(+) Clear migrations and seed/import scripts.  
(−) Migration baseline issues on long-lived DBs; generate step must run in deploy.

---

## ADR-004: Group-stage points carry into knockout

### Context
A World Cup-long competition should reward consistency, not only late bracket luck.

### Decision
Store no separate “season reset.” `buildLeaderboard` sums group + knockout via `calculatePoints`; UI offers overall / group / knockout scopes.

### Consequences
(+) Fair cumulative race; scopes still allow stage-focused views.  
(−) Late joiners cannot fully catch early volume without exceptional knockout scores.

---

## ADR-005: Cumulative overall leaderboard

### Context
Fans expect one primary table for “who is winning PitchPulse.”

### Decision
Default overall standings = total points; dense ranking with tie counts.

### Consequences
(+) Simple story for champion announcement.  
(−) Must keep scoring pure functions consistent across leaderboard, summary SQL, and statistics.

---

## ADR-006: PWA instead of React Native

### Context
Ship one web codebase quickly to mobile home screens without an App Store cycle during the tournament.

### Decision
Vite web app + `manifest.json` + production service worker; install banner soft-hidden after tournament completion.

### Consequences
(+) Fast mobile reach.  
(−) Not a native push/notification platform; limited offline beyond shell caching.

---

## ADR-007: Incremental knockout fixture imports

### Context
Bracket participants are only known after prior rounds finish.

### Decision
Per-stage import scripts with upsert + `--dry-run`; do not generate the entire knockout tree on day one.

### Consequences
(+) Matches reality; safer production changes.  
(−) Requires operational cadence; early rounds can have short prediction windows.

---

## ADR-008: Keep production as a read-only archive

### Context
Tournament ended; wiping the DB would destroy the portfolio narrative and user history.

### Decision
Close prediction writes when Final is complete; keep reads, standings, statistics, auth, and admin corrections.

### Consequences
(+) Durable demo and fairness if a score must be fixed.  
(−) Must maintain auth/email paths even when the competition is over.

---

## ADR-009: Preserve historical scripts

### Context
Deleting import/reminder code would erase operational evidence and complicate rare maintenance.

### Decision
Keep scripts and routes; disable reminder **schedule**; document in ARCHIVE.md / ops docs.

### Consequences
(+) Reproducible history.  
(−) Contributors must read warnings before running anything against production.

---

## ADR-010: Admin score correction remains available

### Context
Human-posted results can be wrong; leaderboard fairness depends on fixability.

### Decision
Retain admin UI + `PATCH /api/admin/matches/:id/result` with `AdminAuditLog`.

### Consequences
(+) Correctable history.  
(−) Admin credentials remain sensitive forever.
