import express from 'express';
import { db } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';
import { generateEmbedding, formatOpportunityText } from '../utils/embeddings.js';

const router = express.Router();

/* ============================================================
   MIDDLEWARE & AUTHORIZATION
   ============================================================ */

const authorizeGov = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }
    if (req.user.role === 'investor') {
      const { rows } = await db.query('SELECT investor_type FROM investors WHERE user_id = $1', [req.user.userId]);
      if (rows.length && (rows[0].investor_type === 'government' || rows[0].investor_type === 'corporate')) {
        return next();
      }
    }
    return res.status(403).json({ error: 'Access denied. Requires Government, Corporate, or Admin credentials.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   VALIDATION SCHEMAS
   ============================================================ */

const createGrantSchema = z.object({
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

const disburseEscrowSchema = z.object({
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

/* ============================================================
   ROUTES
   ============================================================ */

// GET /government/analytics - SME national dashboard aggregations
router.get('/analytics', authenticate, authorizeGov, async (req, res) => {
  try {
    const totalStartupsRes = await db.query('SELECT COUNT(*) AS count FROM startups');
    const totalCorpRes = await db.query('SELECT COUNT(*) AS count FROM startup_profiles_v4 WHERE is_registered_incorporation = true');
    const avgHeadcountRes = await db.query('SELECT AVG(headcount) AS avg FROM startup_profiles_v4');
    const avgFemaleRes = await db.query('SELECT AVG(female_representation_percentage) AS avg FROM startup_profiles_v4');
    const avgYouthRes = await db.query('SELECT AVG(youth_representation_percentage) AS avg FROM startup_profiles_v4');
    const sectorsRes = await db.query('SELECT sector, COUNT(*) AS count FROM startups GROUP BY sector');

    return res.json({
      success: true,
      data: {
        total_startups: parseInt(totalStartupsRes.rows[0]?.count || 0),
        total_registered_corporations: parseInt(totalCorpRes.rows[0]?.count || 0),
        avg_headcount: parseFloat(avgHeadcountRes.rows[0]?.avg || 0).toFixed(1),
        avg_female_representation: parseFloat(avgFemaleRes.rows[0]?.avg || 0).toFixed(1),
        avg_youth_representation: parseFloat(avgYouthRes.rows[0]?.avg || 0).toFixed(1),
        sectors: sectorsRes.rows
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /government/startups - List all startups details for audit trail
router.get('/startups', authenticate, authorizeGov, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.name, s.sector, s.country, s.stage, s.is_verified,
              p.is_registered_incorporation, p.registry_number, p.incorporation_country, p.headcount,
              n.id AS startup_node_id
       FROM startups s
       LEFT JOIN graph_nodes n ON n.entity_type = 'startup' AND (n.properties->>'startup_id') = s.id::text
       LEFT JOIN startup_profiles_v4 p ON p.startup_node_id = n.id
       ORDER BY s.created_at DESC`
    );
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /government/grants - Create government grant opportunities
router.post('/grants', authenticate, authorizeGov, validate(createGrantSchema), async (req, res) => {
  try {
    const opp = req.body;

    // Generate local 384-dimensional vector embedding
    const formattedText = formatOpportunityText({
      ...opp,
      opportunity_type: 'government_program'
    });
    const vec = await generateEmbedding(formattedText);
    const pgVector = `[${vec.join(',')}]`;

    const { rows } = await db.query(
      `INSERT INTO opportunities (
        title, description, opportunity_type, value_amount, currency,
        eligible_countries, eligible_sectors, eligible_stages, deadline,
        embedding, metadata, created_at, updated_at
       )
       VALUES ($1, $2, 'government_program', $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
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

// POST /government/disburse - Setup a dynamic V4 grant escrow payout
router.post('/disburse', authenticate, authorizeGov, validate(disburseEscrowSchema), async (req, res) => {
  try {
    const {
      deal_id, investor_node_id, startup_node_id, total_amount, currency,
      escrow_type, token_address, arbitrator_node_id, milestones
    } = req.body;

    // Enforce total milestones values sum equals total escrow amount
    const sum = milestones.reduce((acc, m) => acc + m.amount, 0);
    if (Math.abs(sum - total_amount) > 0.01) {
      return res.status(400).json({ error: 'Sum of milestone amounts must equal total_amount' });
    }

    await db.query('BEGIN');

    // Create Escrow Node
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

// GET /government/escrows - List platform escrows disburse history
router.get('/escrows', authenticate, authorizeGov, async (req, res) => {
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
