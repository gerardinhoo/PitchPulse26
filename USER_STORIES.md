# PitchPulse 26 — User Stories

## Epic 1: Authentication & User Management

### PP-001: User Registration [DONE]
**As a** new user
**I want to** create an account with my email, password, and display name
**So that** I can participate in the prediction game

**Acceptance Criteria:**
- User can register with email, password (min 8 chars), and optional display name
- Email must be unique — duplicate returns 409
- Password is hashed with bcrypt before storage
- User is auto-logged in after registration and redirected to Matches
- Field-level validation errors displayed (e.g. "Password must be at least 8 characters")
- Submit button shows loading state during request

---

### PP-002: User Login [DONE]
**As a** registered user
**I want to** log in with my email and password
**So that** I can access my predictions and protected features

**Acceptance Criteria:**
- User receives a JWT token (1-day expiry) on successful login
- Token stored in localStorage and sent via Authorization header on all requests
- Invalid credentials return generic "Invalid credentials" message
- Login button shows "Signing in..." during submission
- Auth endpoints rate-limited to 20 requests per 15 minutes

---

### PP-003: User Profile & Session [DONE]
**As a** logged-in user
**I want to** see my identity in the navbar
**So that** I know I'm authenticated

**Acceptance Criteria:**
- Navbar shows display name (or email) and Logout button when authenticated
- Navbar shows Login and Sign Up when not authenticated
- GET /auth/me returns user profile (id, email, displayName, role)
- Expired/invalid tokens are cleared and user state is reset

---

### PP-004: Role-Based Access Control [DONE]
**As an** admin user
**I want to** access admin-only features
**So that** I can manage match results

**Acceptance Criteria:**
- User model has `role` field (default: "user", options: "user" | "admin")
- Role included in JWT payload
- Admin link in navbar only visible to users with role "admin"
- Admin API routes return 403 for non-admin users
- ProtectedRoute component supports `requireAdmin` prop

---

### PP-005: Email Verification [TODO]
**As a** platform operator
**I want** users to verify their email address
**So that** I can prevent fake accounts and ensure fair competition

**Acceptance Criteria:**
- After registration, user receives a verification email via AWS SES
- Unverified users can log in but see a banner prompting verification
- Unverified users cannot submit predictions
- Verification link (signed JWT) expires after 24 hours
- Resend verification option available
- `emailVerified` Boolean field added to User model

**Priority:** Medium | **Labels:** security, auth

---

## Epic 2: Matches & Predictions

### PP-006: View Matches [DONE]
**As a** user
**I want to** see a list of all World Cup matches
**So that** I can browse the schedule and results

**Acceptance Criteria:**
- Matches display home team vs away team with formatted date/time
- Completed matches show final score with "Final" label
- Matches without results show prediction input fields
- Matches ordered by date ascending, paginated (20 per page)
- Loading spinner shown while fetching
- Empty state shown when no matches exist

---

### PP-007: Submit Predictions [DONE]
**As a** logged-in user
**I want to** predict the score of upcoming matches
**So that** I can earn points on the leaderboard

**Acceptance Criteria:**
- User can enter home and away scores (min 0) for any match without a result
- One prediction per user per match (upsert via unique constraint)
- Existing predictions pre-filled when returning to the page
- Saved predictions show green "Your prediction: X – Y" label
- Button changes from "Submit" to "Update" after saving
- Predictions on matches with existing results rejected by API (400)
- Score of 0 is valid (0-0 draw)

---

### PP-008: Prediction Lockout After Kickoff [TODO]
**As a** platform operator
**I want** predictions to be locked once a match kicks off
**So that** users cannot change predictions after seeing live results

**Acceptance Criteria:**
- API rejects predictions where `match.date < now()` with 400 error
- Frontend disables score inputs and hides submit button for past matches
- "Match locked" label shown on past matches
- Existing prediction displayed but not editable after lockout

**Priority:** High | **Labels:** fairness, business-logic

---

### PP-009: Games of the Day [TODO]
**As a** user
**I want to** see today's matches highlighted on the Matches page
**So that** I can quickly predict upcoming games before kickoff

**Acceptance Criteria:**
- Matches page shows a "Today's Matches" section at the top when games are scheduled today
- Today's matches visually distinct (accent border or background)
- If no games today, show "Next match: [Team] vs [Team] on [Date]"
- Matches in "Today" section sorted by kickoff time ascending

**Priority:** Medium | **Labels:** feature, ux

---

### PP-010: Pagination UI for Matches [TODO]
**As a** user
**I want** page controls on the Matches page
**So that** I can browse all 48+ matches across multiple pages

**Acceptance Criteria:**
- Previous / Next buttons at bottom of match list
- Current page number and total pages displayed ("Page 1 of 3")
- Disabled state on first/last page buttons
- Page state stored in URL query param (?page=2) for shareability
- Server-side pagination already exists — frontend needs to consume `meta.page` and `meta.totalPages`

**Priority:** Medium | **Labels:** ui, enhancement

---

## Epic 3: Leaderboard & Scoring

### PP-011: Leaderboard [DONE]
**As a** user
**I want to** see a ranked leaderboard of all players
**So that** I can compare my performance with others

**Acceptance Criteria:**
- Leaderboard shows rank, display name, and total points
- Top 3 get medal icons (🥇🥈🥉) with gold/silver/bronze tinted backgrounds
- Current user's row highlighted with emerald ring and "(you)" label
- Points displayed in emerald accent
- Paginated server-side, staggered card animations
- Empty state with message when no results exist yet

---

### PP-012: Scoring System [DONE]
**As a** user
**I want to** understand how points are calculated
**So that** I can make strategic predictions

**Acceptance Criteria:**
- Exact score match = 3 points
- Correct result (win/draw/loss) = 1 point
- Wrong prediction = 0 points
- Points computed dynamically from match results
- Only predictions for completed matches are scored
- Scoring rules explained on Home page "How It Works" section

---

### PP-013: Cash Prize for Winner [TODO]
**As a** user
**I want to** compete for a cash prize
**So that** there's a real incentive to participate

**Acceptance Criteria:**
- Prize amount and rules displayed on a dedicated "Rules" or "Prizes" page
- Only email-verified users are eligible for prizes
- Prediction edit history logged (audit trail for fairness disputes)
- Winner determined at end of tournament by highest leaderboard points
- Tiebreaker rules documented (e.g. most exact scores, then earliest registration)
- Terms of service / contest rules page with legal disclaimer
- Admin can export final leaderboard as CSV for verification

**Priority:** Low | **Labels:** feature, business, legal

---

## Epic 4: Admin Panel

### PP-014: Set Match Results [DONE]
**As an** admin
**I want to** enter the final score for completed matches
**So that** predictions can be scored and the leaderboard updates

**Acceptance Criteria:**
- Admin page shows matches split into "Pending (N)" and "Completed (N)" sections
- Admin enters home/away scores and clicks "Set" (red button)
- Score of 0 is valid
- Match moves from Pending to Completed immediately (local state update)
- Invalid match IDs return 400, non-existent matches return 404
- Request body validated with Zod schema
- Spinner shown during loading, per-match submitting state

---

## Epic 5: Groups, Standings & Team Metadata [TODO]

### PP-015: Group Standings
**As a** user
**I want to** see group standings for all 12 World Cup groups
**So that** I can follow tournament progression

**Acceptance Criteria:**
- GET /api/groups returns all 12 groups with their teams
- GET /api/groups/:name/standings returns computed standings table
- Standings include: MP, W, D, L, GF, GA, GD, Pts (3/1/0 system)
- Standings computed dynamically from match results (not stored)
- Frontend shows group selector/grid with standings table per group
- Teams sorted by: points → goal difference → goals for
- Standings update automatically when admin sets match results

**Priority:** Medium | **Labels:** feature, tournament

---

### PP-016: Team Flags & Metadata
**As a** user
**I want to** see team flags next to team names
**So that** matches and standings are visually identifiable

**Acceptance Criteria:**
- `code` field added to Team model (ISO 3166-1 alpha-2, e.g. "BR", "US")
- Flags loaded from CDN: `https://flagcdn.com/w40/{code}.png`
- Flags displayed in MatchCard, standings table, group cards, and navbar team references
- Seed data updated with country codes for all 48 teams
- Fallback icon shown if flag fails to load

**Priority:** Medium | **Labels:** ui, data

---

### PP-017: Team Rankings Within Groups [In-Progress]
**As a** user
**I want to** see each team's rank within their group (1st, 2nd, 3rd, 4th)
**So that** I can see who qualifies for the knockout round

**Acceptance Criteria:**
- Standings table shows position number (1–4) per team
- Top 2 teams in each group visually indicated (e.g. green highlight or "Qualified" badge)
- 3rd place teams marked as "Possible qualifier" (WC 2026 format: best 3rd-place teams advance)
- Rankings update in real-time as results are entered

**Priority:** Medium | **Labels:** feature, tournament

---

## Epic 6: Email Notifications [TODO]

### PP-018: Match Reminder Emails
**As a** user
**I want to** receive an email the day before matches
**So that** I remember to submit my predictions before kickoff

**Acceptance Criteria:**
- Daily scheduled job (Lambda + EventBridge cron) runs at 9:00 AM UTC
- Queries matches scheduled for the next day
- Sends reminder email to all verified users who haven't predicted those matches
- Email includes: match list, kickoff times, and link to Matches page
- Sent via AWS SES (free: 3,000 emails/month from Lambda)
- Users can unsubscribe (add `emailNotifications` Boolean to User model)
- Unsubscribe link in every email

**Priority:** Medium | **Labels:** feature, engagement, aws

---

## Epic 7: UI/UX

### PP-019: Landing Page [DONE]
**As a** visitor
**I want to** see an attractive landing page
**So that** I understand what the app does and want to sign up

**Acceptance Criteria:**
- Full-screen hero with World Cup trophy background and dark overlay
- Title "Predict. Compete. Win." with staggered slide-up animations
- Auth-aware CTA: "Start Predicting" → /register (guests), "View Matches" → /matches (users)
- "How It Works" section with 3 animated cards explaining scoring
- Responsive layout, edge-to-edge hero

---

### PP-020: Global Navigation & Layout [DONE]
**As a** user
**I want to** navigate between pages using a persistent navbar
**So that** I can easily access all features

**Acceptance Criteria:**
- Sticky top navbar with "PitchPulse 26" logo, page links, auth actions
- Active page link highlighted with emerald background
- Admin link conditionally shown for admin users
- Layout wrapper provides consistent max-w-5xl container and padding
- Backdrop blur effect on navbar

---

### PP-021: Dark Theme & Design System [DONE]
**As a** user
**I want** a polished, modern dark UI
**So that** the app feels professional

**Acceptance Criteria:**
- Dark green (#0f1b0e) background with emerald (#10b981) accents
- Reusable `.card` class with dark background, border, and hover effects
- Global input styling with emerald focus borders, no number spinners
- Reusable components: MatchCard, ScoreInput, Spinner
- Fade-in, slide-up, and stagger animations via CSS
- Loading spinners on all async pages
- Empty states with icons and messages on all list pages

---

### PP-022: Mobile Hamburger Menu [TODO]
**As a** mobile user
**I want** a hamburger menu for navigation
**So that** I can access all pages on small screens

**Acceptance Criteria:**
- Nav links collapse into hamburger icon on screens < 640px
- Tapping hamburger opens slide-down menu with all links
- Menu closes on link click or outside tap
- Admin link included when applicable
- Smooth open/close animation

**Priority:** Medium | **Labels:** ui, responsive

---

### PP-036: Site Footer [DONE]
**As a** user
**I want** a footer on every page
**So that** I can find project info, links, and credits

**Acceptance Criteria:**
- Footer appears at the bottom of every page via Layout component
- Left section: "PitchPulse 26" branding + short tagline
- Center section: navigation links (Home, Matches, Leaderboard, Rules)
- Right section: social/GitHub link + "Built by [Your Name]"
- "© 2026 PitchPulse" copyright line
- Dark background consistent with theme, subtle top border
- Responsive: stacks vertically on mobile
- Does not overlap with page content (pushed to bottom on short pages)

**Priority:** Low | **Labels:** ui, layout

---

### PP-023: Leaderboard Pagination UI [TODO]
**As a** user
**I want** page controls on the leaderboard
**So that** I can see all ranked players

**Acceptance Criteria:**
- Previous / Next buttons at bottom of leaderboard
- Current page and total pages displayed
- Disabled state on first/last page
- Server-side pagination already exists — frontend consumes meta

**Priority:** Low | **Labels:** ui, enhancement

---

## Epic 8: Testing [TODO]

### PP-024: Backend Unit Tests
**As a** developer
**I want** unit tests for backend services
**So that** I can refactor with confidence

**Acceptance Criteria:**
- Test calculatePoints() with: exact match, correct result, wrong, unplayed match, draw
- Test Zod validation schemas with valid and invalid inputs
- Test auth middleware with valid token, expired token, missing token, malformed token
- Minimum 80% coverage on services and middleware
- Test framework: Vitest or Jest

**Priority:** High | **Labels:** testing, backend

---

### PP-025: Backend Integration Tests
**As a** developer
**I want** API integration tests
**So that** I can verify endpoints work end-to-end

**Acceptance Criteria:**
- Test auth flow: register → login → me
- Test prediction CRUD with authentication
- Test admin result updates (user gets 403, admin gets 200)
- Test leaderboard scoring after results are set
- Test validation rejection (bad input, duplicate email, short password)
- Test framework: Supertest + Vitest

**Priority:** High | **Labels:** testing, backend

---

### PP-026: Frontend Component Tests
**As a** developer
**I want** tests for key UI components
**So that** UI regressions are caught early

**Acceptance Criteria:**
- Test ProtectedRoute redirects unauthenticated users to /login
- Test ScoreInput renders inputs and fires onChange/onSubmit
- Test MatchCard displays team names, date, and score correctly
- Test Navbar shows/hides admin link based on user role
- Test framework: Vitest + React Testing Library

**Priority:** Medium | **Labels:** testing, frontend

---

## Epic 9: AWS Deployment & DevOps

### PP-027: Database Migration to PostgreSQL [DONE]
**As a** developer
**I want to** migrate from SQLite to PostgreSQL
**So that** the app handles concurrent users in production

**Acceptance Criteria:**
- Prisma schema provider changed to "postgresql"
- SQLite adapter removed from lib/prisma.js and seed.js
- DATABASE_URL points to Neon or Supabase free-tier PostgreSQL (no expiry, unlike RDS 12-month free tier)
- Migrations regenerated and applied
- Seed script verified

**Priority:** High | **Labels:** devops, database

---

### PP-028: Serverless Backend on AWS Lambda [DONE]
**As a** developer
**I want to** deploy the Express API as a Lambda function
**So that** it scales automatically within free tier (1M requests/month)

**Acceptance Criteria:**
- Express app wrapped with serverless-http
- Lambda function deployed behind API Gateway
- Environment variables read from AWS SSM Parameter Store
- API Gateway configured with throttling and CORS
- Health check verified at production URL

**Priority:** High | **Labels:** devops, aws

---

### PP-029: Frontend Deployment on AWS Amplify [DONE]
**As a** developer
**I want to** deploy the React frontend on AWS Amplify
**So that** it has automatic CI/CD with free HTTPS

**Acceptance Criteria:**
- Amplify connected to GitHub repo (main branch)
- Automatic build and deploy on push
- API base URL configured via Amplify environment variable
- Free *.amplifyapp.com subdomain with SSL
- Build: `npm run build`, output: `dist`
- Free tier: 5GB storage, 15GB bandwidth/month

**Priority:** High | **Labels:** devops, aws

---

### PP-030: Infrastructure as Code (Terraform) [DONE]
**As a** developer
**I want** all AWS resources defined in Terraform
**So that** infrastructure is reproducible and version-controlled

**Acceptance Criteria:**
- Terraform defines: Lambda, API Gateway, SSM parameters, IAM roles, Amplify app, CloudWatch
- IAM roles follow least-privilege principle
- State stored in S3 backend
- `terraform plan` / `terraform apply` documented in README
- All resources tagged with project name

**Priority:** High | **Labels:** devops, iac

---

### PP-031: CI/CD Pipeline (GitHub Actions) [DONE]
**As a** developer
**I want** automated checks and deployment on every push
**So that** broken code doesn't reach production

**Acceptance Criteria:**
- GitHub Actions workflow on push/PR to main
- Pipeline: lint → typecheck → build → deploy
- Backend deployed to Lambda on merge to main
- Frontend auto-deployed via Amplify Git integration
- Pipeline blocks merge on failure
- Secrets in GitHub Actions secrets (not in code)
- Dedicated CI IAM user with minimal permissions

**Priority:** High | **Labels:** devops, ci-cd

---

### PP-032: Secrets Management (AWS SSM) [DONE]
**As a** developer
**I want** secrets in AWS SSM Parameter Store
**So that** sensitive values are never in code

**Acceptance Criteria:**
- JWT_SECRET stored as SecureString in SSM
- DATABASE_URL stored as SecureString in SSM
- Lambda reads secrets from SSM at cold start
- Local dev continues to use .env
- SSM parameters defined in Terraform

**Priority:** High | **Labels:** security, aws

---

### PP-033: Monitoring Dashboard (CloudWatch)
**As a** developer
**I want** a CloudWatch dashboard
**So that** I can monitor API health in production

**Acceptance Criteria:**
- Dashboard: Lambda invocations, errors, duration, API Gateway 4xx/5xx
- Alarm on error rate > 5% (SNS email notification)
- Lambda logs in CloudWatch Logs (30-day retention)
- Dashboard defined in Terraform

**Priority:** Medium | **Labels:** devops, observability

---

### PP-034: Load Testing (Artillery)
**As a** developer
**I want** load test results documented
**So that** I can prove the app handles traffic spikes

**Acceptance Criteria:**
- Artillery script simulates: register, login, predict, leaderboard
- Ramp test: 1 → 100 concurrent users over 5 minutes
- Results documented: p50, p95, p99 latency, error rate
- CloudWatch metrics captured during test
- Results saved in repo as test artifact

**Priority:** Medium | **Labels:** testing, performance

---

### PP-035: Disaster Recovery (Pilot Light)
**As a** developer
**I want** a documented DR strategy
**So that** the app can be restored in a second AWS region

**Acceptance Criteria:**
- Terraform can deploy full stack to secondary region (e.g. eu-west-1)
- Database backup strategy documented (Neon point-in-time recovery or RDS snapshots)
- RTO < 30 minutes, RPO < 1 hour
- DR runbook in repo
- Tested at least once

**Priority:** Low | **Labels:** devops, reliability

### PP-036: Custom Domain Setup (pitchpulse26.com) for Pitch Pulse 26  [Done]
**As a** user
**I want** to access the Pitch Pulse 2026 app using a custom domain (pitchpulse26.com),
**So that** the application looks professional, trustworthy, and easy to remember.

**Acceptance Criteria:**
- pitchpulse26.com is connected to the AWS Amplify app
- www.pitchpulse26.com is also connected
- Visiting pitchpulse26.com redirects to www.pitchpulse26.com or vice versa
- Only one canonical domain is used (no duplicate content)
- HTTPS is enabled for both domain versions and SSL certificate is successfully provisioned by Amplify
- Domain automatically updates when new changes are deployed via Amplify and no manual steps required after initial setup

**Priority:** Medium | **Labels:** deployment, custom domain
