# Pitch Pulse 26

A full-stack World Cup 2026 prediction app where fans create accounts, predict group-stage match scores, earn points, and compete on a live leaderboard.

The current product scope is focused on World Cup 2026 group-stage matches.


## Tech Stack

**Backend:** Node.js, Express 5, Prisma ORM, PostgreSQL (Neon, via `@prisma/adapter-neon` + `ws`)
**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router
**Infra:** AWS Lambda + API Gateway (backend), AWS Amplify (frontend), Terraform, GitHub Actions CI/CD

## Current Experience

- Home page with product overview and scoring explainer
- Email/password authentication with email verification
- Paginated match browsing with prediction entry and save/update feedback
- Personal dashboard on the Matches page showing prediction progress and next action
- Dynamic group standings and leaderboard views
- Admin results workflow for posting final scores
- Responsive UI improvements for accessibility and mobile prediction flow

## Project Structure

```
PitchPulse26/
├── server/
│   ├── src/
│   │   ├── index.js          # Express app entry point
│   │   ├── config.js         # Environment variables
│   │   ├── validators.js     # Zod validation schemas + middleware
│   │   └── services/
│   │       └── leaderboard.js # Points calculation logic
│   ├── routes/
│   │   ├── auth.js           # Register, login, profile
│   │   ├── predictions.js    # Create/update & list predictions
│   │   ├── leaderboard.js    # Ranked leaderboard
│   │   ├── matches.js        # Match listings with group filter
│   │   ├── teams.js          # Team listings
│   │   ├── groups.js         # Groups + computed standings
│   │   └── admin.js          # Admin-only match result updates
│   ├── middleware/
│   │   └── auth.js           # JWT verification middleware
│   ├── lib/
│   │   └── prisma.js         # Prisma client + Neon WebSocket config
│   └── prisma/
│       ├── schema.prisma     # PostgreSQL schema
│       └── seed.js           # Seed data (48 teams, 16 stadiums, 24 matches)
├── client/
│   └── src/
│       ├── pages/            # Home, Login, Register, Matches, Leaderboard, Groups, Admin
│       ├── components/       # Navbar, Footer, MatchCard, Pagination, ScoreInput, …
│       ├── context/          # AuthContext
│       └── hooks/            # useAuth
└── infra/                    # Terraform (Lambda, API Gateway, SSM, Amplify, CloudWatch)
```

## Features

- Email + password auth with JWT (1-day expiry), role-based access (`user` / `admin`)
- Email verification flow with verified-user gating for predictions
- Score predictions with one-per-user-per-match upsert, pre-filled on return
- **Prediction lockout after kickoff** (API + UI) so users can't change picks mid-match
- 12 group standings computed dynamically from results (MP / W / D / L / GF / GA / GD / Pts)
- Leaderboard with medal icons for top 3, current-user context, and clearer tie handling
- Paginated Matches and Leaderboard with `?page=N` URL state for shareable links
- Matches dashboard with predicted / remaining / locked counts and next upcoming match prompt
- Friendly empty, loading, error, and offline states across core frontend pages
- Accessibility improvements: labels, focus states, skip link, keyboard-friendly navigation
- Mobile prediction flow polish with larger touch targets and stacked controls
- Admin panel to set final match scores, which updates predictions and standings
- Responsive dark theme with hamburger nav on mobile and iOS-Safari-friendly forms (16px inputs, proper `autoComplete`/`autoCapitalize`)

## Getting Started

### Prerequisites

- Node.js >= 22 (see `server/.nvmrc`); Vite needs 20.19+ / 22.12+ to build.
- npm
- A free Neon PostgreSQL database (https://neon.tech) for local dev.

### Server Setup

```bash
cd server
nvm use
npm install
```

Create `server/.env`:

```env
PORT=5050
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://USER:PASS@<neon-host>/neondb?sslmode=require
```

Apply migrations and seed:

```bash
npx prisma migrate deploy
npx tsx prisma/seed.js
```

Start the dev server:

```bash
npm run dev
```

The API will be available at `http://localhost:5050/api`.

### Client Setup

```bash
cd client
npm install
npm run dev
```

The web app runs at `http://localhost:5173`. It reads `VITE_API_URL` (defaults to `http://localhost:5050/api`).

## Local Development Flow

Run the backend in one terminal:

```bash
cd server
npm run dev
```

Run the frontend in another:

```bash
cd client
npm run dev
```

Recommended local test accounts:

- `admin` account for posting final results
- `verified user` account for prediction flows
- `unverified user` account for verification gating and restricted prediction testing

Recommended match data for manual QA:

- at least 1 future match
- at least 1 locked match (kickoff passed, no result yet)
- at least 1 completed match with a final score
- enough matches to trigger pagination

## Deployment Rollback

Production rollback is documented in [docs/runbooks/deployment-rollback.md](/Users/gerardeklu/PitchPulse26/docs/runbooks/deployment-rollback.md).

Current rollback approach:

- frontend rollback through Amplify deployment history or by reverting the bad `main` commit
- backend rollback by redeploying the last known good Lambda artifact from S3
- database rollback avoided by favoring backward-compatible Prisma migrations

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/teams` | List all teams (optional `?group=A`) |
| GET | `/api/matches` | List matches (optional `?group=A&page=1&limit=20`) |
| GET | `/api/leaderboard` | Ranked leaderboard (`?page=1&limit=20`) |

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user profile (requires token) |
| POST | `/api/auth/verify-email` | Verify email token |
| POST | `/api/auth/resend-verification` | Resend verification email (requires auth) |

### Protected (requires JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predictions` | Create or update a prediction |
| GET | `/api/predictions/my` | List your predictions (`?page=1&limit=20`) |

### Admin (requires JWT + admin role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/admin/matches/:id/result` | Set match final score |

### Request/Response Examples

**Register:**
```json
POST /api/auth/register
{ "email": "user@example.com", "password": "password123", "displayName": "Player1" }
→ 201 { "message": "User created", "userId": 1 }
```

**Login:**
```json
POST /api/auth/login
{ "email": "user@example.com", "password": "password123" }
→ 200 { "token": "eyJhbG..." }
```

**Create Prediction:**
```json
POST /api/predictions  (Authorization: Bearer <token>)
{ "matchId": 1, "homeScore": 2, "awayScore": 1 }
```

**Paginated Response Format:**
```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 24, "totalPages": 2 }
}
```

## Database Schema

**Models:** Team, Stadium, Match, User, Prediction

- **User** has `role` field (`"user"` or `"admin"`) and optional `displayName`
- **Prediction** has a unique constraint on `(userId, matchId)` — one prediction per user per match
- Predictions are rejected on matches that already have a result
- Indexes on `Match.date`, `Match.homeTeamId`, `Match.awayTeamId`, `Prediction.userId`

## Scoring

| Outcome | Points |
|---------|--------|
| Exact score match | 3 |
| Correct winner/draw | 1 |
| Wrong | 0 |

## Testing

### Frontend

```bash
cd client
npm test
```

Vitest is configured with `jsdom`, and the frontend test suite currently lives under `client/src/test`.

### Backend

```bash
cd server
npm test
```

### Type Checking

```bash
cd client
npx tsc -b
```

## Manual QA Suggestions

- Register a new user and complete the email verification flow
- Confirm unverified users cannot submit predictions
- Submit and update predictions for upcoming matches
- Confirm matches lock after kickoff
- Set a final score as admin and verify leaderboard / standings update
- Test the app in both desktop and mobile-sized viewports
- Verify offline and retry states by temporarily stopping the API

## Security

- JWT authentication with secrets from environment variables
- Passwords hashed with bcrypt (salt rounds: 10)
- Role-based access control for admin routes
- Input validation on all endpoints (Zod)
- Helmet for HTTP security headers
- Rate limiting on auth endpoints (20 req / 15 min)
- CORS restricted to configured origin
- Request body size limited to 10kb

## License

ISC
