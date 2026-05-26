/**
 * HopeFusion Africa — Frontend Connection Layer
 * Drop this single file into your public/ folder.
 * It connects ALL HTML pages to the live backend, AI engine,
 * real-time socket, payments, and i18n system.
 *
 * Add to every HTML page <head>:
 * <script src="/hopefusion-connection-layer.js"></script>
 */

/* ============================================================
   CONFIG — auto-detects dev vs production
   ============================================================ */
const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.HFA = {
  API_URL:  IS_DEV ? 'http://localhost:3000/api'  : 'https://hopefusion-africa.onrender.com/api',
  AI_URL:   IS_DEV ? 'http://localhost:3001/api'  : 'https://hopefusion-ai.onrender.com/api',
  WS_URL:   IS_DEV ? 'http://localhost:3000'      : 'wss://hopefusion-africa.onrender.com',
  PUB_API:  IS_DEV ? 'http://localhost:3000/v1'   : 'https://api.hopefusionafrica.com/v1',
  ENV:      IS_DEV ? 'development' : 'production',
  VERSION:  '1.0.0',
};

// Sync legacy config block dynamically for WebRTC and older pages
if (window.HFA_CONFIG) {
  window.HFA_CONFIG.API_URL = IS_DEV ? 'http://localhost:3000' : 'https://hopefusion-africa.onrender.com';
  window.HFA_CONFIG.AI_URL  = IS_DEV ? 'http://localhost:3001' : 'https://hopefusion-ai.onrender.com';
  window.HFA_CONFIG.WS_URL  = IS_DEV ? 'ws://localhost:3000'   : 'wss://hopefusion-africa.onrender.com';
  window.HFA_CONFIG.ENV     = window.HFA.ENV;
}


/* ============================================================
   TOKEN MANAGEMENT
   ============================================================ */
const Auth = {
  getToken:   ()    => localStorage.getItem('hfa_token'),
  getUser:    ()    => { try { return JSON.parse(localStorage.getItem('hfa_user')); } catch { return null; } },
  setSession: (t,u) => { localStorage.setItem('hfa_token', t); localStorage.setItem('hfa_user', JSON.stringify(u)); },
  clear:      ()    => { localStorage.removeItem('hfa_token'); localStorage.removeItem('hfa_user'); },
  isLoggedIn: ()    => !!localStorage.getItem('hfa_token'),
  getRole:    ()    => Auth.getUser()?.role || null,
};
window.HFA.Auth = Auth;

/* ============================================================
   HTTP CLIENT
   ============================================================ */
async function hfaFetch(url, options = {}) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res  = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      Auth.clear();
      window.location.href = '/hopefusion-register.html?session=expired';
      return null;
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (err.name === 'TypeError') throw new Error('Network error — check your connection');
    throw err;
  }
}

const API = {
  get:    (path, opts)        => hfaFetch(`${HFA.API_URL}${path}`, { method: 'GET', ...opts }),
  post:   (path, body, opts)  => hfaFetch(`${HFA.API_URL}${path}`, { method: 'POST',   body: JSON.stringify(body), ...opts }),
  patch:  (path, body, opts)  => hfaFetch(`${HFA.API_URL}${path}`, { method: 'PATCH',  body: JSON.stringify(body), ...opts }),
  delete: (path, opts)        => hfaFetch(`${HFA.API_URL}${path}`, { method: 'DELETE', ...opts }),
  ai:     (path, body)        => hfaFetch(`${HFA.AI_URL}${path}`,  { method: 'POST',   body: JSON.stringify(body) }),
};
window.HFA.API = API;

/* ============================================================
   AUTH FUNCTIONS
   ============================================================ */
const HFAAuth = {
  async login(email, password) {
    const data = await API.post('/auth/login', { email, password });
    if (data?.token) {
      Auth.setSession(data.token, data.user);
      HFASocket.connect();
    }
    return data;
  },

  async register(payload) {
    const data = await API.post('/auth/register', payload);
    if (data?.token) Auth.setSession(data.token, data.user);
    return data;
  },

  async logout() {
    try { await API.post('/auth/logout', {}); } catch {}
    HFASocket.disconnect();
    Auth.clear();
    window.location.href = '/hopefusion-homepage.html';
  },

  async getProfile() {
    return API.get('/users/me');
  },

  async updateProfile(updates) {
    const data = await API.patch('/users/me', updates);
    const current = Auth.getUser();
    Auth.setSession(Auth.getToken(), { ...current, ...updates });
    return data;
  },

  async verifyEmail(code) {
    return API.post('/auth/verify', { code });
  },

  async forgotPassword(email) {
    return API.post('/auth/forgot-password', { email });
  },

  async resetPassword(email, code, newPassword) {
    return API.post('/auth/reset-password', { email, code, newPassword });
  },

  /* Route guard — call at top of every protected page */
  guard(allowedRoles = null) {
    if (!Auth.isLoggedIn()) {
      window.location.href = `/hopefusion-register.html?redirect=${encodeURIComponent(window.location.pathname)}`;
      return false;
    }
    if (allowedRoles && !allowedRoles.includes(Auth.getRole())) {
      window.location.href = '/hopefusion-homepage.html?access=denied';
      return false;
    }
    return true;
  },
};
window.HFA.Auth = { ...Auth, ...HFAAuth };

/* ============================================================
   REAL-TIME SOCKET
   ============================================================ */
const HFASocket = {
  socket:    null,
  listeners: {},

  connect() {
    const token = Auth.getToken();
    if (!token || this.socket?.connected) return;

    // Load Socket.io if not already loaded
    if (typeof io === 'undefined') {
      const s = document.createElement('script');
      s.src   = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
      s.onload = () => this._initSocket(token);
      document.head.appendChild(s);
    } else {
      this._initSocket(token);
    }
  },

  _initSocket(token) {
    this.socket = io(HFA.WS_URL, {
      auth:       { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('[HFA Socket] Connected');
      this._emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[HFA Socket] Disconnected:', reason);
      this._emit('disconnected', { reason });
    });

    // Messages
    this.socket.on('message:received',    (m) => this._emit('message', m));
    this.socket.on('message:typing',      (d) => this._emit('typing', d));
    this.socket.on('message:typing_stop', (d) => this._emit('typing_stop', d));
    this.socket.on('message:read_receipt',(d) => this._emit('read_receipt', d));

    // Notifications
    this.socket.on('notification:new',           (n) => { this._emit('notification', n); HFANotifications.show(n); });
    this.socket.on('notifications:unread_count', (d) => { this._emit('unread_count', d); HFANotifications.updateBadge(d.count); });

    // Presence
    this.socket.on('user:online',  (d) => this._emit('user_online', d));
    this.socket.on('user:offline', (d) => this._emit('user_offline', d));

    // Matches + grants
    this.socket.on('match:new',           (m) => { this._emit('new_match', m);    HFANotifications.show({ title: '🤖 New AI match!', body: `${m.ai_score}% match found`, type: 'new_match' }); });
    this.socket.on('grant:status_update', (g) => { this._emit('grant_update', g); HFANotifications.show({ title: '🏆 Grant update', body: `${g.grant_name}: ${g.status}`, type: 'grant_deadline' }); });

    // Calls
    this.socket.on('call:incoming', (d) => this._emit('incoming_call', d));
    this.socket.on('call:accepted', (d) => this._emit('call_accepted', d));
    this.socket.on('call:declined', (d) => this._emit('call_declined', d));
    this.socket.on('call:ended',    (d) => this._emit('call_ended', d));
  },

  on(event, fn)   { (this.listeners[event] = this.listeners[event] || []).push(fn); },
  off(event, fn)  { this.listeners[event] = (this.listeners[event] || []).filter(f => f !== fn); },
  _emit(event, d) { (this.listeners[event] || []).forEach(fn => fn(d)); },

  send(event, data, cb) {
    if (!this.socket?.connected) { console.warn('[HFA Socket] Not connected'); return; }
    this.socket.emit(event, data, cb);
  },

  sendMessage(recipientId, content, threadId = null) {
    return new Promise((resolve, reject) => {
      this.send('message:send', { recipient_id: recipientId, content, thread_id: threadId }, (res) => {
        if (res?.error) reject(new Error(res.error));
        else resolve(res?.data);
      });
    });
  },

  markRead(threadId) { this.send('message:read', { thread_id: threadId }); },
  typing(threadId, recipientId)     { this.send('message:typing',      { thread_id: threadId, recipient_id: recipientId }); },
  stopTyping(threadId, recipientId) { this.send('message:typing_stop', { thread_id: threadId, recipient_id: recipientId }); },

  disconnect() { this.socket?.disconnect(); this.socket = null; },
};
window.HFA.Socket = HFASocket;

/* ============================================================
   IN-APP NOTIFICATIONS
   ============================================================ */
const HFANotifications = {
  container: null,
  badgeEls:  [],

  init() {
    this.container = document.createElement('div');
    this.container.id = 'hfa-notif-container';
    Object.assign(this.container.style, {
      position: 'fixed', top: '80px', right: '20px', zIndex: '9999',
      display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '360px',
    });
    document.body.appendChild(this.container);

    // Find all badge elements
    this.badgeEls = Array.from(document.querySelectorAll('[data-notif-badge]'));
  },

  show({ title, body, type = 'info', duration = 5000 } = {}) {
    if (!this.container) this.init();

    const colors = {
      new_match:      { bg: '#E9F9EF', border: '#2DB562', icon: '🤖' },
      grant_deadline: { bg: '#FEF7E8', border: '#E8A020', icon: '🏆' },
      message:        { bg: '#eef3fe', border: '#2563eb', icon: '💬' },
      session_reminder:{ bg: '#f3e8ff', border: '#7c3aed', icon: '📅' },
      info:           { bg: '#F4F5F7', border: '#e4e4e4', icon: 'ℹ️'  },
    };
    const c = colors[type] || colors.info;

    const el = document.createElement('div');
    el.style.cssText = `
      background:${c.bg};border:1.5px solid ${c.border};border-radius:14px;
      padding:14px 16px;box-shadow:0 8px 32px rgba(0,0,0,0.12);
      display:flex;align-items:flex-start;gap:12px;cursor:pointer;
      animation:hfaSlideIn .3s ease;font-family:'DM Sans',sans-serif;
    `;

    el.innerHTML = `
      <span style="font-size:22px;flex-shrink:0">${c.icon}</span>
      <div style="flex:1">
        <div style="font-family:'Sora',sans-serif;font-size:14px;font-weight:600;color:#111;margin-bottom:3px">${title || 'Notification'}</div>
        <div style="font-size:12.5px;color:#6b6b6b;line-height:1.5">${body || ''}</div>
      </div>
      <button onclick="this.closest('[data-hfa-notif]').remove()" style="background:none;border:none;cursor:pointer;color:#bbb;font-size:18px;padding:0;line-height:1">×</button>
    `;
    el.setAttribute('data-hfa-notif', '');
    el.onclick = (e) => { if (e.target.tagName !== 'BUTTON') el.remove(); };

    // Add animation keyframe once
    if (!document.getElementById('hfa-notif-styles')) {
      const style = document.createElement('style');
      style.id = 'hfa-notif-styles';
      style.textContent = `@keyframes hfaSlideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`;
      document.head.appendChild(style);
    }

    this.container.appendChild(el);
    if (duration > 0) setTimeout(() => el.remove(), duration);

    // Browser notification if page not focused
    if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192x192.png', tag: type });
    }
  },

  updateBadge(count) {
    this.badgeEls.forEach(el => {
      el.textContent = count > 0 ? count : '';
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  async requestPermission() {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  },
};
window.HFA.Notifications = HFANotifications;

/* ============================================================
   AI FUNCTIONS — call Claude API endpoints
   ============================================================ */
const HFAAI = {
  async getMatches(startupProfile, investorProfiles) {
    return API.ai('/ai/match/batch', { startup: startupProfile, investors: investorProfiles });
  },

  async analyzePitch(pitchText, startupData = {}) {
    return API.ai('/ai/pitch/analyze', { pitch_text: pitchText, startupData });
  },

  async generateOneliner(startupData) {
    return API.ai('/ai/pitch/oneliner', startupData);
  },

  async checkGrantEligibility(startup, grant) {
    return API.ai('/ai/grants/check', { startup, grant });
  },

  async discoverGrants(startup) {
    return API.ai('/ai/grants/discover', { startup });
  },

  async getRecommendations(user, type = 'all') {
    return API.ai('/ai/recommend', { user, type });
  },

  async checkCompliance(startup, country, question = null) {
    return API.ai('/ai/compliance/check', { startup, country, question });
  },

  async buildFinancialModel(startup, months = 18) {
    return API.ai('/ai/financials/model', { startup, months });
  },

  /* Streaming chat — calls handler with each text chunk */
  async chat(messages, context = 'general', onChunk, onDone) {
    const token = Auth.getToken();
    const res   = await fetch(`${HFA.AI_URL}/ai/chat/stream`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body:    JSON.stringify({ messages, context }),
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        try {
          const payload = JSON.parse(line.slice(6));
          if (payload.text) { fullText += payload.text; onChunk?.(payload.text, fullText); }
          if (payload.done) { onDone?.(fullText, payload.usage); }
          if (payload.error) throw new Error(payload.error);
        } catch {}
      }
    }
    return fullText;
  },
};
window.HFA.AI = HFAAI;

/* ============================================================
   PAYMENT FUNCTIONS
   ============================================================ */
const HFAPayments = {
  async initPaystack({ email, amount_usd, currency = 'GHS', plan, metadata = {} }) {
    const data = await API.post('/paystack/initialize', { email, amount_usd, currency, plan, metadata });
    if (data?.data?.authorization_url) {
      window.location.href = data.data.authorization_url;
    }
    return data;
  },

  async verifyPaystack(reference) {
    return API.get(`/paystack/verify/${reference}`);
  },

  async initMoMo({ phone, amount, currency = 'GHS', reference, description }) {
    return API.post('/momo/collect', { phone, amount, currency, reference, description });
  },

  async checkMoMoStatus(referenceId) {
    return API.get(`/momo/status/${referenceId}`);
  },

  async initFlutterwave({ amount, currency, email, phone, name, tx_ref }) {
    const data = await API.post('/flutterwave/initialize', { amount, currency, email, phone, name, tx_ref });
    if (data?.data?.payment_link) window.location.href = data.data.payment_link;
    return data;
  },

  async getPlans() {
    return API.get('/plans');
  },

  /* Poll MoMo status until resolved */
  async pollMoMo(referenceId, intervalMs = 3000, maxAttempts = 20) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const data = await this.checkMoMoStatus(referenceId);
          const status = data?.data?.status;
          if (status === 'SUCCESSFUL') { clearInterval(poll); resolve(data.data); }
          if (status === 'FAILED')     { clearInterval(poll); reject(new Error('MoMo payment failed')); }
          if (attempts >= maxAttempts) { clearInterval(poll); reject(new Error('Payment timeout')); }
        } catch (err) { clearInterval(poll); reject(err); }
      }, intervalMs);
    });
  },
};
window.HFA.Payments = HFAPayments;

/* ============================================================
   DATA LOADERS — pre-built fetch functions for each page
   ============================================================ */
const HFAData = {
  /* Dashboard */
  async loadDashboard() {
    const [profile, matches, notifications] = await Promise.allSettled([
      API.get('/users/me'),
      API.get('/matches/my?limit=5&min_score=80'),
      API.get('/notifications'),
    ]);
    return {
      profile:       profile.value?.data,
      matches:       matches.value?.data || [],
      notifications: notifications.value?.data || [],
      unreadCount:   notifications.value?.unread || 0,
    };
  },

  /* AI Matching */
  async loadMatches({ minScore = 70, targetType, status, limit = 20 } = {}) {
    const params = new URLSearchParams({ min_score: minScore, limit });
    if (targetType) params.set('target_type', targetType);
    if (status) params.set('status', status);
    return API.get(`/matches/my?${params}`);
  },

  async updateMatchStatus(matchId, status) {
    return API.patch(`/matches/${matchId}/status`, { status });
  },

  /* Grants */
  async loadMyGrants() {
    return API.get('/grants/my');
  },

  async submitGrantApplication(payload) {
    return API.post('/grants/apply', payload);
  },

  /* Mentors */
  async loadMentors({ limit = 20 } = {}) {
    return API.get(`/mentors?limit=${limit}`);
  },

  async bookSession(payload) {
    return API.post('/sessions', payload);
  },

  /* Messages */
  async loadThreads() {
    return API.get('/messages/threads');
  },

  async sendMessage(recipientId, content, threadId = null) {
    return HFASocket.sendMessage(recipientId, content, threadId);
  },

  /* Notifications */
  async loadNotifications() {
    return API.get('/notifications');
  },

  async markAllNotificationsRead() {
    return API.patch('/notifications/read-all', {});
  },

  /* Startup profile */
  async updateStartup(updates) {
    return API.post('/startups', updates);
  },

  async loadStartup(idOrSlug) {
    return API.get(`/startups/${idOrSlug}`);
  },

  /* Investor profile */
  async updateInvestor(updates) {
    return API.post('/investors', updates);
  },

  /* Platform stats (public) */
  async loadPlatformStats() {
    const res = await fetch(`${HFA.PUB_API}/platform/stats`);
    return res.json();
  },
};
window.HFA.Data = HFAData;

/* ============================================================
   UI HELPERS — render functions used across pages
   ============================================================ */
const HFAUI = {
  /* Show a loading spinner in a container */
  showLoading(containerId, message = 'Loading…') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px;gap:16px">
        <div style="width:40px;height:40px;border:3px solid #E9F9EF;border-top:3px solid #2DB562;border-radius:50%;animation:hfaSpin .8s linear infinite"></div>
        <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;color:#6b6b6b">${message}</div>
      </div>
    `;
    if (!document.getElementById('hfa-ui-styles')) {
      const s = document.createElement('style');
      s.id = 'hfa-ui-styles';
      s.textContent = `@keyframes hfaSpin{to{transform:rotate(360deg)}}@keyframes hfaFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
      document.head.appendChild(s);
    }
  },

  /* Show error state */
  showError(containerId, message = 'Something went wrong', onRetry = null) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div style="text-align:center;padding:48px;font-family:'DM Sans',sans-serif">
        <div style="font-size:40px;margin-bottom:16px">⚠️</div>
        <div style="font-family:'Sora',sans-serif;font-size:16px;font-weight:600;color:#111;margin-bottom:8px">Something went wrong</div>
        <div style="font-size:14px;color:#6b6b6b;margin-bottom:20px">${message}</div>
        ${onRetry ? `<button onclick="(${onRetry.toString()})()" style="background:#2DB562;color:#fff;border:none;padding:10px 24px;border-radius:9px;font-size:14px;font-family:'Space Grotesk',sans-serif;font-weight:500;cursor:pointer">Try again</button>` : ''}
      </div>
    `;
  },

  /* Show empty state */
  showEmpty(containerId, { icon = '📭', title = 'Nothing here yet', subtitle = '', action = null } = {}) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div style="text-align:center;padding:64px 24px;font-family:'DM Sans',sans-serif">
        <div style="font-size:48px;margin-bottom:16px">${icon}</div>
        <div style="font-family:'Sora',sans-serif;font-size:18px;font-weight:600;color:#111;margin-bottom:8px">${title}</div>
        <div style="font-size:14px;color:#6b6b6b;max-width:320px;margin:0 auto 24px;line-height:1.65">${subtitle}</div>
        ${action ? `<button onclick="${action.fn}()" style="background:#2DB562;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-size:14px;font-family:'Space Grotesk',sans-serif;font-weight:500;cursor:pointer">${action.label}</button>` : ''}
      </div>
    `;
  },

  /* Render AI match score ring */
  renderScoreRing(score, color = '#2DB562', size = 88) {
    const r   = size * 0.41;
    const circ = 2 * Math.PI * r;
    const offset = circ * (1 - score / 100);
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex-shrink:0">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#f0f0f0" stroke-width="8"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
          stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 ${size/2} ${size/2})"/>
        <text x="${size/2}" y="${size/2 + 6}" text-anchor="middle"
          font-family="Sora,sans-serif" font-size="${size * 0.22}" font-weight="700" fill="#111">${score}%</text>
      </svg>
    `;
  },

  /* Format currency */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  },

  /* Format relative time */
  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  },

  /* Animate counter from 0 to target */
  animateCounter(el, target, duration = 1500, suffix = '') {
    if (!el) return;
    const start   = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value    = Math.round(progress * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  },

  /* Intersection observer for scroll animations */
  initReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-reveal]').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      el.style.transition = `opacity .6s ease ${el.dataset.revealDelay || '0s'}, transform .6s ease ${el.dataset.revealDelay || '0s'}`;
      observer.observe(el);
    });
  },

  /* Toast helper */
  toast(message, type = 'success') {
    HFANotifications.show({
      title: type === 'success' ? '✓ Done' : type === 'error' ? '✗ Error' : 'ℹ Info',
      body:  message,
      type:  type === 'success' ? 'info' : type,
      duration: 3500,
    });
  },

  /* Populate user profile fields dynamically */
  renderUserProfile() {
    const user = Auth.getUser();
    if (!user) return;
    document.querySelectorAll('[data-hfa-user-name]').forEach(el => { 
      el.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User'; 
    });
    document.querySelectorAll('[data-hfa-user-role]').forEach(el => { 
      el.textContent = user.role || ''; 
    });
    document.querySelectorAll('[data-hfa-user-email]').forEach(el => { 
      el.textContent = user.email || ''; 
    });
    document.querySelectorAll('[data-hfa-user-initials]').forEach(el => { 
      el.textContent = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || 'U'; 
    });
  },
};
window.HFA.UI = HFAUI;

/* ============================================================
   AUTO-INIT ON DOM READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  /* Populate user info wherever data-hfa-user-* attributes exist */
  const user = Auth.getUser();
  if (user) {
    document.querySelectorAll('[data-hfa-user-name]').forEach(el   => { el.textContent = `${user.first_name} ${user.last_name}`; });
    document.querySelectorAll('[data-hfa-user-role]').forEach(el   => { el.textContent = user.role; });
    document.querySelectorAll('[data-hfa-user-email]').forEach(el  => { el.textContent = user.email; });
    document.querySelectorAll('[data-hfa-user-initials]').forEach(el => { el.textContent = (user.first_name?.[0] || '') + (user.last_name?.[0] || ''); });
  }

  /* Auto-connect socket if logged in */
  if (Auth.isLoggedIn()) {
    HFASocket.connect();
    HFANotifications.init();
  }

  /* Init scroll reveal animations */
  HFAUI.initReveal();

  /* Handle payment callbacks */
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference') || urlParams.get('trxref');
  if (reference && window.location.pathname.includes('payment')) {
    HFAPayments.verifyPaystack(reference)
      .then(data => HFAUI.toast('Payment successful! Your plan is now active.'))
      .catch(err => HFAUI.toast('Payment verification failed. Contact support.', 'error'));
  }

  /* Handle session expired */
  if (urlParams.get('session') === 'expired') {
    HFANotifications.init();
    HFANotifications.show({ title: 'Session expired', body: 'Please sign in again.', type: 'info' });
  }

  /* Logout buttons */
  document.querySelectorAll('[data-hfa-logout]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); HFAAuth.logout(); });
  });

  console.log(`[HFA] Connection layer v${HFA.VERSION} loaded — env: ${HFA.ENV}`);
});

/* ============================================================
   WEB3 ESCROW SERVICE (Ethers.js)
   ============================================================ */
const HFAWeb3 = {
  contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Local Hardhat Deployed Escrow Contract
  provider: null,
  signer: null,
  contract: null,

  async init() {
    if (this.contract) return;
    
    // Load Ethers.js if not already present
    if (typeof window.ethers === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.umd.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    if (!window.ethereum) {
      throw new Error("No Web3 provider found. Please install MetaMask.");
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();

    const humanABI = [
      "function createEscrow(address _startup, address _arbitrator, string _startupName, string _dealRef, string[] _milestoneTitles, string[] _milestoneDescriptions, uint256[] _milestoneAmounts, uint256[] _milestoneDueDates, address _tokenAddress) external payable returns (bytes32 escrowId)",
      "function submitMilestoneEvidence(bytes32 escrowId, uint256 milestoneIndex, string evidenceURI) external",
      "function approveMilestone(bytes32 escrowId, uint256 milestoneIndex) external",
      "function getEscrow(bytes32 escrowId) external view returns (bytes32 id, address startup, address investor, uint256 totalAmount, uint256 releasedAmount, uint8 status, string startupName, string dealRef, uint256 milestoneCount, uint256 createdAt)",
      "function getMilestone(bytes32 escrowId, uint256 index) external view returns (string title, uint256 amount, uint256 dueDate, uint8 status, string evidenceURI, uint256 reviewDeadline)",
      "function getStartupEscrows(address startup) external view returns (bytes32[])",
      "function getInvestorEscrows(address investor) external view returns (bytes32[])"
    ];

    this.contract = new ethers.Contract(this.contractAddress, humanABI, this.signer);
  },

  async connectWallet() {
    await this.init();
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    return accounts[0];
  },

  async getActiveAddress() {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  },

  async createEscrowDeal({ startup, startupName, dealRef, titles, descriptions, amountsEth, dueDates }) {
    await this.init();
    
    // Parse amounts in Ether/MATIC to Wei
    const parsedAmounts = amountsEth.map(amt => ethers.parseEther(amt.toString()));
    const totalAmountWei = parsedAmounts.reduce((a, b) => a + b, 0n);
    
    // Deployed platform fee is 2% = 200 bps
    const feeWei = (totalAmountWei * 200n) / 10000n;
    const requiredValueWei = totalAmountWei + feeWei;

    const tx = await this.contract.createEscrow(
      startup,
      ethers.ZeroAddress, // Arbitrator = address(0) defaults to contract owner (treasury)
      startupName,
      dealRef,
      titles,
      descriptions,
      parsedAmounts,
      dueDates.map(date => BigInt(Math.floor(new Date(date).getTime() / 1000))),
      ethers.ZeroAddress, // Native MATIC escrow
      { value: requiredValueWei }
    );
    
    const receipt = await tx.wait();
    return receipt;
  },

  async submitMilestone(escrowId, milestoneIndex, evidenceURI) {
    await this.init();
    const tx = await this.contract.submitMilestoneEvidence(escrowId, BigInt(milestoneIndex), evidenceURI);
    return await tx.wait();
  },

  async approveMilestone(escrowId, milestoneIndex) {
    await this.init();
    const tx = await this.contract.approveMilestone(escrowId, BigInt(milestoneIndex));
    return await tx.wait();
  },

  async getEscrowDetails(escrowId) {
    await this.init();
    const details = await this.contract.getEscrow(escrowId);
    
    const statusMap = ["Active", "Completed", "Disputed", "Cancelled"];
    return {
      id: details[0],
      startup: details[1],
      investor: details[2],
      totalAmount: ethers.formatEther(details[3]),
      releasedAmount: ethers.formatEther(details[4]),
      status: statusMap[Number(details[5])],
      startupName: details[6],
      dealRef: details[7],
      milestoneCount: Number(details[8]),
      createdAt: new Date(Number(details[9]) * 1000)
    };
  },

  async getMilestoneDetails(escrowId, index) {
    await this.init();
    const mil = await this.contract.getMilestone(escrowId, BigInt(index));
    const statusMap = ["Locked", "PendingEvidence", "UnderReview", "Released", "Rejected"];
    return {
      title: mil[0],
      amount: ethers.formatEther(mil[1]),
      dueDate: new Date(Number(mil[2]) * 1000),
      status: statusMap[Number(mil[3])],
      evidenceURI: mil[4],
      reviewDeadline: Number(mil[5]) > 0 ? new Date(Number(mil[5]) * 1000) : null
    };
  },

  async loadUserEscrows(address, isStartup = true) {
    await this.init();
    const list = isStartup 
      ? await this.contract.getStartupEscrows(address)
      : await this.contract.getInvestorEscrows(address);
    
    const results = [];
    for (const id of list) {
      results.push(await this.getEscrowDetails(id));
    }
    return results;
  }
};
window.HFA.Web3 = HFAWeb3;

/* Export for ES module usage if needed */
// export { API, Auth, HFAAuth, HFASocket, HFANotifications, HFAAI, HFAPayments, HFAData, HFAUI, HFAWeb3 };
