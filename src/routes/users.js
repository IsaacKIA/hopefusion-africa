import express from 'express';
import { db, cacheGet, cacheSet, cacheDel } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

const userUpdateSchema = z.object({
  first_name: z.string().trim().min(1, 'First name cannot be empty').optional(),
  last_name: z.string().trim().min(1, 'Last name cannot be empty').optional(),
  phone: z.string().trim().optional(),
  country: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  linkedin_url: z.string().trim().url('Invalid LinkedIn URL').or(z.literal('')).optional(),
  twitter_url: z.string().trim().url('Invalid Twitter/X URL').or(z.literal('')).optional(),
  website_url: z.string().trim().url('Invalid Website URL').or(z.literal('')).optional(),
}).strict();

// GET /me
router.get('/me', authenticate, async (req, res) => {
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
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /me
router.patch('/me', authenticate, validate(userUpdateSchema), async (req, res) => {
  try {
    const updates = req.body;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    await db.query(
      `UPDATE users SET ${sets}, updated_at = NOW() WHERE id = $1`,
      [req.user.userId, ...Object.values(updates)]
    );
    await cacheDel(`user:${req.user.userId}`);
    return res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
