# HopeFusion Africa — Production Deployment Guide

This document describes the production deployment pipeline, architectural mappings, environment variable configurations, and rollback procedures for the HopeFusion Africa SaaS platform.

---

## 🏗️ Production Architecture Overview

The platform uses a fully managed serverless/PaaS architecture, avoiding manual VPS maintenance, SSH scripts, or Docker orchestration in production.

* **Frontend App:** [Vercel](https://vercel.com) (Next.js serverless deployment)
* **Backend API:** [Render](https://render.com) (Node.js / Express Web Service)
* **Production Database:** PostgreSQL (Managed Serverless / Supabase)
* **Production Cache:** Redis (Managed / Upstash)
* **Repository & CI:** GitHub / GitHub Actions (Code validation and quality gatekeeper)

---

## 🔄 Deployment Flow

```mermaid
graph TD
    Developer[Developer commits code] -->|git push| GitHub(GitHub Repository)
    GitHub -->|Triggers CI| GHA[GitHub Actions CI Pipeline]
    GHA -->|Validates lints/builds/tests| Gate{CI Pass?}
    Gate -->|No| Block[Block Merge / Fail Build]
    Gate -->|Yes| AutoDeploy[Vercel & Render Webhooks Trigger]
    AutoDeploy -->|Builds & deploys Next.js| Vercel[Vercel Production App]
    AutoDeploy -->|Builds & deploys API| Render[Render Web Service]
```

1. **Local Commit & Push:** Developers push commits or pull requests targeting `main` or `develop`.
2. **CI Pipeline (GitHub Actions):** 
   - Runs backend unit/integration tests with dedicated test-scoped Postgres & Redis services.
   - Runs frontend tests, TypeScript type checks, and linting.
   - Verifies Solidity contract compilation and tests.
   - Conducts automated security scans (Snyk).
3. **Continuous Deployment (Auto-Deploy):**
   - **Vercel** is connected to the GitHub repository. It automatically detects new pushes to the `main` branch, builds the Next.js static files and API routes, and serves them.
   - **Render** is connected to the same repository. It pulls the updated codebase for pushes to `main`, builds the Express backend, and swaps the running server instances with zero downtime.

---

## 🔑 Environment Variables & Configurations

### 1. Render Backend API Configuration

Set up the API as a **Web Service** on Render with the following environment variables:

| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `NODE_ENV` | Environment identifier | `production` |
| `PORT` | Listening port (Render binds automatically) | `3000` (or leave default) |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/database?sslmode=require` |
| `REDIS_URL` | Redis connection URL | `rediss://default:token@host:port` |
| `JWT_SECRET` | Secret key for generating JWT tokens | *Generate a secure 32-character random string* |
| `FRONTEND_URL` | URL of the frontend (Vercel) | `https://hopefusion.africa` (or `https://hopefusion-frontend.vercel.app`) |
| `EMAIL_SERVICE` | SMTP email service provider | `smtp` or specific provider |
| `EMAIL_USER` | Email username for OTP/notifications | `noreply@hopefusion.africa` |
| `EMAIL_PASS` | SMTP credential | *Your email provider token* |
| `RESEND_API_KEY` | Resend API credential (if using Resend) | `re_123456789` |

* **Build Command:** `npm install`
* **Start Command:** `npm start`

---

### 2. Vercel Frontend Configuration

Set up the Frontend as a **Next.js Project** on Vercel with the following environment variables:

| Variable Name | Description | Example / Recommended Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend URL for API calls | `https://hopefusion-api.onrender.com/api/v1` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key for push subscriptions | *Your VAPID public key* |

* **Build Command:** `npm run build` (Default Next.js build command)
* **Output Directory:** `.next` (Next.js default)

---

### 3. GitHub Secrets (CI/CD Gates)

Add the following tokens to your **GitHub Repository Secrets** (`Settings > Secrets and variables > Actions`):

* `CODECOV_TOKEN` (Optional): Coverage report uploads for Codecov integration.
* `SNYK_TOKEN` (Optional): Node dependency vulnerability checker token.

---

## 🚨 Rollback Procedure

Since Vercel and Render track the current state of the git repository's `main` branch, a rollback is executed via standard Git operations:

1. **Identify the Last Stable Commit:**
   Find the SHA-1 hash of the last working commit on the `main` branch.
2. **Revert changes:**
   Run git revert to undo the changes, or reset the branch to the stable commit:
   ```bash
   # Option A: Revert the bad commit
   git revert <bad-commit-sha>
   git push origin main

   # Option B: Force push to a previous stable state (use with caution)
   git reset --hard <stable-commit-sha>
   git push origin main --force
   ```
3. **Verification:**
   - Confirm that the GitHub Actions CI pipeline passes successfully.
   - Vercel and Render will automatically detect the push, rebuild the previous working state, and deploy it, restoring services.
