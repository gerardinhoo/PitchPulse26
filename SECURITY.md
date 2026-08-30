# Security

PitchPulse 26 is a public engineering case study for a completed World Cup prediction archive. This note describes practical security expectations for the repository—not a compliance certification.

## Secrets

- Application secrets (`DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, reminder secrets, AWS credentials) belong in **environment variables**, **AWS SSM**, and/or **GitHub Actions secrets**.
- Do **not** commit `.env`, `infra/terraform.tfvars`, local database files (`*.db`), or Terraform state.
- Example files (for example `server/.env.example`) use placeholders only.

## Repository privacy

- Production user PII (emails, password hashes, private account data) must **not** be stored in this repository.
- Public leaderboard **display names** and aggregate tournament statistics may appear in the live app and documentation snapshots; that is intentional product data, not a substitute for dumping private accounts into git.

## Reporting a vulnerability

If you believe you have found a security issue in this project, please contact the maintainer privately (via the GitHub profile linked from the repository) rather than opening a public issue with exploit details.

Please include:

- a short description of the issue
- steps to reproduce (if safe)
- impact assessment if known

## Scope limits

This project uses JWT authentication, bcrypt password hashing, Zod validation, Helmet, CORS allowlists, admin role checks, and structured logging as implemented in the codebase. It does **not** claim SOC 2, ISO, PCI, or similar certifications.
