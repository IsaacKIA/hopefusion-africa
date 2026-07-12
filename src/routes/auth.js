import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import crypto from 'crypto';
import { db, redis, cacheGet, cacheSet, cacheDel } from '../config/db.js';
import { logger, writeAuditLog } from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limiter.js';
import { validate } from '../middleware/validation.js';

const hashOTP = (otp) => crypto.createHash('sha256').update(otp + (process.env.JWT_SECRET || '')).digest('hex');
import { sendEmail, buildOTPEmail } from '../services/email.js';
import {
  registerSchema,
  loginSchema,
  verifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  onboardingSchema
} from '../schemas/auth.schema.js';

const router = express.Router();

/* ============================================================
   HELPERS
   ============================================================ */

const generateToken = (userId, role, expiresIn = '7d') =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn });

const hashPassword = (pwd) => bcrypt.hash(pwd, 10);
const verifyPassword = (pwd, hash) => bcrypt.compare(pwd, hash);

const generateVerifyCode = () => crypto.randomInt(100000, 1000000).toString();

const normalizePhoneNumber = (phone, country) => {
  if (!phone) return null;
  let cleaned = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  const countryCodes = {
    'Ghana': '+233', 'Nigeria': '+234', 'Kenya': '+254',
    'South Africa': '+27', 'Tanzania': '+255', 'Uganda': '+256', 'Ethiopia': '+251',
    'GH': '+233', 'NG': '+234', 'KE': '+254', 'ZA': '+27', 'TZ': '+255', 'UG': '+256', 'ET': '+251'
  };
  
  const prefix = countryCodes[country] || '+233';
  if (cleaned.startsWith('0')) {
    return prefix + cleaned.slice(1);
  }
  return prefix + cleaned;
};

/* ============================================================
   ROUTES
   ============================================================ */

// POST /register
// POST /register
router.post('/register', rateLimit(5, 60), validate(registerSchema), async (req, res) => {
  const correlationId = crypto.randomUUID();
  let client;
  
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

    logger.info('registration_started', { email, role }, correlationId);

    client = await db.connect();
    
    // Check if user already exists
    const existing = await client.query('SELECT id, is_verified FROM users WHERE email = $1', [email.toLowerCase()]);
    let userId = null;
    let isOverwrite = false;

    if (existing.rows.length) {
      const existingUser = existing.rows[0];
      if (existingUser.is_verified) {
        logger.warn('registration_failed_email_taken', { email }, correlationId);
        return res.status(409).json({ error: 'Email already registered' });
      }
      userId = existingUser.id;
      isOverwrite = true;
      logger.info('registration_unverified_overwrite', { email, userId }, correlationId);
    }

    const hash = await hashPassword(password);
    const code = generateVerifyCode();
    const normalizedPhone = normalizePhoneNumber(phone, country);

    // Map government and corporate roles to investor
    let dbRole = role;
    let mappedInvestorType = null;
    if (role === 'government' || role === 'corporate') {
      dbRole = 'investor';
      mappedInvestorType = role;
    }

    const website_url = dbRole === 'startup' ? startup_website : (dbRole === 'investor' ? firm_website : null);

    await client.query('BEGIN');

    let user;
    if (isOverwrite) {
      // Clean up old role profiles
      await client.query('DELETE FROM startups WHERE founder_id = $1', [userId]);
      await client.query('DELETE FROM investors WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM mentors WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM startup_passports WHERE user_id = $1', [userId]);

      const { rows: [updatedUser] } = await client.query(
        `UPDATE users
         SET password_hash = $2, role = $3, roles = ARRAY[$3]::TEXT[], first_name = $4, last_name = $5, phone = $6, country = $7, website_url = $8, updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, role, first_name, last_name`,
        [userId, hash, dbRole, first_name, last_name, normalizedPhone, country || null, website_url || null]
      );
      user = updatedUser;
    } else {
      const { rows: [newUser] } = await client.query(
        `INSERT INTO users (email, password_hash, role, roles, first_name, last_name, phone, country, linkedin_url, website_url, bio)
         VALUES ($1, $2, $3, ARRAY[$3]::TEXT[], $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, email, role, first_name, last_name`,
        [email.toLowerCase(), hash, dbRole, first_name, last_name, normalizedPhone, country || null, linkedin_url || null, website_url || null, dbRole === 'mentor' ? mentor_bio || null : null]
      );
      user = newUser;
    }

    // Create role-specific profile (create base profiles so updating works later during onboarding)
    if (dbRole === 'startup') {
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
    } else if (dbRole === 'investor') {
      await client.query(
        `INSERT INTO investors (user_id, firm_name, investor_type, sectors, stages, countries, instruments, ticket_min, ticket_max)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          user.id,
          firm_name || null,
          mappedInvestorType || investor_type || 'angel',
          sectors || null,
          stages || null,
          countries || null,
          instruments || null,
          ticket_min !== undefined ? ticket_min : null,
          ticket_max !== undefined ? ticket_max : null
        ]
      );
    } else if (dbRole === 'mentor') {
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
    logger.info('registration_db_transaction_committed', { userId: user.id }, correlationId);

    // Save verification OTP hash in PostgreSQL verification_codes table (ON CONFLICT DO UPDATE)
    const codeHash = hashOTP(code);
    await db.query(
      `INSERT INTO verification_codes (user_id, code_hash, attempts, max_attempts, expires_at, last_sent_at)
       VALUES ($1, $2, 0, 5, NOW() + INTERVAL '10 minutes', NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         code_hash = EXCLUDED.code_hash,
         attempts = 0,
         expires_at = EXCLUDED.expires_at,
         last_sent_at = NOW(),
         created_at = NOW()`,
      [user.id, codeHash]
    );

    // Store verify code in Redis (10 min) for legacy cache compatibility
    await cacheSet(`verify:${user.id}`, code, 600);
    logger.info('registration_otp_stored', { userId: user.id }, correlationId);

    // Send verification email
    try {
      await sendEmail(
        email,
        'Your HopeFusion Africa verification code',
        buildOTPEmail(first_name, code, 'verify'),
        correlationId
      );
    } catch (emailErr) {
      logger.error('registration_email_delivery_failed', { userId: user.id, error: emailErr.message }, correlationId);
    }

    const isDev = process.env.NODE_ENV !== 'production';

    const token = generateToken(user.id, user.role);
    const refreshToken = generateToken(user.id, user.role, '30d');
    await cacheSet(`refresh:${user.id}`, refreshToken, 30 * 24 * 3600);

    res.cookie('hfa_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('hfa_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    await writeAuditLog(user.id, 'registration_completed', { email: user.email, role: user.role }, req.ip);
    logger.info('registration_completed_successfully', { userId: user.id }, correlationId);

    return res.status(201).json({
      success: true,
      message: 'Account created! Check your email for a verification code.',
      token,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
      // Always expose OTP in dev so developers can test without a live email domain
      ...(isDev && { debug_otp: code, debug_note: 'Verify your domain at resend.com/domains to enable real email delivery' }),
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    logger.error('registration_failed', { error: err.message, stack: err.stack }, correlationId);
    if (err.code === '23505') { // Handle unique constraint race condition explicitly
      return res.status(409).json({ error: 'Email already registered' });
    }
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.message?.includes('connect')) {
      return res.status(503).json({ error: 'Database unavailable. Please try again shortly.' });
    }
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    if (client) client.release();
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

    res.cookie('hfa_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('hfa_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

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
router.post('/verify', rateLimit(5, 60), authenticate, validate(verifySchema), async (req, res) => {
  const correlationId = crypto.randomUUID();
  const userId = req.user.userId;
  const { code } = req.body;
  
  logger.info('verification_attempt_started', { userId }, correlationId);

  try {
    // Check if user is locked out due to brute-force protection
    const isBlocked = await redis.get(`verify:blocked:${userId}`);
    if (isBlocked) {
      logger.warn('verification_failed_blocked', { userId }, correlationId);
      return res.status(429).json({ error: 'Too many failed verification attempts. Please try again in 15 minutes.' });
    }

    // Query verification code from PostgreSQL
    const { rows } = await db.query(
      'SELECT code_hash, attempts, max_attempts, expires_at FROM verification_codes WHERE user_id = $1',
      [userId]
    );

    if (!rows.length) {
      logger.warn('verification_failed_no_code', { userId }, correlationId);
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const { code_hash, attempts, max_attempts, expires_at } = rows[0];

    // Check if expired
    if (new Date() > new Date(expires_at)) {
      logger.warn('verification_failed_expired', { userId }, correlationId);
      // Delete expired code
      await db.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
      await cacheDel(`verify:${userId}`);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Verify code hash
    const hashedInput = hashOTP(code);
    if (code_hash !== hashedInput) {
      const newAttempts = attempts + 1;
      
      if (newAttempts >= max_attempts) {
        // Brute force threshold reached: delete code and block user for 15 minutes
        await db.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
        await cacheDel(`verify:${userId}`);
        
        // Set block key in Redis for 15 minutes (900 seconds)
        await redis.setEx(`verify:blocked:${userId}`, 900, '1');
        
        await writeAuditLog(userId, 'verification_blocked', { reason: 'max_attempts_exceeded', attempts: newAttempts }, req.ip);
        logger.error('verification_user_blocked', { userId, attempts: newAttempts }, correlationId);
        
        return res.status(429).json({ error: 'Too many failed attempts. This verification code has been invalidated. Please try again in 15 minutes.' });
      }

      // Update attempt counter
      await db.query('UPDATE verification_codes SET attempts = $1 WHERE user_id = $2', [newAttempts, userId]);
      
      await writeAuditLog(userId, 'verification_failed_attempt', { attempts: newAttempts }, req.ip);
      logger.warn('verification_failed_wrong_code', { userId, attempts: newAttempts }, correlationId);
      
      return res.status(400).json({ error: `Invalid verification code. ${max_attempts - newAttempts} attempts remaining.` });
    }

    // Verification success!
    await db.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [userId]);
    
    // Automatically create Startup Passport post-verification
    await db.query(
      `INSERT INTO startup_passports (user_id, profile_completion, verification_status, hope_score, funding_readiness, opportunity_readiness)
       VALUES ($1, 10, 'Verified', 300, 'Low', 'Low')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Clean up verification code records
    await db.query('DELETE FROM verification_codes WHERE user_id = $1', [userId]);
    await cacheDel(`verify:${userId}`);
    await cacheDel(`user:${userId}`);
    await redis.del(`user:verified:${userId}`);
    
    await writeAuditLog(userId, 'verification_success', {}, req.ip);
    logger.info('verification_completed_successfully', { userId }, correlationId);

    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    logger.error('verification_error', { userId, error: err.message }, correlationId);
    return res.status(500).json({ error: err.message });
  }
});

// POST /refresh
router.post('/refresh', async (req, res) => {
  try {
    let refreshToken = req.body.refreshToken;
    if (!refreshToken && req.headers.cookie) {
      const cookies = Object.fromEntries(req.headers.cookie.split(';').map(c => c.trim().split('=')));
      refreshToken = cookies.hfa_refresh_token;
    }
    if (!refreshToken) {
      return res.status(400).json({ error: 'refreshToken required' });
    }
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const stored = await cacheGet(`refresh:${payload.userId}`);
    if (stored !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    const token = generateToken(payload.userId, payload.role);
    res.cookie('hfa_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.json({ success: true, token });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    let token = '';
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      token = auth.slice(7);
    } else if (req.headers.cookie) {
      const cookies = Object.fromEntries(req.headers.cookie.split(';').map(c => c.trim().split('=')));
      token = cookies.hfa_token;
    }

    if (token) {
      await redis.setEx(`blacklist:${token}`, 7 * 24 * 3600, '1');
    }
    await cacheDel(`refresh:${req.user.userId}`);
    await db.query('INSERT INTO audit_log (user_id, action, ip_address) VALUES ($1, $2, $3)',
      [req.user.userId, 'logout', req.ip]);
    res.clearCookie('hfa_token');
    res.clearCookie('hfa_refresh_token');
    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /forgot-password
router.post('/forgot-password', rateLimit(3, 300), validate(forgotPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedPhone = email.includes('@') ? null : normalizePhoneNumber(email);
    const { rows } = await db.query(
      'SELECT id, first_name, email FROM users WHERE email = $1 OR (phone IS NOT NULL AND phone = $2)',
      [email.toLowerCase(), normalizedPhone]
    );
    if (!rows.length) {
      return res.json({ success: true, message: 'If that email exists, a reset code was sent.' });
    }

    // Email rate-limiting (max 3 checks per 30 minutes in Redis)
    const emailKey = `rate:forgot:${rows[0].id}`;
    const emailCount = await redis.incr(emailKey);
    if (emailCount === 1) {
      await redis.expire(emailKey, 1800);
    }
    if (emailCount > 3) {
      return res.json({ success: true, message: 'If that email exists, a reset code was sent.' });
    }

    const code = generateVerifyCode();
    await cacheSet(`reset:${rows[0].id}`, code, 1800);

    // Send password reset email
    try {
      await sendEmail(
        rows[0].email,
        'Your HopeFusion Africa password reset code',
        buildOTPEmail(rows[0].first_name, code, 'reset')
      );
    } catch (err) {
      console.error('[Auth] Password reset email error:', err.message);
    }

    const isDev = process.env.NODE_ENV !== 'production';

    return res.json({
      success: true,
      message: 'If that email exists, a password reset code has been sent.',
      ...(isDev && { debug_otp: code })
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /reset-password
router.post('/reset-password', rateLimit(5, 300), validate(resetPasswordSchema), async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const normalizedPhone = email.includes('@') ? null : normalizePhoneNumber(email);
    const { rows } = await db.query(
      'SELECT id FROM users WHERE email = $1 OR (phone IS NOT NULL AND phone = $2)',
      [email.toLowerCase(), normalizedPhone]
    );
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
    
    // Revoke all existing tokens by setting revocation timestamp in Redis (expires in 7 days)
    await redis.setEx(`revoked_before:${rows[0].id}`, 7 * 24 * 3600, Math.floor(Date.now() / 1000).toString());
    
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

// POST /auth/resend and /auth/resend-verify
router.post(['/resend', '/resend-verify'], authenticate, async (req, res) => {
  const correlationId = crypto.randomUUID();
  const userId = req.user.userId;
  
  logger.info('resend_started', { userId }, correlationId);

  try {
    // Check if blocked by brute-force protection
    const isBlocked = await redis.get(`verify:blocked:${userId}`);
    if (isBlocked) {
      logger.warn('resend_failed_blocked', { userId }, correlationId);
      return res.status(429).json({ error: 'Too many failed verification attempts. Please try again in 15 minutes.' });
    }

    const { rows } = await db.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
    if (!rows.length) {
      logger.warn('resend_failed_user_not_found', { userId }, correlationId);
      return res.status(404).json({ error: 'User not found' });
    }
    const { email, first_name } = rows[0];

    // Check resend limits in DB
    const { rows: codeRows } = await db.query(
      'SELECT last_sent_at, resend_count, resend_window_start FROM verification_codes WHERE user_id = $1',
      [userId]
    );

    let nextResendCount = 1;
    let nextResendWindowStart = new Date();

    if (codeRows.length) {
      const { last_sent_at, resend_count, resend_window_start } = codeRows[0];
      const timeSinceLastSent = Date.now() - new Date(last_sent_at).getTime();
      
      // 60-second cooldown
      if (timeSinceLastSent < 60000) {
        const waitSecs = Math.ceil((60000 - timeSinceLastSent) / 1000);
        logger.warn('resend_failed_cooldown', { userId, waitSecs }, correlationId);
        return res.status(429).json({ error: `Please wait ${waitSecs} seconds before requesting a new code.` });
      }

      // Max 5 resends per hour
      const timeSinceWindowStart = Date.now() - new Date(resend_window_start).getTime();
      if (timeSinceWindowStart < 3600000) {
        if (resend_count >= 5) {
          const minsLeft = Math.ceil((3600000 - timeSinceWindowStart) / 60000);
          logger.warn('resend_failed_hourly_limit', { userId, minsLeft }, correlationId);
          return res.status(429).json({ error: `Maximum resend limit reached. Please try again in ${minsLeft} minutes.` });
        }
        nextResendCount = resend_count + 1;
        nextResendWindowStart = new Date(resend_window_start);
      } else {
        nextResendCount = 1;
        nextResendWindowStart = new Date();
      }
    }

    const code = generateVerifyCode();
    const codeHash = hashOTP(code);

    // Upsert code into database
    await db.query(
      `INSERT INTO verification_codes (user_id, code_hash, attempts, max_attempts, resend_count, resend_window_start, expires_at, last_sent_at)
       VALUES ($1, $2, 0, 5, $3, $4, NOW() + INTERVAL '10 minutes', NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         code_hash = EXCLUDED.code_hash,
         attempts = 0,
         resend_count = EXCLUDED.resend_count,
         resend_window_start = EXCLUDED.resend_window_start,
         expires_at = EXCLUDED.expires_at,
         last_sent_at = EXCLUDED.last_sent_at,
         created_at = NOW()`,
      [userId, codeHash, nextResendCount, nextResendWindowStart]
    );

    // Update Redis cache for compatibility
    await cacheSet(`verify:${userId}`, code, 600);
    logger.info('resend_otp_stored', { userId }, correlationId);

    // Send verification email
    try {
      await sendEmail(
        email,
        'Your HopeFusion Africa verification code',
        buildOTPEmail(first_name, code, 'verify'),
        correlationId
      );
    } catch (err) {
      logger.error('resend_email_delivery_failed', { userId, error: err.message }, correlationId);
    }

    const isDev = process.env.NODE_ENV !== 'production';

    await writeAuditLog(userId, 'resend_completed', { email, resend_count: nextResendCount }, req.ip);
    logger.info('resend_completed_successfully', { userId }, correlationId);

    return res.json({
      success: true,
      message: 'Verification code sent! Check your email.',
      ...(isDev && { debug_otp: code })
    });
  } catch (err) {
    logger.error('resend_failed', { userId, error: err.message }, correlationId);
    return res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

// GET /status — check authentication status, verification status, and progressive onboarding completeness
router.get('/status', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.role, u.roles, u.first_name, u.last_name, u.is_verified, u.onboarding_completed,
              p.profile_completion, p.hope_score, p.verification_status, p.funding_readiness, p.opportunity_readiness,
              (CASE WHEN u.role='startup' THEN (SELECT row_to_json(s) FROM startups s WHERE s.founder_id=u.id LIMIT 1) END) as startup_profile,
              (CASE WHEN u.role='investor' THEN (SELECT row_to_json(i) FROM investors i WHERE i.user_id=u.id LIMIT 1) END) as investor_profile,
              (CASE WHEN u.role='mentor' THEN (SELECT row_to_json(m) FROM mentors m WHERE m.user_id=u.id LIMIT 1) END) as mentor_profile
       FROM users u
       LEFT JOIN startup_passports p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.user.userId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /onboard — progressive onboarding details save
router.post('/onboard', authenticate, validate(onboardingSchema), async (req, res) => {
  let client;
  try {
    client = await db.connect();
    const {
      goals, country, roles,
      // Startup fields
      startup_name, sector, stage, team_size, funding_goal, sdgs, is_women_led, startup_tagline, startup_website,
      // Investor fields
      firm_name, investor_type, ticket_min, ticket_max, sectors, stages, countries, instruments, firm_website,
      // Mentor fields
      expertise, session_types, languages, experience_years, max_mentees, hourly_rate, current_role, mentor_bio
    } = req.body;

    await client.query('BEGIN');

    // Map government/corporate roles to investor
    const mappedRoles = roles.map(r => (r === 'government' || r === 'corporate') ? 'investor' : r);
    const uniqueRoles = [...new Set(mappedRoles)];
    const primaryRole = uniqueRoles[0];

    // Update users core fields
    await client.query(
      `UPDATE users
       SET goals = $1, country = $2, role = $3, roles = $4, onboarding_completed = TRUE, updated_at = NOW()
       WHERE id = $5`,
      [goals, country, primaryRole, uniqueRoles, req.user.userId]
    );

    // Create / update profiles for each role
    for (const r of uniqueRoles) {
      if (r === 'startup') {
        const startupName = startup_name || `${req.user.first_name}'s Startup`;
        const existing = await client.query('SELECT id FROM startups WHERE founder_id = $1', [req.user.userId]);
        if (existing.rows.length) {
          await client.query(
            `UPDATE startups
             SET name = $1, sector = COALESCE($2, sector), stage = COALESCE($3, stage), country = COALESCE($4, country),
                 team_size = COALESCE($5, team_size), funding_goal = COALESCE($6, funding_goal), sdgs = COALESCE($7, sdgs),
                 is_women_led = COALESCE($8, is_women_led), website_url = COALESCE($9, website_url), tagline = COALESCE($10, tagline), updated_at = NOW()
             WHERE founder_id = $11`,
            [
              startupName,
              sector || null,
              stage || null,
              country || null,
              team_size !== undefined ? team_size : 1,
              funding_goal !== undefined ? funding_goal : null,
              sdgs || null,
              is_women_led || false,
              startup_website || null,
              startup_tagline || null,
              req.user.userId
            ]
          );
        } else {
          await client.query(
            `INSERT INTO startups (founder_id, name, tagline, sector, stage, country, team_size, funding_goal, sdgs, is_women_led, website_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [req.user.userId, startupName, startup_tagline || null, sector || 'general', stage || 'mvp', country || 'Ghana', team_size || 1, funding_goal || null, sdgs || null, is_women_led || false, startup_website || null]
          );
        }
      } else if (r === 'investor') {
        let onboardingInvestorType = investor_type;
        if (roles.includes('government')) onboardingInvestorType = 'government';
        else if (roles.includes('corporate')) onboardingInvestorType = 'corporate';

        const existing = await client.query('SELECT id FROM investors WHERE user_id = $1', [req.user.userId]);
        if (existing.rows.length) {
          await client.query(
            `UPDATE investors
             SET firm_name = COALESCE($1, firm_name), investor_type = COALESCE($2, investor_type), ticket_min = COALESCE($3, ticket_min),
                 ticket_max = COALESCE($4, ticket_max), sectors = COALESCE($5, sectors), stages = COALESCE($6, stages),
                 countries = COALESCE($7, countries), instruments = COALESCE($8, instruments), updated_at = NOW()
             WHERE user_id = $9`,
            [
              firm_name || null,
              onboardingInvestorType || null,
              ticket_min !== undefined ? ticket_min : null,
              ticket_max !== undefined ? ticket_max : null,
              sectors || null,
              stages || null,
              countries || null,
              instruments || null,
              req.user.userId
            ]
          );
        } else {
          await client.query(
            `INSERT INTO investors (user_id, firm_name, investor_type, sectors, stages, countries, instruments, ticket_min, ticket_max)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [req.user.userId, firm_name || null, onboardingInvestorType || null, sectors || null, stages || null, countries || null, instruments || null, ticket_min || null, ticket_max || null]
          );
        }
      } else if (r === 'mentor') {
        const existing = await client.query('SELECT id FROM mentors WHERE user_id = $1', [req.user.userId]);
        if (existing.rows.length) {
          await client.query(
            `UPDATE mentors
             SET expertise = COALESCE($1, expertise), session_types = COALESCE($2, session_types), languages = COALESCE($3, languages),
                 experience_years = COALESCE($4, experience_years), max_mentees = COALESCE($5, max_mentees), hourly_rate = COALESCE($6, hourly_rate),
                 "current_role" = COALESCE($7, "current_role"), bio_extended = COALESCE($8, bio_extended), updated_at = NOW()
             WHERE user_id = $9`,
            [
              expertise || null,
              session_types || null,
              languages || null,
              experience_years !== undefined ? parseInt(experience_years) : 0,
              max_mentees !== undefined ? max_mentees : 5,
              hourly_rate !== undefined ? hourly_rate : 0,
              current_role || null,
              mentor_bio || null,
              req.user.userId
            ]
          );
        } else {
          await client.query(
            `INSERT INTO mentors (user_id, expertise, session_types, languages, experience_years, max_mentees, hourly_rate, "current_role", bio_extended)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [req.user.userId, expertise || null, session_types || null, languages || null, experience_years || 0, max_mentees || 5, hourly_rate || 0, current_role || null, mentor_bio || null]
          );
        }
      }
    }

    // Update Startup Passport completion metrics
    await client.query(
      `UPDATE startup_passports
       SET profile_completion = 100, updated_at = NOW()
       WHERE user_id = $1`,
      [req.user.userId]
    );

    await client.query('COMMIT');
    await cacheDel(`user:${req.user.userId}`);

    return res.json({ success: true, message: 'Onboarding completed successfully' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Onboarding error:', err);
    return res.status(500).json({ error: 'Onboarding update failed' });
  } finally {
    if (client) client.release();
  }
});

export default router;
