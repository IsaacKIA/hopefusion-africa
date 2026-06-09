import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import passport from 'passport';
import { db, redis, cacheGet, cacheSet, cacheDel } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limiter.js';
import { validate } from '../middleware/validation.js';
import {
  registerSchema,
  loginSchema,
  verifySchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../schemas/auth.schema.js';

const router = express.Router();

/* ============================================================
   HELPERS
   ============================================================ */

const generateToken = (userId, role, expiresIn = '7d') =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn });

const hashPassword = (pwd) => bcrypt.hash(pwd, 12);
const verifyPassword = (pwd, hash) => bcrypt.compare(pwd, hash);

const generateVerifyCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const normalizePhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '+233' + cleaned.slice(1);
  }
  return '+233' + cleaned;
};

const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
  return transporter.sendMail({
    from: `"HopeFusion Africa" <${process.env.SMTP_FROM}>`,
    to, subject, html,
  });
};

/* ============================================================
   ROUTES
   ============================================================ */

// POST /register
router.post('/register', rateLimit(5, 60), validate(registerSchema), async (req, res) => {
  console.log('DEBUG [auth.js] NODE_ENV:', process.env.NODE_ENV);
  console.log('DEBUG [auth.js] db object:', db);
  console.log('DEBUG [auth.js] db.connect function:', db?.connect);
  const client = await db.connect();
  try {
    const {
      email, password, role, first_name, last_name, phone, country, linkedin_url,
      // Startup role specific fields
      startup_name, sector, stage, startup_country, team_size, funding_goal, funding_type, sdgs, is_women_led, startup_tagline, startup_website,
      // Investor role specific fields
      investor_type, firm_name, ticket_min, ticket_max, sectors, stages, countries, instruments, firm_website,
      // Mentor role specific fields
      expertise, session_types, languages, experience_years, max_mentees, hourly_rate, current_role, mentor_bio
    } = req.body;

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await hashPassword(password);
    const code = generateVerifyCode();
    const normalizedPhone = normalizePhoneNumber(phone);
    const website_url = role === 'startup' ? startup_website : (role === 'investor' ? firm_website : null);

    await client.query('BEGIN');

    const { rows: [user] } = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, country, linkedin_url, website_url, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, email, role, first_name, last_name`,
      [email, hash, role, first_name, last_name, normalizedPhone, country, linkedin_url || null, website_url || null, role === 'mentor' ? mentor_bio || null : null]
    );

    // Create role-specific profile
    if (role === 'startup') {
      await client.query(
        `INSERT INTO startups (founder_id, name, tagline, sector, stage, country, team_size, funding_goal, funding_type, sdgs, is_women_led, website_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          user.id,
          startup_name || `${first_name}'s Startup`,
          startup_tagline || null,
          sector || 'general',
          stage || 'mvp',
          startup_country || country || 'Ghana',
          team_size !== undefined ? team_size : 1,
          funding_goal !== undefined ? funding_goal : null,
          funding_type ? (Array.isArray(funding_type) ? funding_type : [funding_type]) : null,
          sdgs || null,
          is_women_led || false,
          startup_website || null
        ]
      );
    } else if (role === 'investor') {
      await client.query(
        `INSERT INTO investors (user_id, firm_name, investor_type, sectors, stages, countries, instruments, ticket_min, ticket_max)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          user.id,
          firm_name || null,
          investor_type || null,
          sectors || null,
          stages || null,
          countries || null,
          instruments || null,
          ticket_min !== undefined ? ticket_min : null,
          ticket_max !== undefined ? ticket_max : null
        ]
      );
    } else if (role === 'mentor') {
      await client.query(
        `INSERT INTO mentors (user_id, expertise, session_types, languages, experience_years, max_mentees, hourly_rate, "current_role", bio_extended)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          user.id,
          expertise || null,
          session_types || null,
          languages || null,
          experience_years !== undefined ? parseInt(experience_years) : 0,
          max_mentees !== undefined ? max_mentees : 5,
          hourly_rate !== undefined ? hourly_rate : 0,
          current_role || null,
          mentor_bio || null
        ]
      );
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
    return res.status(201).json({
      success: true,
      message: 'Account created. Check your email for verification code.',
      token,
      user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
});

// POST /login
router.post('/login', rateLimit(10, 60), validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const { rows } = await db.query(
      'SELECT id, email, password_hash, role, first_name, last_name, is_verified, is_active FROM users WHERE email = $1',
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user.id, user.role);
    const refreshToken = generateToken(user.id, user.role, '30d');
    await cacheSet(`refresh:${user.id}`, refreshToken, 30 * 24 * 3600);

    // Log login
    await db.query(
      'INSERT INTO audit_log (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [user.id, 'login', req.ip]
    );

    return res.json({
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
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /verify
router.post('/verify', authenticate, validate(verifySchema), async (req, res) => {
  try {
    const { code } = req.body;
    const stored = await cacheGet(`verify:${req.user.userId}`);
    if (!stored || stored !== code) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }
    await db.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [req.user.userId]);
    await cacheDel(`verify:${req.user.userId}`);
    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken required' });
    }
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const stored = await cacheGet(`refresh:${payload.userId}`);
    if (stored !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const token = generateToken(payload.userId, payload.role);
    return res.json({ success: true, token });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization.slice(7);
    await redis.setEx(`blacklist:${token}`, 7 * 24 * 3600, '1');
    await cacheDel(`refresh:${req.user.userId}`);
    await db.query('INSERT INTO audit_log (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [req.user.userId, 'logout', req.ip]);
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /forgot-password
router.post('/forgot-password', rateLimit(3, 300), validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const { rows } = await db.query('SELECT id, first_name FROM users WHERE email = $1', [email]);
    if (!rows.length) {
      return res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
    }
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
    return res.json({ success: true, message: 'Reset code sent if email exists.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /reset-password
router.post('/reset-password', rateLimit(5, 300), validate(resetPasswordSchema), async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    const stored = await cacheGet(`reset:${rows[0].id}`);
    if (!stored || stored !== code) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }
    const hash = await hashPassword(newPassword);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rows[0].id]);
    await cacheDel(`reset:${rows[0].id}`);
    return res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /auth/google
router.get('/google', (req, res, next) => {
  const { role } = req.query;
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: role || 'startup',
    session: false
  })(req, res, next);
});

// GET /auth/google/callback
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/hopefusion-register.html?oauth=failure' }), async (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user.id, user.role);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    res.redirect(`${frontendUrl}/hopefusion-register.html?oauth=success&token=${token}&role=${user.role}`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5500'}/hopefusion-register.html?oauth=failure`);
  }
});

// POST /auth/resend
router.post('/resend', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { rows } = await db.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { email, first_name } = rows[0];
    const code = generateVerifyCode();
    
    await cacheSet(`verify:${userId}`, code, 600);
    
    try {
      await sendEmail(email, 'Verify your HopeFusion Africa account', `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#2DB562">Verify your HopeFusion Africa account</h2>
          <p>Hi ${first_name}, your new verification code is:</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1A1A1A;margin:24px 0">${code}</div>
          <p style="color:#666">This code expires in 10 minutes.</p>
          <p style="color:#666;font-size:12px">Empower. Innovate. Thrive.</p>
        </div>
      `);
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }
    
    return res.json({ success: true, message: 'Verification code resent successfully' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

export default router;
