import jwt from 'jsonwebtoken';
import { db, redis } from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      token = auth.slice(7);
    } else if (req.headers.cookie) {
      const cookies = Object.fromEntries(
        req.headers.cookie.split(';').map(c => c.trim().split('='))
      );
      token = cookies.hfa_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is blacklisted (e.g., after logout)
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Check if token was revoked due to a password reset
    const revokedBefore = await redis.get(`revoked_before:${payload.userId}`);
    if (revokedBefore && payload.iat < parseInt(revokedBefore)) {
      return res.status(401).json({ error: 'Token revoked' });
    }

    // Skip verification check for auth routing actions
    const bypassPaths = ['/verify', '/resend', '/resend-verify', '/logout', '/status', '/auth/status'];
    const path = req.path || '';
    const isBypass = bypassPaths.some(p => path.endsWith(p));

    if (!isBypass) {
      const { rows } = await db.query('SELECT is_verified FROM users WHERE id = $1', [payload.userId]);
      if (rows.length && !rows[0].is_verified) {
        return res.status(403).json({ error: 'Email verification required', code: 'EMAIL_UNVERIFIED' });
      }
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Requires: ${roles.join(' or ')}` });
  }
  next();
};
