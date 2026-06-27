import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import passport from 'passport';
import crypto from 'crypto';
import { db, redis, cacheGet, cacheSet, cacheDel } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limiter.js';
import { validate } from '../middleware/validation.js';
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
router.post('/register', rateLimit(5, 60), validate(registerSchema), async (req, res) => {
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

    const { rows: [user] } = await client.query(
      `INSERT INTO users (email, password_hash, role, roles, first_name, last_name, phone, country, linkedin_url, website_url, bio)
       VALUES ($1, $2, $3, ARRAY[$3]::TEXT[], $4, $5, $6, $7, $8, $9, $10) RETURNING id, email, role, first_name, last_name`,
      [email, hash, dbRole, first_name, last_name, normalizedPhone, country || null, linkedin_url || null, website_url || null, dbRole === 'mentor' ? mentor_bio || null : null]
    );

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

    // Store verify code in Redis (10 min)
    await cacheSet(`verify:${user.id}`, code, 600);

    // Send verification email — capture result to detect delivery failures
    let emailResult = { provider: 'unknown' };
    try {
      emailResult = await sendEmail(
        email,
        'Your HopeFusion Africa verification code',
        buildOTPEmail(first_name, code, 'verify')
      );
    } catch (emailErr) {
      console.error('[Auth] Verification email error:', emailErr.message);
    }

    // If email couldn't be delivered (domain not verified / no config),
    // include the OTP in the response so dev/staging can still test
    const emailDelivered = emailResult.provider === 'resend' || emailResult.provider === 'smtp';
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

    return res.status(201).json({
      success: true,
      message: emailDelivered
        ? 'Account created. Check your email for verification code.'
        : 'Account created. Email delivery not configured — use the code below to verify.',
      token,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role, first_name: user.first_name, last_name: user.last_name },
      // Only expose OTP in response when email is not delivered AND not in production
      ...((!emailDelivered && isDev) && { debug_otp: code, debug_note: 'Verify your domain at resend.com/domains to enable real email delivery' }),
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
  try {
    const { code } = req.body;
    const stored = await cacheGet(`verify:${req.user.userId}`);
    if (!stored || stored !== code) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }
    await db.query('UPDATE users SET is_verified = TRUE WHERE id = $1', [req.user.userId]);
    
    // Automatically create Startup Passport post-verification
    await db.query(
      `INSERT INTO startup_passports (user_id, profile_completion, verification_status, hope_score, funding_readiness, opportunity_readiness)
       VALUES ($1, 10, 'Verified', 300, 'Low', 'Low')
       ON CONFLICT (user_id) DO NOTHING`,
      [req.user.userId]
    );

    await cacheDel(`verify:${req.user.userId}`);
    await cacheDel(`user:${req.user.userId}`);
    await redis.del(`user:verified:${req.user.userId}`);
    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
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
    
    let emailResult = { provider: 'unknown' };
    try {
      emailResult = await sendEmail(
        rows[0].email,
        'Your HopeFusion Africa password reset code',
        buildOTPEmail(rows[0].first_name, code, 'reset')
      );
    } catch (err) {
      console.error('[Auth] Password reset email error:', err.message);
    }

    const emailDelivered = emailResult.provider === 'resend' || emailResult.provider === 'smtp';
    const isDev = process.env.NODE_ENV !== 'production';

    return res.json({
      success: true,
      message: 'If that email exists, a password reset code has been sent.',
      ...((!emailDelivered && isDev) && { debug_otp: code })
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
  try {
    const userId = req.user.userId;
    const { rows } = await db.query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { email, first_name } = rows[0];
    const code = generateVerifyCode();
    
    await cacheSet(`verify:${userId}`, code, 600);
    
    let emailResult = { provider: 'unknown' };
    try {
      emailResult = await sendEmail(
        email,
        'Your HopeFusion Africa verification code',
        buildOTPEmail(first_name, code, 'verify')
      );
    } catch (err) {
      console.error('[Auth] Resend OTP email error:', err.message);
    }
    
    const emailDelivered = emailResult.provider === 'resend' || emailResult.provider === 'smtp';
    const isDev = process.env.NODE_ENV !== 'production';

    return res.json({
      success: true,
      message: emailDelivered
        ? 'Verification code resent successfully'
        : 'Verification code generated. Email delivery failed — use the code below.',
      ...((!emailDelivered && isDev) && { debug_otp: code })
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
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
  const client = await db.connect();
  try {
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
    await client.query('ROLLBACK').catch(() => {});
    console.error('Onboarding error:', err);
    return res.status(500).json({ error: 'Onboarding update failed' });
  } finally {
    client.release();
  }
});

export default router;
