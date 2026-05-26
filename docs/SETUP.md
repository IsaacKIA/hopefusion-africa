# HopeFusion Africa — Complete Production Setup Guide
**Every step from zero to live platform**

---

## THE COMPLETE FILE MAP

```
hopefusion-africa/
├── public/                          ← Frontend (deploy to Netlify)
│   ├── hopefusion-homepage.html
│   ├── hopefusion-register.html
│   ├── hopefusion-investor-dashboard.html
│   ├── hopefusion-ai-matching.html
│   ├── hopefusion-grant-platform.html
│   ├── hopefusion-elearning.html
│   ├── hopefusion-mentor-dashboard.html
│   ├── hopefusion-govt-support.html
│   ├── hopefusion-admin-dashboard.html
│   ├── sw.js                        ← hopefusion-pwa.js renamed
│   ├── manifest.json                ← hopefusion-pwa-manifest.json renamed
│   └── offline.html
├── src/                             ← Backend (deploy to Render)
│   ├── server.js                    ← hopefusion-backend.js renamed
│   ├── ai-engine.js                 ← hopefusion-ai-engine.js renamed
│   ├── payments.js                  ← hopefusion-payments.js renamed
│   ├── realtime.js                  ← hopefusion-realtime.js renamed
│   └── public-api.js                ← hopefusion-public-api.js renamed
├── contracts/                       ← Blockchain (deploy to Polygon)
│   └── HopeFusionEscrow.sol         ← hopefusion-blockchain.sol renamed
├── mobile/                          ← React Native (deploy to Play/App Store)
│   ├── App.js
│   ├── app.json
│   ├── package.json
│   └── src/
│       ├── context/AuthContext.js
│       ├── services/api.js
│       ├── services/notifications.js
│       └── screens/
│           ├── dashboard/DashboardScreen.js
│           └── matches/MatchesScreen.js
├── package.json                     ← hopefusion-package.json renamed
├── .env                             ← hopefusion-env.txt renamed to .env
└── .gitignore
```

---

## STEP 1 — ACCOUNTS TO CREATE (all free to start)

| Service | URL | What for |
|---------|-----|----------|
| GitHub | github.com | Code repository |
| Supabase | supabase.com | PostgreSQL database |
| Upstash | upstash.com | Redis cache |
| Render | render.com | Backend hosting |
| Netlify | netlify.com | Frontend hosting |
| Anthropic | console.anthropic.com | Claude AI API |
| Paystack | paystack.com | Card payments |
| MTN MoMo | momodeveloper.mtn.com | Mobile money |
| Cloudinary | cloudinary.com | File storage |
| Resend | resend.com | Transactional email |

---

## STEP 2 — DATABASE SETUP (Supabase)

1. Go to **supabase.com** → New project → Name: `hopefusion-africa`
2. Choose region: **West EU** (closest to West Africa)
3. Set a strong database password — save it
4. Go to **SQL Editor** → paste this entire block and click **Run**:

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Run the full SCHEMA from hopefusion-backend.js
-- (The SCHEMA export string contains all 13 tables)

-- Additional tables for public API
CREATE TABLE IF NOT EXISTS api_keys (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  key_hash       TEXT UNIQUE NOT NULL,
  scopes         TEXT[] DEFAULT ARRAY['startups:read'],
  tier           TEXT DEFAULT 'free',
  is_active      BOOLEAN DEFAULT TRUE,
  last_used_at   TIMESTAMPTZ,
  request_count  INTEGER DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhooks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  events            TEXT[] NOT NULL,
  secret            TEXT NOT NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  last_delivered_at TIMESTAMPTZ,
  delivery_count    INTEGER DEFAULT 0,
  failure_count     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

5. Go to **Settings → Database** → copy the **Connection string (URI)**

---

## STEP 3 — REDIS SETUP (Upstash)

1. Go to **upstash.com** → Create database → Name: `hopefusion-cache`
2. Region: **EU-West-1** (or closest to your server)
3. Copy the **REDIS_URL** — looks like: `rediss://default:password@host.upstash.io:6379`

---

## STEP 4 — EMAIL SETUP (Resend)

1. Go to **resend.com** → Add your domain `hopefusionafrica.com`
2. Add the DNS records they show you
3. Create an API key → copy it
4. Use `info@hopefusionafrica.com` as SMTP_FROM

---

## STEP 5 — FILE STORAGE (Cloudinary)

1. Go to **cloudinary.com** → free account
2. Dashboard → copy: Cloud name, API Key, API Secret
3. Create upload presets for: `pitch_decks`, `logos`, `profile_photos`

---

## STEP 6 — PUSH PAYMENT SETUP

### Paystack
1. Go to **paystack.com** → create account (Ghana/Nigeria/Kenya)
2. Settings → API Keys → copy **Secret key** (sk_live_...)
3. Settings → Webhooks → Add: `https://hopefusion-api.onrender.com/api/paystack/webhook`
4. Create subscription plans (Settings → Plans):
   - Startup Pro: GHS 290/month
   - Investor Pro: GHS 990/month

### MTN MoMo
1. Go to **momodeveloper.mtn.com** → register
2. Subscribe to: **Collections** and **Disbursements** APIs
3. Create sandbox API user and key
4. Copy: Subscription Key, API User UUID, API Key

---

## STEP 7 — GITHUB REPOSITORY

```bash
# On your computer:
mkdir hopefusion-africa && cd hopefusion-africa

# Create folder structure
mkdir -p public src contracts mobile/src/{context,services,screens}

# Move your downloaded files into the right folders
# (rename as shown in the file map above)

# Initialize git
git init
cat > .gitignore << 'IGNORE'
node_modules/
.env
*.env.local
.DS_Store
dist/
build/
artifacts/
cache/
IGNORE

# Copy your .env template
cp hopefusion-env.txt .env
# Fill in all values

git add .
git commit -m "feat: HopeFusion Africa platform — initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/hopefusion-africa.git
git push -u origin main
```

---

## STEP 8 — DEPLOY BACKEND (Render)

### Main API Server
1. Go to **render.com** → New → **Web Service**
2. Connect GitHub → select `hopefusion-africa`
3. Settings:
   - **Name:** `hopefusion-api`
   - **Root directory:** (leave blank)
   - **Build command:** `npm install`
   - **Start command:** `node src/server.js`
   - **Instance type:** Free (start) → Starter $7/mo when ready

4. **Environment Variables** — add all from your `.env`:
```
NODE_ENV=production
DATABASE_URL=postgresql://...  (from Supabase)
REDIS_URL=rediss://...          (from Upstash)
JWT_SECRET=your_64_char_secret
ANTHROPIC_API_KEY=sk-ant-...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_WEBHOOK_SECRET=...
MTN_MOMO_SUBSCRIPTION_KEY=...
MTN_MOMO_API_USER=...
MTN_MOMO_API_KEY=...
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_...
SMTP_FROM=info@hopefusionafrica.com
CLOUDINARY_CLOUD_NAME=hopefusion
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=https://hopefusionafrica.com
```

5. Click **Create Web Service** → wait ~3 min for deploy
6. Your API URL: `https://hopefusion-api.onrender.com`

### AI Engine Server
1. New → **Web Service** → same repo
2. **Name:** `hopefusion-ai`
3. **Start command:** `node src/ai-engine.js`
4. Add env: `ANTHROPIC_API_KEY`, `PORT=3001`
5. Your AI URL: `https://hopefusion-ai.onrender.com`

### Run database schema
After both services are live, open Render Shell for `hopefusion-api`:
```bash
node -e "
const { Pool } = require('pg');
const { SCHEMA } = require('./src/server.js');
const db = new Pool({ connectionString: process.env.DATABASE_URL });
db.query(SCHEMA).then(() => { console.log('Schema created'); process.exit(0); }).catch(console.error);
"
```

---

## STEP 9 — DEPLOY FRONTEND (Netlify)

### Option A — Drag and drop (fastest)
1. Go to **app.netlify.com** → "Add new site" → "Deploy manually"
2. Drag your entire `public/` folder into the upload area
3. Site is live in 30 seconds

### Option B — Connect GitHub (auto-deploys on push)
1. "Add new site" → "Import an existing project"
2. Connect GitHub → select repo
3. Settings:
   - **Base directory:** `public`
   - **Publish directory:** `public`
   - **Build command:** (leave blank — static files)

### Add environment variables (Netlify)
Site settings → Environment variables:
```
VITE_API_URL=https://hopefusion-api.onrender.com
VITE_AI_URL=https://hopefusion-ai.onrender.com
VITE_WS_URL=wss://hopefusion-api.onrender.com
```

### Connect custom domain
1. Site settings → **Domain management** → Add custom domain
2. Enter: `hopefusionafrica.com`
3. Add DNS records at your registrar:
   ```
   A     @    75.2.60.5
   CNAME www  your-site.netlify.app
   ```
4. SSL auto-activates within minutes

---

## STEP 10 — CONNECT FRONTEND TO BACKEND

Add this to `<head>` of every HTML page:

```html
<script>
window.HFA_CONFIG = {
  API_URL: 'https://hopefusion-api.onrender.com/api',
  AI_URL:  'https://hopefusion-ai.onrender.com/api',
  WS_URL:  'wss://hopefusion-api.onrender.com',
  ENV:     'production',
};
</script>
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script src="/hopefusion-webrtc-client.js"></script>
```

Replace mock data calls in each page. Example for the AI matching page:

```javascript
// Replace static match cards with real API data
async function loadMatches() {
  const token = localStorage.getItem('hfa_token');
  if (!token) { window.location = '/hopefusion-register.html'; return; }

  const res  = await fetch(`${window.HFA_CONFIG.API_URL}/matches/my?min_score=70`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const { data } = await res.json();

  // Render match cards dynamically
  const list = document.getElementById('matches-list');
  list.innerHTML = data.map(match => renderMatchCard(match)).join('');
}

// Replace static grants with real data
async function loadGrants() {
  const res  = await fetch(`${window.HFA_CONFIG.API_URL}/grants/my`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('hfa_token')}` }
  });
  const { data } = await res.json();
  renderGrants(data);
}

// Auth guard — add to every dashboard page
function authGuard() {
  const token = localStorage.getItem('hfa_token');
  if (!token) { window.location.href = '/hopefusion-register.html'; }
}
document.addEventListener('DOMContentLoaded', authGuard);
```

---

## STEP 11 — REGISTER SERVICE WORKER (PWA)

Add to `<body>` of `hopefusion-homepage.html`:

```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(r => console.log('[HFA] Service worker registered:', r.scope))
      .catch(e => console.error('[HFA] SW registration failed:', e));
  });
}
</script>
```

Add to `<head>` of all pages:
```html
<link rel="manifest" href="/manifest.json"/>
<meta name="theme-color" content="#2DB562"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-title" content="HopeFusion"/>
<link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
```

---

## STEP 12 — DEPLOY SMART CONTRACT (Polygon)

```bash
# Install Hardhat
cd contracts
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts

# hardhat.config.js
cat > hardhat.config.js << 'CONFIG'
require("@nomicfoundation/hardhat-toolbox");
module.exports = {
  solidity: "0.8.20",
  networks: {
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    },
    mumbai: {  // testnet
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY]
    }
  }
};
CONFIG

# Deploy to Polygon Mumbai testnet first
npx hardhat run scripts/deploy.js --network mumbai
```

Deploy script `scripts/deploy.js`:
```javascript
const { ethers } = require("hardhat");
async function main() {
  const treasury = process.env.TREASURY_ADDRESS;
  const Escrow   = await ethers.getContractFactory("HopeFusionEscrow");
  const escrow   = await Escrow.deploy(treasury);
  await escrow.waitForDeployment();
  console.log("HopeFusionEscrow deployed to:", await escrow.getAddress());
}
main().catch(console.error);
```

---

## STEP 13 — MOBILE APP (Expo + Play Store)

```bash
cd mobile
npm install
npm install -g eas-cli
eas login

# Build for Android (Play Store)
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android

# Build for iOS (App Store)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

`eas.json`:
```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal" },
    "production":  { "autoIncrement": true }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./google-service-account.json", "track": "internal" },
      "ios":      { "appleId": "info@hopefusionafrica.com", "ascAppId": "your-app-id" }
    }
  }
}
```

---

## STEP 14 — ADD LANGUAGE SWITCHER TO ALL PAGES

Add to `<head>` of every HTML page:
```html
<script type="module">
  import { HFAi18n } from '/hopefusion-i18n.js';
  window.hfai18n = new HFAi18n().init();
  window.t = (key, vars) => window.hfai18n.t(key, vars);
</script>
```

Add to nav of every page:
```html
<div id="lang-switcher"></div>
<script>
  window.addEventListener('load', () => window.hfai18n?.createSwitcher('lang-switcher'));
</script>
```

---

## STEP 15 — MONITORING & ANALYTICS

### Uptime monitoring (free)
1. Go to **uptimerobot.com** → Add monitors:
   - `https://hopefusionafrica.com` — homepage
   - `https://hopefusion-api.onrender.com/api/health` — API
   - `https://hopefusion-ai.onrender.com/api/health` — AI engine
2. Set alerts to `info@hopefusionafrica.com`

### Error tracking (Sentry — free)
```bash
npm install @sentry/node
```
```javascript
// Add to top of src/server.js
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
```

### Analytics (Plausible — privacy-friendly)
Add to `<head>` of all HTML pages:
```html
<script defer data-domain="hopefusionafrica.com" src="https://plausible.io/js/script.js"></script>
```

---

## STEP 16 — SECURITY HARDENING

Add to `src/server.js` (already included in helmet):
```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// CORS — restrict to your domain only
app.use(cors({
  origin: ['https://hopefusionafrica.com', 'https://www.hopefusionafrica.com'],
  credentials: true,
}));
```

Add to `public/_headers` (Netlify security headers):
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.socket.io https://fonts.googleapis.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; connect-src 'self' https://hopefusion-api.onrender.com https://hopefusion-ai.onrender.com wss://hopefusion-api.onrender.com https://api.anthropic.com;
```

---

## STEP 17 — POST-LAUNCH CHECKLIST

### Technical
- [ ] All 8 HTML pages live at hopefusionafrica.com
- [ ] API health check returns `{"status":"ok"}` at `/api/health`
- [ ] AI engine health check passes at AI URL `/api/health`
- [ ] Registration flow works end-to-end (sign up → verify email → login)
- [ ] AI match generation works (at least one test startup + investor)
- [ ] Grant application submission works
- [ ] Paystack test payment processes correctly
- [ ] Service worker registered (check Chrome DevTools → Application)
- [ ] PWA installable on Android Chrome
- [ ] Admin dashboard shows live data
- [ ] SSL certificate active (green padlock)
- [ ] All pages score 90+ on Google Lighthouse

### Business
- [ ] 10 beta testers recruited (5 startups, 3 investors, 2 mentors)
- [ ] Paystack account verified for live transactions
- [ ] Tony Elumelu Foundation grant data verified and accurate
- [ ] Terms of Service and Privacy Policy pages live
- [ ] info@hopefusionafrica.com email receiving and sending
- [ ] Social media accounts created (Twitter/X, LinkedIn, Instagram)
- [ ] Google Analytics / Plausible showing traffic
- [ ] Uptime monitoring alerts configured
- [ ] Backup schedule running (Supabase auto-backs up daily on free tier)

---

## ESTIMATED MONTHLY COSTS (at beta scale)

| Service | Free tier | Paid (when needed) |
|---------|-----------|-------------------|
| Netlify (frontend) | Free | $19/mo Pro |
| Render (backend) | Free (spins down) | $7/mo Starter |
| Render (AI engine) | Free | $7/mo Starter |
| Supabase (DB) | Free (500MB) | $25/mo Pro |
| Upstash (Redis) | Free (10K/day) | $10/mo Pay-as-you-go |
| Anthropic (Claude) | Pay-per-use | ~$50-200/mo at scale |
| Cloudinary (files) | Free (25GB) | $89/mo Plus |
| Resend (email) | Free (3K/mo) | $20/mo Pro |
| **Total to launch** | **$0** | **~$130-300/mo at scale** |

---

## QUICK LAUNCH COMMANDS

```bash
# 1. Clone and setup
git clone https://github.com/YOUR_USERNAME/hopefusion-africa.git
cd hopefusion-africa
npm install
cp .env.example .env    # fill in your values

# 2. Run locally
npm run dev             # API on port 3000
npm run dev:ai          # AI engine on port 3001
# Open public/hopefusion-homepage.html in browser

# 3. Deploy everything
git add . && git commit -m "feat: ready for production"
git push origin main    # triggers Netlify + Render auto-deploy

# 4. Verify deployment
curl https://hopefusion-api.onrender.com/api/health
curl https://hopefusion-ai.onrender.com/api/health
```

---

**Empower. Innovate. Thrive.**
*HopeFusion Africa — built to change the continent.*
