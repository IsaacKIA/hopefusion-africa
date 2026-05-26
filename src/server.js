/**
 * HopeFusion Africa — Complete Backend API
 * Stack: Node.js + Express + PostgreSQL + Redis + JWT + OAuth2
 * Install: npm install express pg redis jsonwebtoken bcryptjs
 *          passport passport-google-oauth20 passport-jwt
 *          nodemailer multer cloudinary dotenv cors helmet morgan
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { createClient } from 'redis';
import pg from 'pg';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5500',
    credentials: true,
  }
});
const { Pool } = pg;

/* ============================================================
   DATABASE CONNECTIONS
   ============================================================ */

// PostgreSQL pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis client
const redis = createClient({ url: process.env.REDIS_URL });
redis.connect().catch(console.error);

/* ============================================================
   REAL-TIME WEBSOCKETS (Socket.io)
   ============================================================ */
const activeSockets = new Map(); // userId -> Set of socketId
const socketIdToUser = new Map(); // socketId -> userId

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: Token required'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.userId;
  console.log(`[Socket] User connected: ${userId} (${socket.user.role})`);

  if (!activeSockets.has(userId)) {
    activeSockets.set(userId, new Set());
  }
  activeSockets.get(userId).add(socket.id);
  socketIdToUser.set(socket.id, userId);

  socket.join(`user:${userId}`);

  // Broadcast user online status
  socket.broadcast.emit('user:online', { userId });

  // Handle live message typing indicator
  socket.on('message:typing', (data) => {
    if (data.recipient_id) {
      io.to(`user:${data.recipient_id}`).emit('message:typing', {
        thread_id: data.thread_id,
        sender_id: userId
      });
    }
  });

  socket.on('message:typing_stop', (data) => {
    if (data.recipient_id) {
      io.to(`user:${data.recipient_id}`).emit('message:typing_stop', {
        thread_id: data.thread_id,
        sender_id: userId
      });
    }
  });

  // Handle message reading receipts
  socket.on('message:read', async (data) => {
    try {
      await db.query(
        'UPDATE messages SET is_read = TRUE WHERE thread_id = $1 AND recipient_id = $2',
        [data.thread_id, userId]
      );
      const [userA, userB] = data.thread_id.split(':');
      const partnerId = userA === userId ? userB : userA;
      if (partnerId) {
        io.to(`user:${partnerId}`).emit('message:read_receipt', {
          thread_id: data.thread_id,
          reader_id: userId
        });
      }
    } catch (err) {
      console.error('Socket message:read error:', err);
    }
  });

  // Handle sending messages over sockets
  socket.on('message:send', async (data, callback) => {
    try {
      const { recipient_id, content, thread_id } = data;
      if (!recipient_id || !content) {
        return callback?.({ error: 'recipient_id and content required' });
      }
      const tId = thread_id || [userId, recipient_id].sort().join(':');
      const { rows } = await db.query(
        'INSERT INTO messages (sender_id, recipient_id, thread_id, content) VALUES ($1,$2,$3,$4) RETURNING *',
        [userId, recipient_id, tId, content]
      );
      const msg = rows[0];
      io.to(`user:${recipient_id}`).emit('message:received', msg);
      io.to(`user:${userId}`).emit('message:received', msg);
      
      callback?.({ success: true, data: msg });
    } catch (err) {
      console.error('Socket message:send error:', err);
      callback?.({ error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] User disconnected: ${userId}`);
    const userSets = activeSockets.get(userId);
    if (userSets) {
      userSets.delete(socket.id);
      if (userSets.size === 0) {
        activeSockets.delete(userId);
        socket.broadcast.emit('user:offline', { userId });
      }
    }
    socketIdToUser.delete(socket.id);
  });
});

/* ============================================================
   MIDDLEWARE
   ============================================================ */

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

/* ============================================================
   DATABASE SCHEMA — run once to set up PostgreSQL
   ============================================================ */

export const SCHEMA = `
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role          TEXT NOT NULL CHECK (role IN ('startup','investor','mentor','admin')),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  country       TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  linkedin_url  TEXT,
  twitter_url   TEXT,
  website_url   TEXT,
  is_verified   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  oauth_provider TEXT,
  oauth_id      TEXT,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ─── STARTUPS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS startups (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE,
  tagline          TEXT,
  description      TEXT,
  sector           TEXT NOT NULL,
  sub_sectors      TEXT[],
  country          TEXT NOT NULL,
  city             TEXT,
  stage            TEXT CHECK (stage IN ('idea','mvp','early_traction','growth','series_a','established')),
  founded_year     INTEGER,
  team_size        INTEGER DEFAULT 1,
  website_url      TEXT,
  pitch_deck_url   TEXT,
  logo_url         TEXT,
  demo_url         TEXT,
  funding_goal     BIGINT,
  funding_raised   BIGINT DEFAULT 0,
  funding_type     TEXT[],
  annual_revenue   BIGINT,
  mrr              BIGINT,
  customers        INTEGER DEFAULT 0,
  sdgs             INTEGER[],
  is_women_led     BOOLEAN DEFAULT FALSE,
  is_verified      BOOLEAN DEFAULT FALSE,
  ai_match_score   JSONB DEFAULT '{}',
  status           TEXT DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_startups_founder  ON startups(founder_id);
CREATE INDEX IF NOT EXISTS idx_startups_sector   ON startups(sector);
CREATE INDEX IF NOT EXISTS idx_startups_country  ON startups(country);
CREATE INDEX IF NOT EXISTS idx_startups_stage    ON startups(stage);
CREATE INDEX IF NOT EXISTS idx_startups_name     ON startups USING gin(name gin_trgm_ops);

-- ─── STARTUP TEAM MEMBERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS startup_team (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id   UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL,
  linkedin_url TEXT,
  is_founder   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INVESTORS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS investors (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_name         TEXT,
  investor_type     TEXT CHECK (investor_type IN ('angel','vc','impact','family_office','corporate','government')),
  thesis            TEXT,
  sectors           TEXT[],
  stages            TEXT[],
  countries         TEXT[],
  sdgs              INTEGER[],
  ticket_min        BIGINT,
  ticket_max        BIGINT,
  instruments       TEXT[],
  portfolio_count   INTEGER DEFAULT 0,
  total_deployed    BIGINT DEFAULT 0,
  is_verified       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_investors_user ON investors(user_id);

-- ─── MENTORS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expertise       TEXT[],
  industries      TEXT[],
  countries       TEXT[],
  languages       TEXT[],
  hourly_rate     INTEGER DEFAULT 0,
  session_types   TEXT[],
  max_mentees     INTEGER DEFAULT 5,
  active_mentees  INTEGER DEFAULT 0,
  total_sessions  INTEGER DEFAULT 0,
  avg_rating      DECIMAL(3,2),
  rating_count    INTEGER DEFAULT 0,
  bio_extended    TEXT,
  is_available    BOOLEAN DEFAULT TRUE,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MATCHES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id    UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  target_id     UUID NOT NULL,
  target_type   TEXT NOT NULL CHECK (target_type IN ('investor','mentor')),
  ai_score      INTEGER NOT NULL,
  ai_grade      TEXT,
  ai_reasons    TEXT[],
  ai_breakdown  JSONB DEFAULT '{}',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','viewed','contacted','meeting_scheduled','invested','declined','saved')),
  initiated_by  UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(startup_id, target_id, target_type)
);
CREATE INDEX IF NOT EXISTS idx_matches_startup ON matches(startup_id);
CREATE INDEX IF NOT EXISTS idx_matches_target  ON matches(target_id);
CREATE INDEX IF NOT EXISTS idx_matches_score   ON matches(ai_score DESC);

-- ─── GRANT APPLICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS grant_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id      UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  grant_name      TEXT NOT NULL,
  grant_org       TEXT NOT NULL,
  grant_amount    BIGINT,
  deadline        DATE,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','shortlisted','awarded','rejected')),
  project_title   TEXT,
  problem_stmt    TEXT,
  solution        TEXT,
  funding_plan    TEXT,
  impact_metrics  JSONB DEFAULT '{}',
  documents       TEXT[],
  ai_score        INTEGER,
  ai_tips         TEXT[],
  submitted_at    TIMESTAMPTZ,
  awarded_at      TIMESTAMPTZ,
  awarded_amount  BIGINT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_grant_apps_startup ON grant_applications(startup_id);
CREATE INDEX IF NOT EXISTS idx_grant_apps_status  ON grant_applications(status);

-- ─── MENTOR SESSIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id     UUID NOT NULL REFERENCES mentors(id) ON DELETE CASCADE,
  mentee_id     UUID NOT NULL REFERENCES users(id),
  startup_id    UUID REFERENCES startups(id),
  title         TEXT NOT NULL,
  agenda        TEXT,
  session_type  TEXT CHECK (session_type IN ('one_on_one','group','live_stream','workshop')),
  format        TEXT CHECK (format IN ('video','phone','in_person')),
  meeting_url   TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration_min  INTEGER DEFAULT 60,
  status        TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','completed','cancelled','rescheduled')),
  notes         TEXT,
  recording_url TEXT,
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  review        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor    ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentee    ON mentor_sessions(mentee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON mentor_sessions(scheduled_at);

-- ─── MESSAGES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id    UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  thread_id    UUID NOT NULL,
  content      TEXT NOT NULL,
  attachments  TEXT[],
  is_read      BOOLEAN DEFAULT FALSE,
  is_ai_draft  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_thread    ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread    ON messages(recipient_id, is_read) WHERE NOT is_read;

-- ─── COURSES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID REFERENCES users(id),
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE,
  description   TEXT,
  sector_tags   TEXT[],
  level         TEXT CHECK (level IN ('beginner','intermediate','advanced')),
  duration_min  INTEGER,
  price_usd     INTEGER DEFAULT 0,
  is_free       BOOLEAN DEFAULT TRUE,
  language      TEXT DEFAULT 'en',
  thumbnail_url TEXT,
  is_published  BOOLEAN DEFAULT FALSE,
  enrollment_count INTEGER DEFAULT 0,
  avg_rating    DECIMAL(3,2),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COURSE ENROLLMENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress    INTEGER DEFAULT 0,
  completed   BOOLEAN DEFAULT FALSE,
  xp_earned   INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, course_id)
);

-- ─── COMPLIANCE ITEMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id   UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  country      TEXT NOT NULL,
  area         TEXT NOT NULL,
  authority    TEXT,
  status       TEXT DEFAULT 'required' CHECK (status IN ('done','in_progress','required','not_applicable')),
  deadline     DATE,
  reference    TEXT,
  notes        TEXT,
  documents    TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  data       JSONB DEFAULT '{}',
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- ─── AUDIT LOG ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id),
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  UUID,
  metadata   JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user   ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
`;

/* ============================================================
   HELPERS
   ============================================================ */

const generateToken = (userId, role, expiresIn = '7d') =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn });

const hashPassword = (pwd) => bcrypt.hash(pwd, 12);
const verifyPassword = (pwd, hash) => bcrypt.compare(pwd, hash);

const generateVerifyCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter.sendMail({
    from: `"HopeFusion Africa" <${process.env.SMTP_FROM}>`,
    to, subject, html,
  });
};

const cacheGet = async (key) => {
  try { return JSON.parse(await redis.get(key)); } catch { return null; }
};
const cacheSet = async (key, val, ttlSeconds = 300) => {
  try { await redis.setEx(key, ttlSeconds, JSON.stringify(val)); } catch {}
};
const cacheDel = async (key) => { try { await redis.del(key); } catch {} };

/* ============================================================
   AUTH MIDDLEWARE
   ============================================================ */

const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    const token = auth.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Check token not blacklisted (logout)
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) return res.status(401).json({ error: 'Token revoked' });

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: `Access denied. Requires: ${roles.join(' or ')}` });
  }
  next();
};

const rateLimit = (maxReqs, windowSec) => async (req, res, next) => {
  const key = `ratelimit:${req.ip}:${req.path}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSec);
  if (current > maxReqs) {
    return res.status(429).json({ error: 'Too many requests. Slow down.' });
  }
  next();
};

/* ============================================================
   AUTH ROUTES
   ============================================================ */

// POST /api/auth/register
app.post('/api/auth/register', rateLimit(5, 60), async (req, res) => {
  const client = await db.connect();
  try {
    const { email, password, role, first_name, last_name, phone, country } = req.body;

    if (!email || !password || !role || !first_name || !last_name) {
      return res.status(400).json({ error: 'email, password, role, first_name and last_name are required' });
    }
    if (!['startup', 'investor', 'mentor'].includes(role)) {
      return res.status(400).json({ error: 'role must be startup, investor or mentor' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await hashPassword(password);
    const code = generateVerifyCode();

    await client.query('BEGIN');

    const { rows: [user] } = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, role, first_name, last_name`,
      [email.toLowerCase(), hash, role, first_name, last_name, phone, country]
    );

    // Create role-specific profile
    if (role === 'startup') {
      await client.query(
        'INSERT INTO startups (founder_id, name, sector, country) VALUES ($1, $2, $3, $4)',
        [user.id, `${first_name}'s Startup`, 'general', country || 'Ghana']
      );
    } else if (role === 'investor') {
      await client.query('INSERT INTO investors (user_id) VALUES ($1)', [user.id]);
    } else if (role === 'mentor') {
      await client.query('INSERT INTO mentors (user_id) VALUES ($1)', [user.id]);
    }

    await client.query('COMMIT');

    // Store verify code in Redis (10 min)
    await cacheSet(`verify:${user.id}`, code, 600);

    // Send verification email
    try {
      await sendEmail(email, 'Verify your HopeFusion Africa account', `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#2DB562">Welcome to HopeFusion Africa!</h2>
          <p>Hi ${first_name}, your verification code is:</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1A1A1A;margin:24px 0">${code}</div>
          <p style="color:#666">This code expires in 10 minutes.</p>
          <p style="color:#666;font-size:12px">Empower. Innovate. Thrive.</p>
        </div>
      `);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    const token = generateToken(user.id, user.role);
    res.status(201).json({
      success: true,
      message: 'Account created. Check your email for verification code.',
      token,
      user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
app.post('/api/auth/login', rateLimit(10, 60), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    const { rows } = await db.query(
      'SELECT id, email, password_hash, role, first_name, last_name, is_verified, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });

    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user.id, user.role);
    const refreshToken = generateToken(user.id, user.role, '30d');
    await cacheSet(`refresh:${user.id}`, refreshToken, 30 * 24 * 3600);

    // Log login
    await db.query(
      'INSERT INTO audit_log (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [user.id, 'login', req.ip]
    );

    res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        is_verified: user.is_verified,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/verify
app.post('/api/auth/verify', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const stored = await cacheGet(`verify:${req.user.userId}`);
    if (!stored || stored !== code) return res.status(400).json({ error: 'Invalid or expired verification code' });
    await db.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [req.user.userId]);
    await cacheDel(`verify:${req.user.userId}`);
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const stored = await cacheGet(`refresh:${payload.userId}`);
    if (stored !== refreshToken) return res.status(401).json({ error: 'Invalid refresh token' });
    const token = generateToken(payload.userId, payload.role);
    res.json({ success: true, token });
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization.slice(7);
    await redis.setEx(`blacklist:${token}`, 7 * 24 * 3600, '1');
    await cacheDel(`refresh:${req.user.userId}`);
    await db.query('INSERT INTO audit_log (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [req.user.userId, 'logout', req.ip]);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', rateLimit(3, 300), async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await db.query('SELECT id, first_name FROM users WHERE email = $1', [email?.toLowerCase()]);
    if (!rows.length) return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    const code = generateVerifyCode();
    await cacheSet(`reset:${rows[0].id}`, code, 1800);
    await sendEmail(email, 'Reset your HopeFusion Africa password', `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2DB562">Password reset</h2>
        <p>Hi ${rows[0].first_name}, your reset code is:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1A1A1A;margin:24px 0">${code}</div>
        <p style="color:#666">This code expires in 30 minutes.</p>
      </div>
    `);
    res.json({ success: true, message: 'Reset code sent if email exists.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', rateLimit(5, 300), async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'email, code and newPassword required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return res.status(400).json({ error: 'Invalid request' });
    const stored = await cacheGet(`reset:${rows[0].id}`);
    if (!stored || stored !== code) return res.status(400).json({ error: 'Invalid or expired reset code' });
    const hash = await hashPassword(newPassword);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rows[0].id]);
    await cacheDel(`reset:${rows[0].id}`);
    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   USER ROUTES
   ============================================================ */

// GET /api/users/me
app.get('/api/users/me', authenticate, async (req, res) => {
  try {
    const cached = await cacheGet(`user:${req.user.userId}`);
    if (cached) return res.json({ success: true, data: cached });

    const { rows } = await db.query(
      `SELECT u.*, 
        CASE WHEN u.role='startup' THEN (SELECT row_to_json(s) FROM startups s WHERE s.founder_id=u.id LIMIT 1) END as startup_profile,
        CASE WHEN u.role='investor' THEN (SELECT row_to_json(i) FROM investors i WHERE i.user_id=u.id LIMIT 1) END as investor_profile,
        CASE WHEN u.role='mentor' THEN (SELECT row_to_json(m) FROM mentors m WHERE m.user_id=u.id LIMIT 1) END as mentor_profile
       FROM users u WHERE u.id = $1`,
      [req.user.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    delete user.password_hash;
    await cacheSet(`user:${req.user.userId}`, user, 300);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/me
app.patch('/api/users/me', authenticate, async (req, res) => {
  try {
    const allowed = ['first_name','last_name','phone','country','bio','linkedin_url','twitter_url','website_url'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });
    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await db.query(`UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1`, [req.user.userId, ...Object.values(updates)]);
    await cacheDel(`user:${req.user.userId}`);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   STARTUP ROUTES
   ============================================================ */

// GET /api/startups — list with filters
app.get('/api/startups', authenticate, async (req, res) => {
  try {
    const { sector, country, stage, page = 1, limit = 20, q } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['s.status = $1'];
    const params = ['active'];
    let pi = 2;
    if (sector) { conditions.push(`s.sector = $${pi++}`); params.push(sector); }
    if (country) { conditions.push(`s.country = $${pi++}`); params.push(country); }
    if (stage) { conditions.push(`s.stage = $${pi++}`); params.push(stage); }
    if (q) { conditions.push(`s.name ILIKE $${pi++}`); params.push(`%${q}%`); }
    const where = conditions.join(' AND ');
    const { rows } = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.avatar_url as founder_avatar
       FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE ${where} ORDER BY s.created_at DESC LIMIT $${pi++} OFFSET $${pi}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    const { rows: [{ count }] } = await db.query(`SELECT COUNT(*) FROM startups s WHERE ${where}`, params.slice(0, -0));
    res.json({ success: true, data: rows, total: parseInt(count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/startups/:id
app.get('/api/startups/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email as founder_email, u.avatar_url as founder_avatar,
        (SELECT json_agg(t) FROM startup_team t WHERE t.startup_id = s.id) as team
       FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Startup not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/startups — create/update startup profile
app.post('/api/startups', authenticate, authorize('startup'), async (req, res) => {
  try {
    const fields = ['name','tagline','description','sector','country','city','stage',
      'founded_year','team_size','website_url','funding_goal','funding_type','sdgs',
      'is_women_led','annual_revenue','mrr','customers'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => fields.includes(k)));
    if (updates.name) {
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE startups SET ${sets}, updated_at = NOW() WHERE founder_id = $1 RETURNING *`,
      [req.user.userId, ...Object.values(updates)]
    );
    await cacheDel(`user:${req.user.userId}`);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/investors — create/update investor profile
app.post('/api/investors', authenticate, authorize('investor'), async (req, res) => {
  try {
    const fields = ['firm_name', 'investor_type', 'thesis', 'sectors', 'stages', 'countries', 'sdgs', 'ticket_min', 'ticket_max', 'instruments', 'portfolio_count', 'total_deployed'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => fields.includes(k)));
    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE investors SET ${sets}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
      [req.user.userId, ...Object.values(updates)]
    );
    await cacheDel(`user:${req.user.userId}`);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   MATCH ROUTES
   ============================================================ */

// GET /api/matches/my — get my AI matches
app.get('/api/matches/my', authenticate, async (req, res) => {
  try {
    const { status, min_score = 0, limit = 20 } = req.query;
    const cacheKey = `matches:${req.user.userId}:${status}:${min_score}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const startup = await db.query('SELECT id FROM startups WHERE founder_id = $1', [req.user.userId]);
    if (!startup.rows.length) return res.status(404).json({ error: 'Startup profile not found' });

    const conditions = ['m.startup_id = $1', 'm.ai_score >= $2'];
    const params = [startup.rows[0].id, parseInt(min_score)];
    if (status) { conditions.push(`m.status = $3`); params.push(status); }

    const { rows } = await db.query(
      `SELECT m.*, 
        CASE WHEN m.target_type='investor' THEN (
          SELECT json_build_object('firm',i.firm_name,'type',i.investor_type,'sectors',i.sectors,
            'first_name',u.first_name,'last_name',u.last_name,'avatar',u.avatar_url)
          FROM investors i JOIN users u ON u.id=i.user_id WHERE i.id=m.target_id
        ) END as investor_detail
       FROM matches m WHERE ${conditions.join(' AND ')}
       ORDER BY m.ai_score DESC LIMIT $${params.length + 1}`,
      [...params, parseInt(limit)]
    );
    await cacheSet(cacheKey, rows, 120);
    res.json({ success: true, data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/matches/:id/status
app.patch('/api/matches/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['viewed','contacted','meeting_scheduled','invested','declined','saved'];
    if (!valid.includes(status)) return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    await db.query('UPDATE matches SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
    res.json({ success: true, message: 'Match status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   GRANT APPLICATION ROUTES
   ============================================================ */

// POST /api/grants/apply
app.post('/api/grants/apply', authenticate, authorize('startup'), async (req, res) => {
  try {
    const { grant_name, grant_org, grant_amount, deadline, project_title, problem_stmt, solution, funding_plan } = req.body;
    const startup = await db.query('SELECT id FROM startups WHERE founder_id = $1', [req.user.userId]);
    if (!startup.rows.length) return res.status(404).json({ error: 'Startup not found' });
    const { rows } = await db.query(
      `INSERT INTO grant_applications (startup_id, grant_name, grant_org, grant_amount, deadline,
        project_title, problem_stmt, solution, funding_plan, status, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'submitted',NOW()) RETURNING *`,
      [startup.rows[0].id, grant_name, grant_org, grant_amount, deadline,
       project_title, problem_stmt, solution, funding_plan]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/grants/my
app.get('/api/grants/my', authenticate, authorize('startup'), async (req, res) => {
  try {
    const startup = await db.query('SELECT id FROM startups WHERE founder_id = $1', [req.user.userId]);
    if (!startup.rows.length) return res.status(404).json({ error: 'Startup not found' });
    const { rows } = await db.query(
      'SELECT * FROM grant_applications WHERE startup_id = $1 ORDER BY created_at DESC',
      [startup.rows[0].id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   MENTOR SESSION ROUTES
   ============================================================ */

// GET /api/mentors — list mentors
app.get('/api/mentors', authenticate, async (req, res) => {
  try {
    const { expertise, country, available, limit = 20 } = req.query;
    const { rows } = await db.query(
      `SELECT m.*, u.first_name, u.last_name, u.avatar_url, u.bio
       FROM mentors m JOIN users u ON u.id = m.user_id
       WHERE m.is_available = TRUE AND u.is_active = TRUE
       ORDER BY m.avg_rating DESC NULLS LAST, m.total_sessions DESC LIMIT $1`,
      [parseInt(limit)]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions — book a session
app.post('/api/sessions', authenticate, async (req, res) => {
  try {
    const { mentor_id, title, agenda, session_type, format, scheduled_at, duration_min } = req.body;
    if (!mentor_id || !title || !scheduled_at) return res.status(400).json({ error: 'mentor_id, title and scheduled_at required' });
    const { rows } = await db.query(
      `INSERT INTO mentor_sessions (mentor_id, mentee_id, title, agenda, session_type, format, scheduled_at, duration_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [mentor_id, req.user.userId, title, agenda, session_type || 'one_on_one', format || 'video', scheduled_at, duration_min || 60]
    );
    // Notify mentor
    const mentorUser = await db.query('SELECT user_id FROM mentors WHERE id = $1', [mentor_id]);
    if (mentorUser.rows.length) {
      const targetUserId = mentorUser.rows[0].user_id;
      const notifTitle = 'New session booked';
      const notifBody = `A session "${title}" has been scheduled.`;
      
      await db.query(
        'INSERT INTO notifications (user_id, type, title, body) VALUES ($1,$2,$3,$4)',
        [targetUserId, 'session_booked', notifTitle, notifBody]
      );

      // Emit active socket notification
      io.to(`user:${targetUserId}`).emit('notification:new', {
        type: 'session_reminder',
        title: notifTitle,
        body: notifBody,
        created_at: new Date()
      });
    }
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   NOTIFICATION ROUTES
   ============================================================ */

app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.userId]
    );
    const { rows: [{ count }] } = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND NOT is_read',
      [req.user.userId]
    );
    res.json({ success: true, data: rows, unread: parseInt(count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/read-all', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.userId]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   MESSAGING ROUTES
   ============================================================ */

app.post('/api/messages', authenticate, async (req, res) => {
  try {
    const { recipient_id, content, thread_id } = req.body;
    if (!recipient_id || !content) return res.status(400).json({ error: 'recipient_id and content required' });
    const tId = thread_id || [req.user.userId, recipient_id].sort().join(':');
    const { rows } = await db.query(
      'INSERT INTO messages (sender_id, recipient_id, thread_id, content) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.userId, recipient_id, tId, content]
    );
    const msg = rows[0];
    // Emit real-time message via socket.io if users are connected
    io.to(`user:${recipient_id}`).emit('message:received', msg);
    io.to(`user:${req.user.userId}`).emit('message:received', msg);

    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/threads', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT ON (thread_id) m.*,
        u.first_name, u.last_name, u.avatar_url,
        COUNT(*) FILTER (WHERE NOT m.is_read AND m.recipient_id = $1) OVER (PARTITION BY m.thread_id) as unread
       FROM messages m
       JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
       WHERE m.sender_id = $1 OR m.recipient_id = $1
       ORDER BY m.thread_id, m.created_at DESC`,
      [req.user.userId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   ANALYTICS ROUTES (admin only)
   ============================================================ */

app.get('/api/admin/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const cached = await cacheGet('admin:analytics');
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const [users, startups, matches, grants, sessions] = await Promise.all([
      db.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE role='startup') as startups,
                COUNT(*) FILTER (WHERE role='investor') as investors,
                COUNT(*) FILTER (WHERE role='mentor') as mentors,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d FROM users`),
      db.query(`SELECT COUNT(*) as total, SUM(funding_goal) as total_funding_sought,
                SUM(funding_raised) as total_funded FROM startups WHERE status='active'`),
      db.query(`SELECT COUNT(*) as total, AVG(ai_score) as avg_score,
                COUNT(*) FILTER (WHERE status='invested') as converted FROM matches`),
      db.query(`SELECT COUNT(*) as total, SUM(awarded_amount) as total_awarded,
                COUNT(*) FILTER (WHERE status='awarded') as awarded FROM grant_applications`),
      db.query('SELECT COUNT(*) as total FROM mentor_sessions WHERE status = $1', ['completed']),
    ]);

    const analytics = {
      users: users.rows[0],
      startups: startups.rows[0],
      matches: matches.rows[0],
      grants: grants.rows[0],
      sessions: sessions.rows[0],
      generated_at: new Date().toISOString(),
    };
    await cacheSet('admin:analytics', analytics, 60);
    res.json({ success: true, data: analytics });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   HEALTH + ERROR HANDLING
   ============================================================ */

app.get('/api/health', async (req, res) => {
  const dbOk = await db.query('SELECT 1').then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(r => r === 'PONG').catch(() => false);
  res.json({
    status: dbOk && redisOk ? 'ok' : 'degraded',
    services: { database: dbOk ? 'ok' : 'error', cache: redisOk ? 'ok' : 'error' },
    timestamp: new Date().toISOString(),
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`HopeFusion Backend running on port ${PORT}`));

export { app, httpServer, db, redis, authenticate, authorize };
