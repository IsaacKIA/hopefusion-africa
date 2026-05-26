# HopeFusion Africa — Complete Deployment Guide

## What you have

| File | Purpose |
|------|---------|
| `hopefusion-homepage.html` | Public homepage |
| `hopefusion-register.html` | Startup registration |
| `hopefusion-investor-dashboard.html` | Investor dashboard |
| `hopefusion-ai-matching.html` | AI matching engine UI |
| `hopefusion-grant-platform.html` | Grant platform |
| `hopefusion-elearning.html` | E-learning hub |
| `hopefusion-mentor-dashboard.html` | Mentor dashboard |
| `hopefusion-govt-support.html` | Government support |
| `hopefusion-ai-engine.js` | Claude AI backend service |
| `hopefusion-backend.js` | Main API + auth + DB |
| `hopefusion-payments.js` | Paystack + MTN MoMo + Flutterwave |
| `hopefusion-pwa.js` | Service worker (offline PWA) |
| `hopefusion-pwa-manifest.json` | Web app manifest |
| `hopefusion-package.json` | Node.js dependencies |
| `hopefusion-env.txt` | Environment variables template |

---

## Option A — Deploy frontend only (Netlify, 5 minutes, free)

1. Go to https://netlify.com and sign up free
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop ALL your `.html` files into the upload box
4. Your site is live at `https://hopefusion-xxxxx.netlify.app`
5. Set a custom domain: **Site settings → Domain management → Add custom domain** → `hopefusionafrica.com`

---

## Option B — Full stack deploy (Render.com, free tier)

### Step 1 — Set up GitHub repo
```bash
git init hopefusion-africa
cd hopefusion-africa
mkdir src public
# move HTML files to public/
# move .js files to src/
cp hopefusion-backend.js src/server.js
cp hopefusion-ai-engine.js src/ai-engine.js
cp hopefusion-payments.js src/payments.js
cp hopefusion-pwa.js public/sw.js
cp hopefusion-pwa-manifest.json public/manifest.json
cp hopefusion-package.json package.json
git add . && git commit -m "Initial HopeFusion Africa commit"
git remote add origin https://github.com/YOUR_USERNAME/hopefusion-africa.git
git push -u origin main
```

### Step 2 — Database (Supabase — free PostgreSQL)
1. Go to https://supabase.com → New project → **hopefusion-africa**
2. Copy the **Connection string** (Settings → Database)
3. Open the SQL editor and paste the entire `SCHEMA` from `hopefusion-backend.js`
4. Click **Run** — all tables created

### Step 3 — Redis (Upstash — free)
1. Go to https://upstash.com → Create database → **hopefusion-cache**
2. Copy the **REDIS_URL** from the dashboard

### Step 4 — Deploy backend to Render
1. Go to https://render.com → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Environment:** Node
4. Add all environment variables from `hopefusion-env.txt`
5. Deploy — your API URL: `https://hopefusion-api.onrender.com`

### Step 5 — Deploy AI engine to Render
1. New → **Web Service** → same repo
2. **Start command:** `npm run start:ai`
3. Add `ANTHROPIC_API_KEY` environment variable
4. Deploy — AI URL: `https://hopefusion-ai.onrender.com`

### Step 6 — Deploy frontend to Netlify
1. New site → Import from GitHub → your repo
2. **Publish directory:** `public`
3. Add environment variable: `VITE_API_URL=https://hopefusion-api.onrender.com`
4. Deploy

---

## Option C — Production deploy (AWS / GCP)

### Infrastructure (Terraform or manual)
```
AWS Architecture:
├── EC2 / ECS — Node.js backend (t3.small, ~$15/month)
├── RDS PostgreSQL — db.t3.micro (~$15/month)
├── ElastiCache Redis — cache.t3.micro (~$13/month)
├── S3 + CloudFront — static frontend (< $5/month)
├── ALB — load balancer + SSL termination
└── Route 53 — hopefusionafrica.com DNS
Total: ~$50/month to start
```

### SSL Certificate (free via Let's Encrypt)
```bash
sudo certbot --nginx -d hopefusionafrica.com -d www.hopefusionafrica.com
```

### Nginx config
```nginx
server {
    listen 443 ssl;
    server_name hopefusionafrica.com;

    location / {
        root /var/www/hopefusion;
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /ai/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## Step-by-step: Connect frontend to backend

Add this to the `<head>` of each HTML page:

```html
<script>
  window.HFA_CONFIG = {
    API_URL:    'https://hopefusion-api.onrender.com',
    AI_URL:     'https://hopefusion-ai.onrender.com',
    WS_URL:     'wss://hopefusion-api.onrender.com',
  };
</script>
```

Then in your page JS, replace all mock data calls with:

```javascript
// Example: load AI matches
const token = localStorage.getItem('hfa_token');
const res = await fetch(`${window.HFA_CONFIG.API_URL}/api/matches/my`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await res.json();
// render data into the UI
```

---

## Register service worker (PWA)

Add to `<body>` of `hopefusion-homepage.html`:

```html
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('HopeFusion SW registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  });
}
</script>
```

Add to `<head>`:

```html
<link rel="manifest" href="/manifest.json"/>
<meta name="theme-color" content="#2DB562"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<link rel="apple-touch-icon" href="/icons/icon-192x192.png"/>
```

---

## API keys you need to get (all free to start)

| Service | Get it at | Used for |
|---------|-----------|----------|
| Anthropic | console.anthropic.com | AI matching, pitch analysis |
| Supabase | supabase.com | PostgreSQL database |
| Upstash | upstash.com | Redis cache |
| Paystack | paystack.com | Card payments (GH, NG, KE) |
| MTN MoMo | momodeveloper.mtn.com | Mobile money |
| Flutterwave | flutterwave.com | Cross-border payments |
| Cloudinary | cloudinary.com | File/image storage |
| Resend | resend.com | Transactional emails |
| Render | render.com | Backend hosting |
| Netlify | netlify.com | Frontend hosting |

---

## Launch checklist

- [ ] All HTML pages deployed to Netlify
- [ ] Backend API running on Render
- [ ] AI engine running with Anthropic API key
- [ ] PostgreSQL schema created on Supabase
- [ ] Redis connected on Upstash
- [ ] Paystack test mode verified
- [ ] Service worker registered on homepage
- [ ] Custom domain connected (hopefusionafrica.com)
- [ ] SSL certificate active
- [ ] Environment variables set (never in code)
- [ ] Test registration flow end-to-end
- [ ] Test AI match generation
- [ ] Test grant application submission

**Empower. Innovate. Thrive.**
