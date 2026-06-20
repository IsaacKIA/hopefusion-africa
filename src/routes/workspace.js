import express from 'express';
import { db, cacheGet, cacheSet, cacheDel } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';

const router = express.Router();

/* ============================================================
   VALIDATION SCHEMAS
   ============================================================ */

const ledgerSchema = z.object({
  startup_id: z.string().uuid(),
  bank_balance: z.number().nonnegative(),
  monthly_burn_rate: z.number().nonnegative(),
  currency: z.string().length(3).default('USD'),
  ledger_history: z.array(z.object({
    month: z.string(),
    cash_in: z.number().nonnegative(),
    cash_out: z.number().nonnegative()
  })).optional()
});

const investorRelationSchema = z.object({
  startup_id: z.string().uuid(),
  investor_node_id: z.string().uuid(),
  pipeline_stage: z.enum(['lead', 'contacted', 'pitching', 'due_diligence', 'term_sheet', 'funded', 'passed']),
  notes: z.string().optional(),
  equity_offered: z.number().min(0).max(100).default(0.00)
});

const graphNodeSchema = z.object({
  entity_type: z.enum([
    'founder', 'startup', 'investor', 'mentor', 'talent', 
    'university', 'government', 'corporate', 'accelerator', 
    'supplier', 'development_partner'
  ]),
  properties: z.record(z.any()).default({})
});

const graphEdgeSchema = z.object({
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  relationship_type: z.enum([
    'invested_in', 'mentored_by', 'founded', 'studied_at', 
    'worked_at', 'partnered_with', 'funded_by', 'contracted_by', 'endorsed_by'
  ]),
  weight: z.number().min(0).max(10).default(1.0),
  metadata: z.record(z.any()).default({})
});

/* ============================================================
   FOUNDER OS WORKSPACE MODULES
   ============================================================ */

// GET /workspace/financials/:startupId
router.get('/workspace/financials/:startupId', authenticate, async (req, res) => {
  try {
    const { startupId } = req.params;
    const cacheKey = `financials:${startupId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const { rows } = await db.query(
      `SELECT * FROM founder_financial_ledgers WHERE startup_id = $1`,
      [startupId]
    );

    const data = rows.length ? rows[0] : {
      startup_id: startupId,
      bank_balance: 0.00,
      monthly_burn_rate: 0.00,
      currency: 'USD',
      ledger_history: [],
      forecasted_runway_months: 99.9
    };

    await cacheSet(cacheKey, data, 120);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /workspace/financials
router.post('/workspace/financials', authenticate, validate(ledgerSchema), async (req, res) => {
  try {
    const { startup_id, bank_balance, monthly_burn_rate, currency, ledger_history } = req.body;
    
    // Calculate forecasted runway
    const forecasted = monthly_burn_rate > 0 ? (bank_balance / monthly_burn_rate) : 99.9;
    const historyJSON = JSON.stringify(ledger_history || []);

    const { rows } = await db.query(
      `INSERT INTO founder_financial_ledgers (startup_id, bank_balance, monthly_burn_rate, currency, ledger_history, forecasted_runway_months, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (startup_id) DO UPDATE 
       SET bank_balance = $2, monthly_burn_rate = $3, currency = $4, ledger_history = $5, forecasted_runway_months = $6, updated_at = NOW()
       RETURNING *`,
      [startup_id, bank_balance, monthly_burn_rate, currency, historyJSON, forecasted]
    );

    await cacheDel(`financials:${startup_id}`);
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /workspace/crm/:startupId
router.get('/workspace/crm/:startupId', authenticate, async (req, res) => {
  try {
    const { startupId } = req.params;
    const { rows } = await db.query(
      `SELECT r.*, n.properties as investor_details
       FROM founder_investor_relations r
       JOIN graph_nodes n ON r.investor_node_id = n.id
       WHERE r.startup_id = $1`,
      [startupId]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /workspace/crm
router.post('/workspace/crm', authenticate, validate(investorRelationSchema), async (req, res) => {
  try {
    const { startup_id, investor_node_id, pipeline_stage, notes, equity_offered } = req.body;

    const { rows } = await db.query(
      `INSERT INTO founder_investor_relations (startup_id, investor_node_id, pipeline_stage, notes, equity_offered, last_interaction_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
       SET pipeline_stage = $3, notes = $4, equity_offered = $5, last_interaction_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [startup_id, investor_node_id, pipeline_stage, notes || '', equity_offered]
    );

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   V4 ECOSYSTEM GRAPH ROUTING
   ============================================================ */

// POST /graph/node - Create Node
router.post('/graph/node', authenticate, validate(graphNodeSchema), async (req, res) => {
  try {
    const { entity_type, properties } = req.body;
    const { rows } = await db.query(
      `INSERT INTO graph_nodes (entity_type, properties, created_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [entity_type, JSON.stringify(properties)]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /graph/edge - Create Edge
router.post('/graph/edge', authenticate, validate(graphEdgeSchema), async (req, res) => {
  try {
    const { source_id, target_id, relationship_type, weight, metadata } = req.body;
    
    // Ensure nodes exist
    const nodeCheck = await db.query(`SELECT id FROM graph_nodes WHERE id IN ($1, $2)`, [source_id, target_id]);
    if (nodeCheck.rows.length < 2) {
      return res.status(404).json({ error: 'One or both graph nodes not found' });
    }

    const { rows } = await db.query(
      `INSERT INTO graph_edges (source_id, target_id, relationship_type, weight, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT ON CONSTRAINT unique_source_target_rel DO UPDATE
       SET weight = $4, metadata = $5
       RETURNING *`,
      [source_id, target_id, relationship_type, weight, JSON.stringify(metadata)]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /graph/affinity - Compute Connection Score between 2 nodes
router.get('/graph/affinity', authenticate, async (req, res) => {
  try {
    const { source, target } = req.query;
    if (!source || !target) {
      return res.status(400).json({ error: 'source and target node IDs are required' });
    }

    // 1. Get neighbors overlap (Jaccard-like neighbors intersection over union)
    const neighborsSource = await db.query(
      `SELECT target_id FROM graph_edges WHERE source_id = $1 UNION SELECT source_id FROM graph_edges WHERE target_id = $1`,
      [source]
    );
    const neighborsTarget = await db.query(
      `SELECT target_id FROM graph_edges WHERE source_id = $1 UNION SELECT source_id FROM graph_edges WHERE target_id = $1`,
      [target]
    );

    const sSet = new Set(neighborsSource.rows.map(r => r.target_id || r.source_id));
    const tSet = new Set(neighborsTarget.rows.map(r => r.target_id || r.source_id));

    const intersect = new Set([...sSet].filter(x => tSet.has(x)));
    const union = new Set([...sSet, ...tSet]);

    const neighborsScore = union.size > 0 ? (intersect.size / union.size) : 0;

    // 2. Direct edge weights
    const directEdges = await db.query(
      `SELECT SUM(weight) as weight_sum FROM graph_edges 
       WHERE (source_id = $1 AND target_id = $2) OR (source_id = $2 AND target_id = $1)`,
      [source, target]
    );

    const directSum = parseFloat(directEdges.rows[0]?.weight_sum || 0.0);
    const connectionScore = (neighborsScore * 0.4) + (Math.min(1.0, directSum / 10) * 0.6);

    return res.json({
      success: true,
      data: {
        source_id: source,
        target_id: target,
        overlap_neighbors: intersect.size,
        direct_weight: directSum,
        connection_score: parseFloat(connectionScore.toFixed(3))
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /graph/pagerank - Solve PageRank on nodes
router.post('/graph/pagerank', authenticate, async (req, res) => {
  try {
    // 1. Load all nodes & edges
    const nodesRes = await db.query(`SELECT id FROM graph_nodes`);
    const edgesRes = await db.query(`SELECT source_id, target_id, weight FROM graph_edges`);

    const nodes = nodesRes.rows.map(n => n.id);
    const edgeList = edgesRes.rows;

    if (!nodes.length) {
      return res.json({ success: true, message: 'No nodes in graph' });
    }

    // 2. Initialize pageranks
    const N = nodes.length;
    let ranks = {};
    nodes.forEach(id => { ranks[id] = 1.0 / N; });

    // Build out-degrees and adjacency
    let outWeights = {};
    let incomingAdjacency = {};
    nodes.forEach(id => {
      outWeights[id] = 0.0;
      incomingAdjacency[id] = [];
    });

    edgeList.forEach(e => {
      const src = e.source_id;
      const target = e.target_id;
      const w = parseFloat(e.weight || 1.0);

      if (outWeights[src] !== undefined) {
        outWeights[src] += w;
      }
      if (incomingAdjacency[target] !== undefined) {
        incomingAdjacency[target].push({ src, w });
      }
    });

    // 3. Iterative execution (20 passes)
    const damping = 0.85;
    for (let iter = 0; iter < 20; iter++) {
      let nextRanks = {};
      let danglingSum = 0.0;

      // Account for nodes without outgoing links
      nodes.forEach(id => {
        if (outWeights[id] === 0) {
          danglingSum += ranks[id];
        }
      });

      nodes.forEach(id => {
        let incomingSum = 0.0;
        incomingAdjacency[id].forEach(edge => {
          incomingSum += ranks[edge.src] * (edge.w / outWeights[edge.src]);
        });

        // PR formula
        nextRanks[id] = ((1 - damping) / N) + damping * (incomingSum + (danglingSum / N));
      });

      ranks = nextRanks;
    }

    // 4. Batch update ranks back into DB
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      for (const id of nodes) {
        const val = ranks[id];
        await client.query(
          `UPDATE graph_nodes 
           SET properties = jsonb_set(COALESCE(properties, '{}'::jsonb), '{reputation_score}', $2::text::jsonb) 
           WHERE id = $1`,
          [id, val.toFixed(6)]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return res.json({ success: true, message: 'PageRank computed successfully', node_count: N });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /workspace/escrows/:startupId - Get active escrows and milestones for a startup
router.get('/workspace/escrows/:startupId', authenticate, async (req, res) => {
  try {
    const { startupId } = req.params;
    
    // Find the startup's graph node ID first
    let nodeRes = await db.query(
      `SELECT id FROM graph_nodes WHERE entity_type = 'startup' AND (properties->>'startup_id') = $1`,
      [startupId]
    );

    if (!nodeRes.rows.length) {
      // Self-healing: if the startup exists in the startups table, create a graph node for it
      const startupCheck = await db.query('SELECT name FROM startups WHERE id = $1', [startupId]);
      if (startupCheck.rows.length) {
        const startupName = startupCheck.rows[0].name;
        const insertNode = await db.query(
          `INSERT INTO graph_nodes (entity_type, properties, created_at)
           VALUES ($1, $2, NOW()) RETURNING id`,
          ['startup', JSON.stringify({ startup_id: startupId, name: startupName })]
        );
        nodeRes = insertNode;
      } else {
        return res.json({ success: true, data: [] });
      }
    }

    const startupNodeId = nodeRes.rows[0].id;

    // Fetch active escrows and their milestones
    const { rows } = await db.query(
      `SELECT e.*, 
              (SELECT json_agg(m.* ORDER BY m.milestone_index) 
               FROM escrow_milestones_v4 m 
               WHERE m.escrow_id = e.id) as milestones
       FROM platform_escrows_v4 e
       WHERE e.startup_node_id = $1
       ORDER BY e.created_at DESC`,
      [startupNodeId]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
