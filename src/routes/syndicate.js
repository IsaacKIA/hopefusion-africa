import express from 'express';
import { db } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

/* ============================================================
   MIDDLEWARE & AUTHORIZATION
   ============================================================ */

const authorizeSyndicateManager = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      return next();
    }
    if (req.user.role === 'investor') {
      const { rows } = await db.query('SELECT investor_type FROM investors WHERE user_id = $1', [req.user.userId]);
      if (rows.length && (rows[0].investor_type === 'corporate' || rows[0].investor_type === 'government')) {
        return next();
      }
    }
    return res.status(403).json({ error: 'Access denied. Requires Corporate, Government or Admin credentials.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const authorizeInvestor = async (req, res, next) => {
  if (req.user.role === 'admin' || req.user.role === 'investor') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Requires Investor credentials.' });
};

/* ============================================================
   VALIDATION SCHEMAS
   ============================================================ */

const createSPVSchema = z.object({
  opportunity_id: z.string().uuid(),
  target_amount: z.number().positive(),
  minimum_ticket: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  spv_name: z.string().trim().min(1, 'spv_name is required'),
  startup_node_id: z.string().uuid()
});

const investSPVSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD')
});

/* ============================================================
   1. CREATE SYNDICATED SPV NODE
   POST /syndicate/spvs
   ============================================================ */
router.post('/spvs', authenticate, authorizeSyndicateManager, validate(createSPVSchema), async (req, res) => {
  try {
    const { opportunity_id, target_amount, minimum_ticket, currency, spv_name, startup_node_id } = req.body;

    // Verify startup node exists
    const startupCheck = await db.query("SELECT * FROM graph_nodes WHERE id = $1 AND entity_type = 'startup'", [startup_node_id]);
    if (!startupCheck.rows.length) {
      return res.status(404).json({ error: 'Startup graph node not found' });
    }

    const properties = {
      is_spv: true,
      spv_name,
      target_amount,
      minimum_ticket,
      pooled_amount: 0,
      currency,
      status: 'active',
      opportunity_id
    };

    await db.query('BEGIN');

    // Create SPV Node in Graph nodes
    const nodeRes = await db.query(
      `INSERT INTO graph_nodes (entity_type, properties)
       VALUES ('investor', $1)
       RETURNING *`,
      [JSON.stringify(properties)]
    );
    const spvNode = nodeRes.rows[0];

    // Create edge linking SPV to Startup
    await db.query(
      `INSERT INTO graph_edges (source_id, target_id, relationship_type, weight, metadata)
       VALUES ($1, $2, 'partnered_with', 1.0, '{}')`,
      [spvNode.id, startup_node_id]
    );

    await db.query('COMMIT');

    return res.status(201).json({ success: true, data: spvNode });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   2. COMMIT micro-investment capital pool to SPV
   POST /syndicate/spvs/:spvId/invest
   ============================================================ */
router.post('/spvs/:spvId/invest', authenticate, authorizeInvestor, validate(investSPVSchema), async (req, res) => {
  try {
    const { spvId } = req.params;
    const { amount, currency } = req.body;

    await db.query('BEGIN');

    // Lock SPV node for update to prevent race conditions during updates
    const spvRes = await db.query(
      `SELECT * FROM graph_nodes WHERE id = $1 FOR UPDATE`,
      [spvId]
    );

    if (!spvRes.rows.length || spvRes.rows[0].entity_type !== 'investor' || !spvRes.rows[0].properties?.is_spv) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'SPV node not found' });
    }

    const spvNode = spvRes.rows[0];
    const props = spvNode.properties;

    if (props.status !== 'active') {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: `Investment rejected: SPV status is ${props.status}` });
    }

    if (amount < parseFloat(props.minimum_ticket)) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: `Investment amount is below minimum ticket size of ${props.minimum_ticket} ${props.currency}` });
    }

    // Lookup or self-heal investor graph node
    const investorRes = await db.query(
      `SELECT * FROM graph_nodes WHERE entity_type = 'investor' AND (properties->>'user_id') = $1::text`,
      [req.user.userId]
    );

    let investorNodeId;
    if (investorRes.rows.length) {
      investorNodeId = investorRes.rows[0].id;
    } else {
      const { rows } = await db.query(
        `INSERT INTO graph_nodes (entity_type, properties)
         VALUES ('investor', $1)
         RETURNING id`,
        [JSON.stringify({ user_id: req.user.userId, name: req.user.email })]
      );
      investorNodeId = rows[0].id;
    }

    // Record syndicated investment edge
    await db.query(
      `INSERT INTO graph_edges (source_id, target_id, relationship_type, weight, metadata)
       VALUES ($1, $2, 'invested_in', 1.0, $3)
       ON CONFLICT (source_id, target_id, relationship_type)
       DO UPDATE SET metadata = graph_edges.metadata || EXCLUDED.metadata`,
      [investorNodeId, spvId, JSON.stringify({ amount, currency, invested_at: new Date() })]
    );

    // Update pooled metrics
    const currentPool = parseFloat(props.pooled_amount || 0);
    const newPool = currentPool + amount;
    const target = parseFloat(props.target_amount);
    const newStatus = newPool >= target ? 'funded' : 'active';

    const updatedProps = {
      ...props,
      pooled_amount: newPool,
      status: newStatus
    };

    await db.query(
      `UPDATE graph_nodes
       SET properties = $1
       WHERE id = $2`,
      [JSON.stringify(updatedProps), spvId]
    );

    await db.query('COMMIT');

    return res.json({
      success: true,
      data: {
        spv_id: spvId,
        spv_name: props.spv_name,
        pooled_amount: newPool,
        target_amount: target,
        status: newStatus,
        investment: {
          investor_node_id: investorNodeId,
          amount,
          currency
        }
      }
    });
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    return res.status(500).json({ error: err.message });
  }
});

export default router;
