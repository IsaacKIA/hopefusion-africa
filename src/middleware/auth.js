import jwt from 'jsonwebtoken';
import { redis } from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = auth.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is blacklisted (e.g., after logout)
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token revoked' });
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
