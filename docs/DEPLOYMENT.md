# 🚀 HopeFusion Africa — Production Deployment Guide

## Architecture

```
Internet → Nginx (SSL + Rate Limiting)
              ├── hopefusionafrica.com  → Next.js Frontend (:3001)
              └── api.hopefusionafrica.com → Express API (:3000)
                                               ├── Supabase (PostgreSQL + pgvector)
                                               ├── Upstash Redis
                                               └── Socket.io (WebRTC + Messaging)
```

---

## Option A: Docker (VPS / Self-Hosted)

### 1. Server Requirements
- Ubuntu 22.04 LTS
- 2 vCPU, 4GB RAM minimum
- Docker + Docker Compose installed
- Ports 80 and 443 open

### 2. Clone & Configure
```bash
git clone https://github.com/YOUR_ORG/hopefusion-africa.git /opt/hopefusion
cd /opt/hopefusion
cp .env.example .env
# Fill in all values in .env
nano .env
```

### 3. SSL Certificate (Let's Encrypt)
```bash
mkdir -p nginx/ssl
apt install certbot
certbot certonly --standalone -d hopefusionafrica.com -d www.hopefusionafrica.com -d api.hopefusionafrica.com
cp /etc/letsencrypt/live/hopefusionafrica.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/hopefusionafrica.com/privkey.pem nginx/ssl/
```

### 4. Build & Launch
```bash
docker-compose up -d --build
docker-compose ps          # verify all services healthy
docker-compose logs -f api # watch logs
```

### 5. Run DB Migration
```bash
docker-compose exec api node --experimental-specifier-resolution=node src/scripts/setup-db.js
```

---

## Option B: Render + Vercel (Zero-DevOps)

### Backend → Render.com
1. Connect GitHub repo to [render.com](https://render.com)
2. Render auto-detects `render.yaml`
3. Set all env vars in the Render dashboard (Environment tab)
4. Deploy — health check at `/api/v1/health` confirms readiness

### Frontend → Vercel
1. Connect `/frontend` directory to [vercel.com](https://vercel.com)
2. Set env vars:
   - `NEXT_PUBLIC_API_URL` = your Render API URL
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = your VAPID public key
3. Deploy — Vercel auto-detects Next.js

---

## Option C: CI/CD via GitHub Actions

Push to `main` branch automatically:
1. ✅ Runs test suite
2. 🐳 Builds Docker images → pushes to GHCR
3. 🚀 SSH deploys to production server (zero-downtime)

### Required GitHub Secrets
| Secret | Description |
|--------|-------------|
| `TEST_DATABASE_URL` | Supabase connection string for tests |
| `TEST_REDIS_URL` | Redis URL for tests |
| `JWT_SECRET` | JWT signing secret |
| `DEPLOY_HOST` | Production server IP |
| `DEPLOY_USER` | SSH username (e.g. `ubuntu`) |
| `DEPLOY_SSH_KEY` | Private SSH key |
| `NEXT_PUBLIC_API_URL` | Public API URL |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key |

---

## Environment Variables Checklist

### Required (will fail without)
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `REDIS_URL` — Upstash Redis TLS URL
- `JWT_SECRET` — min 64 random characters

### Payments (needed for payment flows)
- `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`
- `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`
- `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY`

### Push Notifications
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (optional — FCM)

### AI Features
- `ANTHROPIC_API_KEY` — Claude API key (top up at console.anthropic.com)

### Storage & Email
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

---

## Post-Deploy Health Check

```bash
# API health
curl https://api.hopefusionafrica.com/api/v1/health

# Expected response:
# { "status": "ok", "services": { "database": { "status": "ok" }, "cache": { "status": "ok" } } }
```

---

## SSL Auto-Renewal (Cron)
```bash
# Add to crontab: renew cert monthly
0 3 1 * * certbot renew --quiet && docker-compose exec nginx nginx -s reload
```
