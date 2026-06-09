import express from 'express';
import { db } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

const grantApplySchema = z.object({
  grant_name: z.string().trim().min(1, 'Grant name is required'),
  grant_org: z.string().trim().min(1, 'Grant organization is required'),
  grant_amount: z.number().int().nonnegative().optional(),
  deadline: z.string().trim().optional(),
  project_title: z.string().trim().optional(),
  problem_stmt: z.string().trim().optional(),
  solution: z.string().trim().optional(),
  funding_plan: z.string().trim().optional(),
});

// POST /apply
router.post('/apply', authenticate, authorize('startup'), validate(grantApplySchema), async (req, res) => {
  try {
    const { grant_name, grant_org, grant_amount, deadline, project_title, problem_stmt, solution, funding_plan } = req.body;

    const startup = await db.query('SELECT id FROM startups WHERE founder_id = $1', [req.user.userId]);
    if (!startup.rows.length) {
      return res.status(404).json({ error: 'Startup profile not found' });
    }

    const { rows } = await db.query(
      `INSERT INTO grant_applications (startup_id, grant_name, grant_org, grant_amount, deadline,
        project_title, problem_stmt, solution, funding_plan, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', NOW()) RETURNING *`,
      [startup.rows[0].id, grant_name, grant_org, grant_amount || null, deadline || null,
       project_title || null, problem_stmt || null, solution || null, funding_plan || null]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /my
router.get('/my', authenticate, authorize('startup'), async (req, res) => {
  try {
    const startup = await db.query('SELECT id FROM startups WHERE founder_id = $1', [req.user.userId]);
    if (!startup.rows.length) {
      return res.status(404).json({ error: 'Startup profile not found' });
    }

    const { rows } = await db.query(
      'SELECT * FROM grant_applications WHERE startup_id = $1 ORDER BY created_at DESC',
      [startup.rows[0].id]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
