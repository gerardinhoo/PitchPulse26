# Security

Honest scope: PitchPulse 26 implements practical application security for a small production sports prediction app. This document does **not** claim certifications, penetration-test reports, or guarantees.

## Authentication flow

1. Register with email + password (+ optional display name)
2. Password hashed with bcrypt before storage
3. Optional email verification via Resend token link
4. Login returns a JWT used as `Authorization: Bearer`
5. `GET /api/auth/me` and protected routes verify the token

## Email verification

- Controlled by `REQUIRE_EMAIL_VERIFICATION`
- Unverified users can be blocked from prediction writes
- Resend delivers verification and password-reset messages
- Reminder unsubscribe tokens are separate from auth passwords

## Password handling

- Passwords are not logged
- Reset flow uses time-limited tokens and Resend links built from `APP_URL`
- JWT secret must be strong and environment-specific (`JWT_SECRET`)

## Admin authorization

- Users have `role` (`user` / `admin`)
- Admin routes check role after JWT auth
- Admin match result updates write `AdminAuditLog` rows (who changed which score)

## API validation

- Zod schemas for request bodies/query params
- Helmet middleware on the Express app
- Rate limiting on auth routes
- JSON body size limited

## Prediction locking and tournament gate

- Predictions rejected after kickoff
- After Final completion, prediction creates/updates return `403`
- Historical prediction reads remain available to authenticated users

## Secrets and environment

| Secret / config | Typical location |
|-----------------|------------------|
| `DATABASE_URL` | Local `.env`, Lambda env / SSM, GitHub `LAMBDA_DATABASE_URL` |
| `JWT_SECRET` | Same pattern |
| `RESEND_API_KEY` | Server env / Lambda |
| `REMINDER_JOB_SECRET` | Server + GitHub Actions secret for reminder job |

Never commit real secrets. Use placeholders in docs (see `server/.env.example`).

## Database separation

Local, staging, and production Neon databases must stay distinct. Pointing production tooling at a staging branch — or the reverse — caused real operational risk during knockout work. Confirm the target before migrate/import.

## Least privilege

- CI IAM user deploys Lambda artifacts; optional `UpdateFunctionConfiguration` gated by `ENABLE_LAMBDA_CONFIG_UPDATE`
- Lambda role includes basic execution + SSM read for configured parameters
- Reminder job requires a shared secret header

## Audit logging

Admin score changes persist old/new scores, admin user id, match id, and request correlation fields.

## Product positioning

PitchPulse 26 is a **free prediction game for entertainment**. There is no betting, wagering, payments for entries, or gambling mechanic in the application.

## Do not claim

- SOC2 / ISO / PCI compliance
- Field-level encryption at rest beyond what Neon/AWS provide by default
- Perfect spam immunity for email
- Zero vulnerability surface
