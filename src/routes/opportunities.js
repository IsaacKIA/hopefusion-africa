import express from 'express';
import { db } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';
import { generateEmbedding, formatOpportunityText, formatStartupText } from '../utils/embeddings.js';
import { parseOpportunityWithClaude } from '../services/ingestion.js';

const router = express.Router();

/* ============================================================
   VALIDATION SCHEMAS
   ============================================================ */

const createOpportunitySchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().optional(),
  opportunity_type: z.enum([
    'grant', 'investment', 'job', 'accelerator', 'competition', 
    'scholarship', 'procurement', 'corporate_challenge', 'government_program'
  ]),
  value_amount: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).default('USD'),
  eligible_countries: z.array(z.string()).default([]),
  eligible_sectors: z.array(z.string()).default([]),
  eligible_stages: z.array(z.string()).default([]),
  deadline: z.string().trim().optional().nullable(),
  metadata: z.record(z.any()).default({})
});

const parseTextSchema = z.object({
  raw_text: z.string().trim().min(1, 'raw_text is required')
});

/* ============================================================
   ROUTES
   ============================================================ */

// GET /opportunities/matches - Fetch ranked opportunities for the logged-in startup
router.get('/matches', authenticate, authorize('startup'), async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

    // Get startup profile
    const startupRes = await db.query(
      `SELECT * FROM startups WHERE founder_id = $1`,
      [req.user.userId]
    );

    if (!startupRes.rows.length) {
      return res.status(404).json({ error: 'Startup profile not found for this user' });
    }

    const startup = startupRes.rows[0];

    // Self-heal embedding if missing
    let embedding = startup.embedding;
    if (!embedding) {
      console.log(`[Opportunities Router] Generating missing embedding for startup: "${startup.name}"`);
      const text = formatStartupText(startup);
      const vec = await generateEmbedding(text);
      embedding = `[${vec.join(',')}]`;
      await db.query(
        `UPDATE startups SET embedding = $1 WHERE id = $2`,
        [embedding, startup.id]
      );
    }

    // Call match_opportunities postgres function to fetch matched opportunities with detail
    const { rows } = await db.query(
      `SELECT 
         m.opportunity_id AS id,
         m.title,
         m.raw_similarity,
         m.adjusted_score,
         o.description,
         o.opportunity_type,
         o.value_amount,
         o.currency,
         o.eligible_countries,
         o.eligible_sectors,
         o.eligible_stages,
         o.deadline,
         o.metadata
       FROM match_opportunities($1::vector, $2, $3, $4, $5) m
       JOIN opportunities o ON m.opportunity_id = o.id
       ORDER BY m.adjusted_score DESC`,
      [embedding, startup.country, startup.sector, startup.stage, limit]
    );

    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /opportunities - Create a new opportunity (Admin only)
router.post('/', authenticate, authorize('admin'), validate(createOpportunitySchema), async (req, res) => {
  try {
    const opp = req.body;

    // Generate local 384-dimensional vector embedding
    const formattedText = formatOpportunityText(opp);
    const vec = await generateEmbedding(formattedText);
    const pgVector = `[${vec.join(',')}]`;

    const { rows } = await db.query(
      `INSERT INTO opportunities (
        title, description, opportunity_type, value_amount, currency,
        eligible_countries, eligible_sectors, eligible_stages, deadline,
        embedding, metadata, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING *`,
      [
        opp.title,
        opp.description || null,
        opp.opportunity_type,
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

// GET /opportunities - List all opportunities (general filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const offset = (page - 1) * limit;

    const { type, country, sector, stage } = req.query;
    let queryText = `SELECT id, title, description, opportunity_type, value_amount, currency,
                            eligible_countries, eligible_sectors, eligible_stages, deadline, metadata, created_at
                     FROM opportunities WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (type) {
      queryText += ` AND opportunity_type = $${paramCount++}`;
      params.push(type);
    }
    if (country) {
      queryText += ` AND (eligible_countries ? $${paramCount++} OR eligible_countries ? 'ALL' OR jsonb_array_length(eligible_countries) = 0)`;
      params.push(country);
    }
    if (sector) {
      queryText += ` AND (eligible_sectors ? $${paramCount++} OR eligible_sectors ? 'ALL' OR jsonb_array_length(eligible_sectors) = 0)`;
      params.push(sector);
    }
    if (stage) {
      queryText += ` AND (eligible_stages ? $${paramCount++} OR eligible_stages ? 'ALL' OR jsonb_array_length(eligible_stages) = 0)`;
      params.push(stage);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const { rows } = await db.query(queryText, params);
    return res.json({ success: true, page, limit, count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /opportunities/:id - Get a single opportunity details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT id, title, description, opportunity_type, value_amount, currency,
              eligible_countries, eligible_sectors, eligible_stages, deadline, metadata, created_at
       FROM opportunities WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /opportunities/parse - Parse raw unstructured opportunity text using Claude
router.post('/parse', authenticate, validate(parseTextSchema), async (req, res) => {
  try {
    const { raw_text } = req.body;
    const result = await parseOpportunityWithClaude(raw_text);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
