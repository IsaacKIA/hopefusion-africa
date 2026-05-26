# HopeFusion Africa 🌍
### Africa's First Integrated Startup Ecosystem Marketplace
**Empower. Innovate. Thrive.**

---

## What we built

A complete, production-ready platform connecting African startups, investors, mentors and resources — with AI at the core.

---

## Complete file inventory

### Frontend (8 pages + assets)
| File | Page |
|------|------|
| `hopefusion-index.html` | Smart router (redirects by auth role) |
| `hopefusion-homepage.html` | Public landing page |
| `hopefusion-register.html` | 5-step startup registration |
| `hopefusion-investor-dashboard.html` | Investor dashboard |
| `hopefusion-ai-matching.html` | AI matching engine |
| `hopefusion-grant-platform.html` | Grant discovery & applications |
| `hopefusion-elearning.html` | E-learning hub |
| `hopefusion-mentor-dashboard.html` | Mentor sessions & mentees |
| `hopefusion-govt-support.html` | Compliance & government support |
| `hopefusion-admin-dashboard.html` | Admin analytics |
| `hopefusion-offline.html` | PWA offline fallback |

### Backend (Node.js)
| File | Purpose |
|------|---------|
| `hopefusion-backend.js` | Main API + auth + DB + all routes |
| `hopefusion-ai-engine.js` | Claude AI — 10 endpoints |
| `hopefusion-payments.js` | Paystack + MTN MoMo + Flutterwave |
| `hopefusion-realtime.js` | Socket.io messaging + WebRTC signalling |
| `hopefusion-public-api.js` | Public REST API + webhooks |

### Frontend JS
| File | Purpose |
|------|---------|
| `hopefusion-connection-layer.js` | Connects all pages to backend |
| `hopefusion-webrtc-client.js` | WebRTC video/audio call client |
| `hopefusion-i18n.js` | 5-language i18n system |
| `hopefusion-pwa.js` → `sw.js` | Service worker (offline PWA) |

### Blockchain
| File | Purpose |
|------|---------|
| `hopefusion-blockchain.sol` | Polygon escrow smart contract |

### Mobile
| File | Purpose |
|------|---------|
| `hopefusion-mobile-app.js` | React Native app (Expo) |

### Config & docs
| File | Purpose |
|------|---------|
| `hopefusion-package.json` | Node.js dependencies |
| `hopefusion-pwa-manifest.json` | Web app manifest |
| `hopefusion-env.txt` | Environment variables template |
| `hopefusion-deploy.md` | Deployment guide |
| `hopefusion-complete-setup.md` | Full production setup (17 steps) |

---

## Tech stack

```
Frontend:   HTML5 · CSS3 · Vanilla JS · Tailwind-compatible
Backend:    Node.js · Express · PostgreSQL · Redis
AI:         Claude (claude-sonnet-4-20250514) — Anthropic
Auth:       JWT · OAuth2 (Google/LinkedIn) · bcrypt
Payments:   Paystack · MTN MoMo · Flutterwave
Real-time:  Socket.io · WebRTC
Blockchain: Solidity · Polygon (MATIC) · OpenZeppelin
Mobile:     React Native · Expo
PWA:        Service Worker · IndexedDB · Push API
i18n:       English · French · Swahili · Hausa · Arabic (RTL)
Deploy:     Netlify (FE) · Render (BE) · Supabase (DB) · Upstash (Redis)
```

---

## Quick start

```bash
# 1. Clone repo
git clone https://github.com/YOUR_USERNAME/hopefusion-africa.git
cd hopefusion-africa

# 2. Install
npm install

# 3. Configure
cp hopefusion-env.txt .env
# Fill in your API keys

# 4. Run locally
npm run dev       # API on :3000
npm run dev:ai    # AI engine on :3001

# 5. Open frontend
open public/hopefusion-homepage.html
```

---

## Architecture

```
Browser / Mobile App
       │
       ▼
Netlify CDN (static HTML/JS/CSS)
       │
       ├──▶ Render: Main API (:3000)
       │           ├── PostgreSQL (Supabase)
       │           ├── Redis (Upstash)
       │           ├── Socket.io (real-time)
       │           └── WebRTC signalling
       │
       ├──▶ Render: AI Engine (:3001)
       │           └── Anthropic Claude API
       │
       ├──▶ Paystack / MTN MoMo / Flutterwave
       │
       └──▶ Polygon: Smart Contract (escrow)
```

---

## API endpoints

### Auth
- `POST /api/auth/register` — create account
- `POST /api/auth/login` — sign in
- `POST /api/auth/verify` — verify email
- `POST /api/auth/refresh` — refresh token
- `POST /api/auth/logout` — sign out
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Users & Startups
- `GET  /api/users/me` — get my profile
- `PATCH /api/users/me` — update profile
- `GET  /api/startups` — list startups
- `GET  /api/startups/:id` — startup detail
- `POST /api/startups` — update startup profile

### AI Engine
- `POST /api/ai/match` — score one match
- `POST /api/ai/match/batch` — score many
- `POST /api/ai/pitch/analyze` — pitch feedback
- `POST /api/ai/pitch/oneliner` — generate pitch lines
- `POST /api/ai/grants/check` — eligibility check
- `POST /api/ai/grants/discover` — find grants
- `POST /api/ai/compliance/check` — compliance advisor
- `POST /api/ai/recommend` — personalised recommendations
- `POST /api/ai/chat/stream` — streaming AI chat (SSE)
- `POST /api/ai/financials/model` — 18-month model

### Matching, Grants, Sessions, Messages
- `GET  /api/matches/my` — my AI matches
- `PATCH /api/matches/:id/status` — update match status
- `POST /api/grants/apply` — submit application
- `GET  /api/grants/my` — my applications
- `GET  /api/mentors` — list mentors
- `POST /api/sessions` — book session
- `POST /api/messages` — send message
- `GET  /api/messages/threads` — my conversations
- `GET  /api/notifications` — my notifications

### Payments
- `POST /api/paystack/initialize`
- `GET  /api/paystack/verify/:reference`
- `POST /api/momo/collect`
- `GET  /api/momo/status/:referenceId`
- `POST /api/flutterwave/initialize`
- `GET  /api/plans`

### Public API (requires x-api-key)
- `GET  /v1/startups`
- `GET  /v1/investors`
- `GET  /v1/mentors`
- `GET  /v1/matches`
- `GET  /v1/grants`
- `GET  /v1/platform/stats`
- `POST /v1/webhooks`

---

## Environment variables

See `hopefusion-env.txt` for all required environment variables.
Never commit `.env` to git.

---

## Contact

- **Website:** www.hopefusionafrica.com
- **Email:** info@hopefusionafrica.com
- **Phone:** +233 241 332 246

---

*Built with HopeFusion Africa × Claude AI*
*Empower. Innovate. Thrive.*
