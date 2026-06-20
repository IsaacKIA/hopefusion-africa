import express from 'express';
import { db } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';
import { generateEmbedding, formatOpportunityText } from '../utils/embeddings.js';

const router = express.Router();

/* ============================================================
   MIDDLEWARE & AUTHORIZATION
   ============================================================ */

const authorizeCorp = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }
    if (req.user.role === 'investor') {
      const { rows } = await db.query('SELECT investor_type FROM investors WHERE user_id = $1', [req.user.userId]);
      if (rows.length && rows[0].investor_type === 'corporate') {
        return next();
      }
    }
    return res.status(403).json({ error: 'Access denied. Requires Corporate or Admin credentials.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   VALIDATION SCHEMAS
   ============================================================ */

const createChallengeSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional(),
  value_amount: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  eligible_countries: z.array(z.string()).default([]),
  eligible_sectors: z.array(z.string()).default([]),
  eligible_stages: z.array(z.string()).default([]),
  deadline: z.string().trim().optional().nullable(),
  metadata: z.record(z.any()).default({})
});

const createEscrowSchema = z.object({
  deal_id: z.string().trim().min(1, 'deal_id is required'),
  investor_node_id: z.string().uuid(),
  startup_node_id: z.string().uuid(),
  total_amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  escrow_type: z.enum(['MATIC', 'ERC20', 'MOBILE_MONEY', 'CARD']),
  token_address: z.string().optional().nullable(),
  arbitrator_node_id: z.string().uuid(),
  milestones: z.array(z.object({
    title: z.string().trim().min(1, 'Milestone title is required'),
    amount: z.number().positive(),
    due_date: z.string().trim().optional().nullable()
  })).min(1, 'At least one milestone is required')
});

const submitMilestoneSchema = z.object({
  evidence_uri: z.string().url('evidence_uri must be a valid URL')
});

/* ============================================================
   ROUTES
   ============================================================ */

// POST /corporate/challenges - Post enterprise innovation challenge opportunity
router.post('/challenges', authenticate, authorizeCorp, validate(createChallengeSchema), async (req, res) => {
  try {
    const opp = req.body;

    // Generate local 384-dimensional vector embedding
    const formattedText = formatOpportunityText({
      ...opp,
      opportunity_type: 'corporate_challenge'
    });
    const vec = await generateEmbedding(formattedText);
    const pgVector = `[${vec.join(',')}]`;

    const { rows } = await db.query(
      `INSERT INTO opportunities (
        title, description, opportunity_type, value_amount, currency,
        eligible_countries, eligible_sectors, eligible_stages, deadline,
        embedding, metadata, created_at, updated_at
       )
       VALUES ($1, $2, 'corporate_challenge', $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        opp.title,
        opp.description || null,
        opp.value_amount !== undefined ? opp.value_amount : null,
        opp.currency || 'USD',
        JSON.stringify(opp.eligible_countries),
        JSON.stringify(opp.eligible_sectors),
        JSON.stringify(opp.eligible_stages),
        opp.deadline || null,
        pgVector,
        JSON.stringify(opp.metadata)
      ]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /corporate/escrow/create - Create corporate procurement V4 escrow
router.post('/escrow/create', authenticate, authorizeCorp, validate(createEscrowSchema), async (req, res) => {
  try {
    const {
      deal_id, investor_node_id, startup_node_id, total_amount, currency,
      escrow_type, token_address, arbitrator_node_id, milestones
    } = req.body;

    const sum = milestones.reduce((acc, m) => acc + m.amount, 0);
    if (Math.abs(sum - total_amount) > 0.01) {
      return res.status(400).json({ error: 'Sum of milestone amounts must equal total_amount' });
    }

    await db.query('BEGIN');

    // Create Escrow
    const escrowRes = await db.query(
      `INSERT INTO platform_escrows_v4 (
         deal_id, investor_node_id, startup_node_id, total_amount, currency,
         escrow_type, token_address, status, arbitrator_node_id, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, NOW(), NOW())
       RETURNING *`,
      [deal_id, investor_node_id, startup_node_id, total_amount, currency || 'USD', escrow_type, token_address || null, arbitrator_node_id]
    );
    const escrow = escrowRes.rows[0];

    // Create Milestones
    const milestoneRows = [];
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const mRes = await db.query(
        `INSERT INTO escrow_milestones_v4 (
           escrow_id, milestone_index, title, amount, status, due_date
         )
         VALUES ($1, $2, $3, $4, 'pending', $5)
         RETURNING *`,
        [escrow.id, i, m.title, m.amount, m.due_date || null]
      );
      milestoneRows.push(mRes.rows[0]);
    }

    await db.query('COMMIT');

    return res.status(201).json({
      success: true,
      data: {
        ...escrow,
        milestones: milestoneRows
      }
    });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: err.message });
  }
});

// POST /corporate/escrow/:escrowId/milestone/:milestoneId/submit - Startup submits milestone evidence
router.post('/escrow/:escrowId/milestone/:milestoneId/submit', authenticate, authorize('startup'), validate(submitMilestoneSchema), async (req, res) => {
  try {
    const { escrowId, milestoneId } = req.params;
    const { evidence_uri } = req.body;

    const { rows } = await db.query(
      `UPDATE escrow_milestones_v4
       SET status = 'submitted', evidence_uri = $1, submitted_at = NOW()
       WHERE id = $2 AND escrow_id = $3
       RETURNING *`,
      [evidence_uri, milestoneId, escrowId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Milestone not found under this escrow ID' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /corporate/escrow/:escrowId/milestone/:milestoneId/approve - Corporate approves milestone evidence and releases payout
router.post('/escrow/:escrowId/milestone/:milestoneId/approve', authenticate, authorizeCorp, async (req, res) => {
  try {
    const { escrowId, milestoneId } = req.params;

    await db.query('BEGIN');

    // Update Milestone status to approved
    const milestoneUpdate = await db.query(
      `UPDATE escrow_milestones_v4
       SET status = 'approved'
       WHERE id = $1 AND escrow_id = $2
       RETURNING *`,
      [milestoneId, escrowId]
    );

    if (!milestoneUpdate.rows.length) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Milestone not found' });
    }

    // Check if all other milestones are approved to auto-complete the main escrow contract
    const countCheck = await db.query(
      `SELECT COUNT(*) AS count FROM escrow_milestones_v4
       WHERE escrow_id = $1 AND status != 'approved'`,
      [escrowId]
    );

    let escrowStatus = 'active';
    if (parseInt(countCheck.rows[0].count) === 0) {
      await db.query(
        `UPDATE platform_escrows_v4
         SET status = 'completed', updated_at = NOW()
         WHERE id = $1`,
        [escrowId]
      );
      escrowStatus = 'completed';
    }

    await db.query('COMMIT');

    return res.json({
      success: true,
      data: {
        milestone: milestoneUpdate.rows[0],
        escrow_status: escrowStatus
      }
    });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: err.message });
  }
});

// POST /corporate/escrow/:escrowId/milestone/:milestoneId/reject - Corporate rejects milestone evidence
router.post('/escrow/:escrowId/milestone/:milestoneId/reject', authenticate, authorizeCorp, async (req, res) => {
  try {
    const { escrowId, milestoneId } = req.params;

    const { rows } = await db.query(
      `UPDATE escrow_milestones_v4
       SET status = 'rejected'
       WHERE id = $1 AND escrow_id = $2
       RETURNING *`,
      [milestoneId, escrowId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /corporate/escrows - List corporate procurement escrows
router.get('/escrows', authenticate, authorizeCorp, async (req, res) => {
  try {
    const nodeRes = await db.query(
      `SELECT id FROM graph_nodes WHERE entity_type = 'investor' AND (properties->>'user_id') = $1`,
      [req.user.userId]
    );

    let query = `
      SELECT e.*, 
             s.name as startup_name,
             (SELECT json_agg(m.* ORDER BY m.milestone_index) 
              FROM escrow_milestones_v4 m 
              WHERE m.escrow_id = e.id) as milestones
      FROM platform_escrows_v4 e
      JOIN graph_nodes n ON e.startup_node_id = n.id
      JOIN startups s ON (n.properties->>'startup_id') = s.id::text
    `;
    const params = [];

    // Admins see all, otherwise filter by investor_node_id
    if (req.user.role !== 'admin' && nodeRes.rows.length) {
      query += ` WHERE e.investor_node_id = $1`;
      params.push(nodeRes.rows[0].id);
    } else if (req.user.role !== 'admin' && !nodeRes.rows.length) {
      return res.json({ success: true, data: [] });
    }

    query += ` ORDER BY e.created_at DESC`;
    const { rows } = await db.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
