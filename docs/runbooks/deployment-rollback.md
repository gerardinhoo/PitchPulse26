# Deployment Rollback Runbook

This runbook documents how to safely roll back Pitch Pulse 26 after a bad deployment.

Current deployment model:

- Frontend: AWS Amplify
- Backend: AWS Lambda behind API Gateway
- Database: Neon Postgres via Prisma
- CI/CD: GitHub Actions

## Rollback Triggers

Roll back when any of these happen after a deploy:

- `/api/health` fails or returns anything other than `200`
- users cannot log in or authenticated routes fail broadly
- predictions cannot be saved or updated
- admin result updates fail
- major frontend route is broken (`/`, `/matches`, `/leaderboard`, `/admin/results`)
- a production issue creates sustained `5xx` responses or obvious user-facing regression

## Default Rollback Order

1. Roll back the frontend if the issue is clearly frontend-only.
2. Roll back the backend if API behavior is broken.
3. Avoid rolling back the database schema unless absolutely necessary.

Database rollback is the last resort. Application code should be deployed using backward-compatible migrations so the previous version can keep running if the app needs to be reverted.

## Frontend Rollback (Amplify)

Use this when the issue is isolated to the React app and the backend is healthy.

### Steps

1. Open the AWS Amplify console for the production app.
2. Identify the last known good production deployment.
3. Redeploy that version if Amplify deployment history supports it.
4. If redeploying a prior build is not available, revert the bad change in GitHub and let Amplify rebuild from the last good commit on `main`.

### Validate

- homepage loads
- login page loads
- `/matches` loads
- `/leaderboard` loads
- browser console is free of major runtime errors

## Backend Rollback (Lambda)

Use this when API behavior is broken after backend deployment.

### Prerequisites

- Lambda deployment artifacts are uploaded to S3 with commit-specific keys
- the last known good commit SHA is available from GitHub Actions history or the merged PR

### Steps

1. Find the last known good backend artifact key in GitHub Actions logs.
2. Re-upload or confirm the artifact exists in `s3://pitchpulse26-lambda-artifacts/lambda-artifacts/<commit-sha>.zip`.
3. Update the Lambda function to that artifact:

```bash
aws lambda update-function-code \
  --function-name pitchpulse26-api \
  --s3-bucket pitchpulse26-lambda-artifacts \
  --s3-key lambda-artifacts/<known-good-commit-sha>.zip
```

4. Wait for the function update to complete:

```bash
aws lambda wait function-updated --function-name pitchpulse26-api
```

5. Run the backend smoke checks below.

### Validate

- `GET /api/health` returns `200`
- login works
- `GET /api/matches` works
- `POST /api/predictions` works for a verified user
- `PATCH /api/admin/matches/:id/result` works for an admin

## Database Rollback Guidance

Do not treat the database like the first rollback lever.

### Rules

- prefer app rollback over schema rollback
- ship additive migrations first
- deploy code that works with both old and new schema when possible
- remove old columns or constraints only after the new app version is stable

### If a migration caused the issue

1. Stop further deploys.
2. Roll back the application first if it can still run against the current schema.
3. Only apply manual database reversal steps if the application cannot recover without them.
4. Document exactly what changed before touching production data.

## Post-Rollback Smoke Test

Run these checks immediately after rollback:

1. Open `/` and verify the frontend loads.
2. Log in with a normal user.
3. Open `/matches` and confirm matches render.
4. Save a prediction as a verified user.
5. Open `/leaderboard` and confirm it loads.
6. Log in as admin and update one match result.
7. Confirm `/api/health` returns `200`.

## Evidence To Capture

When a rollback happens, capture:

- deployment timestamp
- commit SHA rolled back from
- commit SHA rolled back to
- observed failure symptoms
- smoke test result after rollback
- follow-up fix or incident note

## Ownership

- GitHub Actions: deployment history and artifact source
- Amplify: frontend deployment history
- Lambda + API Gateway: backend runtime and health verification
- CloudWatch: logs and backend failure investigation

