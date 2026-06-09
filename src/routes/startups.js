import express from 'express';
import { db, cacheGet, cacheSet, cacheDel } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { startupProfileSchema, investorProfileSchema } from '../schemas/startup.schema.js';
import { generateEmbedding, formatStartupText, formatInvestorText } from '../utils/embeddings.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const startupsRouter = express.Router();
const investorsRouter = express.Router();
const matchesRouter = express.Router();

/* ============================================================
   STARTUP ROUTES
   ============================================================ */

// GET /api/v1/startups — list with filters
startupsRouter.get('/', authenticate, async (req, res) => {
  try {
    const { sector, country, stage, page = 1, limit = 20, q } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['s.status = $1'];
    const params = ['active'];
    let pi = 2;

    if (sector) {
      conditions.push(`s.sector = $${pi++}`);
      params.push(sector);
    }
    if (country) {
      conditions.push(`s.country = $${pi++}`);
      params.push(country);
    }
    if (stage) {
      conditions.push(`s.stage = $${pi++}`);
      params.push(stage);
    }
    if (q) {
      conditions.push(`s.name ILIKE $${pi++}`);
      params.push(`%${q}%`);
    }

    const where = conditions.join(' AND ');
    const { rows } = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.avatar_url as founder_avatar
       FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE ${where} ORDER BY s.created_at DESC LIMIT $${pi++} OFFSET $${pi}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM startups s WHERE ${where}`,
      params
    );

    return res.json({
      success: true,
      data: rows,
      total: parseInt(count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/startups/:id
startupsRouter.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT s.*, u.first_name, u.last_name, u.email as founder_email, u.avatar_url as founder_avatar,
        (SELECT json_agg(t) FROM startup_team t WHERE t.startup_id = s.id) as team
       FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE s.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Startup not found' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/startups — create/update startup profile
startupsRouter.post('/', authenticate, authorize('startup'), validate(startupProfileSchema), async (req, res) => {
  try {
    const updates = req.body;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    if (updates.name) {
      updates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE startups SET ${sets}, updated_at = NOW() WHERE founder_id = $1 RETURNING *`,
      [req.user.userId, ...Object.values(updates)]
    );

    await cacheDel(`user:${req.user.userId}`);

    // Asynchronously compute and update dense vector embedding in the background
    if (rows.length) {
      (async () => {
        try {
          const startup = rows[0];
          console.log(`[Embeddings Hook] Generating embedding for startup: "${startup.name}"...`);
          const text = formatStartupText(startup);
          const embedding = await generateEmbedding(text);
          const pgVector = `[${embedding.join(',')}]`;
          await db.query('UPDATE startups SET embedding = $1 WHERE id = $2', [pgVector, startup.id]);
          console.log(`[Embeddings Hook] Successfully updated embedding for startup: "${startup.name}"`);
        } catch (err) {
          console.error('[Embeddings Hook] Startup vector generation failed:', err.message);
        }
      })();
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   INVESTOR ROUTES
   ============================================================ */

// POST /api/v1/investors — create/update investor profile
investorsRouter.post('/', authenticate, authorize('investor'), validate(investorProfileSchema), async (req, res) => {
  try {
    const updates = req.body;
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const sets = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE investors SET ${sets}, updated_at = NOW() WHERE user_id = $1 RETURNING *`,
      [req.user.userId, ...Object.values(updates)]
    );

    await cacheDel(`user:${req.user.userId}`);

    // Asynchronously compute and update dense vector embedding in the background
    if (rows.length) {
      (async () => {
        try {
          const investor = rows[0];
          console.log(`[Embeddings Hook] Generating embedding for investor firm: "${investor.firm_name}"...`);
          const text = formatInvestorText(investor);
          const embedding = await generateEmbedding(text);
          const pgVector = `[${embedding.join(',')}]`;
          await db.query('UPDATE investors SET embedding = $1 WHERE id = $2', [pgVector, investor.id]);
          console.log(`[Embeddings Hook] Successfully updated embedding for investor firm: "${investor.firm_name}"`);
        } catch (err) {
          console.error('[Embeddings Hook] Investor vector generation failed:', err.message);
        }
      })();
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   MATCH ROUTES
   ============================================================ */

const MATCHING_SYSTEM = `You are HopeFusion Africa's AI matching engine.
Your job is to evaluate compatibility between startups and investors/mentors.
You understand the African startup ecosystem deeply — its funding landscape,
regulatory environments across 14 countries, cultural contexts, and the SDG
priorities that drive impact investment on the continent.

Always respond with valid JSON only. No markdown, no prose outside the JSON.`;

function parseAIResponse(content) {
  const text = content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// GET /api/v1/matches/my — get my AI matches
matchesRouter.get('/my', authenticate, async (req, res) => {
  try {
    const { status, min_score = 0, limit = 5 } = req.query;
    const { role, userId } = req.user;
    
    const cacheKey = `matches:${userId}:${role}:${status}:${min_score}:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    let dbMatches = [];

    if (role === 'startup') {
      // 1. Fetch startup profile
      const startupRes = await db.query('SELECT * FROM startups WHERE founder_id = $1', [userId]);
      if (!startupRes.rows.length) {
        return res.status(404).json({ error: 'Startup profile not found' });
      }
      const startup = startupRes.rows[0];

      // 2. Generate startup embedding on-the-fly if missing
      let startupEmbedding = startup.embedding;
      if (!startupEmbedding) {
        console.log(`[Matches Router] Startup "${startup.name}" has no embedding. Generating on-the-fly...`);
        try {
          const text = formatStartupText(startup);
          const embArr = await generateEmbedding(text);
          startupEmbedding = `[${embArr.join(',')}]`;
          await db.query('UPDATE startups SET embedding = $1 WHERE id = $2', [startupEmbedding, startup.id]);
        } catch (err) {
          console.error('[Matches Router] Startup embedding generation failed, using fallback similarity:', err.message);
        }
      }

      // 3. Find closest investors using pgvector cosine distance
      let topInvestors = [];
      if (startupEmbedding) {
        const queryRes = await db.query(
          `SELECT i.*, u.first_name, u.last_name, u.avatar_url,
                  (i.embedding <=> $1) as distance
           FROM investors i
           JOIN users u ON u.id = i.user_id
           WHERE i.embedding IS NOT NULL
           ORDER BY i.embedding <=> $1 ASC
           LIMIT $2`,
          [startupEmbedding, parseInt(limit)]
        );
        topInvestors = queryRes.rows;
      } else {
        // Fallback: simple retrieve of active verified investors
        const queryRes = await db.query(
          `SELECT i.*, u.first_name, u.last_name, u.avatar_url, 0.5 as distance
           FROM investors i
           JOIN users u ON u.id = i.user_id
           LIMIT $1`,
          [parseInt(limit)]
        );
        topInvestors = queryRes.rows;
      }

      // 4. Calculate Claude matching scores for the top investors in parallel
      const matchPromises = topInvestors.map(async (investor) => {
        const existing = await db.query(
          'SELECT * FROM matches WHERE startup_id = $1 AND target_id = $2 AND target_type = $3',
          [startup.id, investor.id, 'investor']
        );
        
        if (existing.rows.length) {
          const matchRow = existing.rows[0];
          matchRow.investor_detail = {
            firm: investor.firm_name,
            type: investor.investor_type,
            sectors: investor.sectors,
            first_name: investor.first_name,
            last_name: investor.last_name,
            avatar: investor.avatar_url
          };
          return matchRow;
        }

        // On-the-fly calculation
        try {
          console.log(`[Matches Router] Running Claude matching evaluation for startup "${startup.name}" and investor "${investor.firm_name}"...`);
          
          const prompt = `Evaluate the compatibility between this startup and investor for HopeFusion Africa.

STARTUP PROFILE:
${JSON.stringify({
  name: startup.name,
  tagline: startup.tagline,
  description: startup.description,
  sector: startup.sector,
  stage: startup.stage,
  country: startup.country,
  funding_goal: startup.funding_goal,
  sdgs: startup.sdgs
}, null, 2)}

INVESTOR PROFILE:
${JSON.stringify({
  firm_name: investor.firm_name,
  investor_type: investor.investor_type,
  thesis: investor.thesis,
  sectors: investor.sectors,
  stages: investor.stages,
  countries: investor.countries,
  ticket_min: investor.ticket_min,
  ticket_max: investor.ticket_max,
  sdgs: investor.sdgs
}, null, 2)}

Return a JSON object with exactly this structure:
{
  "score": <integer 0-100>,
  "grade": <"Excellent" | "Strong" | "Good" | "Fair" | "Poor">,
  "reasons": [<3-5 specific reasons why they match or don't>],
  "strengths": [<2-4 strongest compatibility points>],
  "concerns": [<1-3 potential misalignments or risks>],
  "recommendation": <1-2 sentence plain-English summary>,
  "next_steps": [<2-3 concrete actions to move forward>],
  "sdg_alignment": <integer 0-100>,
  "sector_fit": <integer 0-100>,
  "stage_fit": <integer 0-100>,
  "geography_fit": <integer 0-100>,
  "ticket_fit": <integer 0-100>
}`;

          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            system: MATCHING_SYSTEM,
            messages: [{ role: 'user', content: prompt }]
          });

          const result = parseAIResponse(response.content);
          
          const insertRes = await db.query(
            `INSERT INTO matches (startup_id, target_id, target_type, ai_score, ai_grade, ai_reasons, ai_breakdown)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (startup_id, target_id, target_type) DO UPDATE
             SET ai_score = EXCLUDED.ai_score, ai_grade = EXCLUDED.ai_grade,
                 ai_reasons = EXCLUDED.ai_reasons, ai_breakdown = EXCLUDED.ai_breakdown, updated_at = NOW()
             RETURNING *`,
            [startup.id, investor.id, 'investor', result.score, result.grade, result.reasons, JSON.stringify(result)]
          );
          
          const newMatch = insertRes.rows[0];
          newMatch.investor_detail = {
            firm: investor.firm_name,
            type: investor.investor_type,
            sectors: investor.sectors,
            first_name: investor.first_name,
            last_name: investor.last_name,
            avatar: investor.avatar_url
          };
          return newMatch;
        } catch (err) {
          console.error(`[Matches Router] Claude match failed for investor "${investor.firm_name}":`, err.message);
          // Fallback static match record using vector distance similarity score
          const distanceVal = parseFloat(investor.distance || 0.5);
          const scoreVal = Math.round((1 - distanceVal) * 100);
          const gradeVal = scoreVal >= 85 ? 'Excellent' : scoreVal >= 70 ? 'Strong' : 'Good';
          
          return {
            id: null,
            startup_id: startup.id,
            target_id: investor.id,
            target_type: 'investor',
            ai_score: scoreVal,
            ai_grade: gradeVal,
            ai_reasons: ['Cosine similarity match based on profile contexts.'],
            ai_breakdown: {},
            status: 'pending',
            investor_detail: {
              firm: investor.firm_name,
              type: investor.investor_type,
              sectors: investor.sectors,
              first_name: investor.first_name,
              last_name: investor.last_name,
              avatar: investor.avatar_url
            }
          };
        }
      });

      dbMatches = await Promise.all(matchPromises);

    } else if (role === 'investor') {
      // 1. Fetch investor profile
      const investorRes = await db.query('SELECT * FROM investors WHERE user_id = $1', [userId]);
      if (!investorRes.rows.length) {
        return res.status(404).json({ error: 'Investor profile not found' });
      }
      const investor = investorRes.rows[0];

      // 2. Generate investor embedding on-the-fly if missing
      let investorEmbedding = investor.embedding;
      if (!investorEmbedding) {
        console.log(`[Matches Router] Investor firm "${investor.firm_name}" has no embedding. Generating on-the-fly...`);
        try {
          const text = formatInvestorText(investor);
          const embArr = await generateEmbedding(text);
          investorEmbedding = `[${embArr.join(',')}]`;
          await db.query('UPDATE investors SET embedding = $1 WHERE id = $2', [investorEmbedding, investor.id]);
        } catch (err) {
          console.error('[Matches Router] Investor embedding generation failed:', err.message);
        }
      }

      // 3. Find closest startups using pgvector cosine distance
      let topStartups = [];
      if (investorEmbedding) {
        const queryRes = await db.query(
          `SELECT s.*, u.first_name, u.last_name, u.avatar_url,
                  (s.embedding <=> $1) as distance
           FROM startups s
           JOIN users u ON u.id = s.founder_id
           WHERE s.embedding IS NOT NULL AND s.status = 'active'
           ORDER BY s.embedding <=> $1 ASC
           LIMIT $2`,
          [investorEmbedding, parseInt(limit)]
        );
        topStartups = queryRes.rows;
      } else {
        const queryRes = await db.query(
          `SELECT s.*, u.first_name, u.last_name, u.avatar_url, 0.5 as distance
           FROM startups s
           JOIN users u ON u.id = s.founder_id
           WHERE s.status = 'active'
           LIMIT $1`,
          [parseInt(limit)]
        );
        topStartups = queryRes.rows;
      }

      // 4. Calculate Claude matching scores for the top startups in parallel
      const matchPromises = topStartups.map(async (startup) => {
        const existing = await db.query(
          'SELECT * FROM matches WHERE startup_id = $1 AND target_id = $2 AND target_type = $3',
          [startup.id, investor.id, 'investor']
        );
        
        if (existing.rows.length) {
          const matchRow = existing.rows[0];
          matchRow.startup_detail = {
            name: startup.name,
            tagline: startup.tagline,
            sector: startup.sector,
            stage: startup.stage,
            country: startup.country,
            first_name: startup.first_name,
            last_name: startup.last_name,
            avatar: startup.avatar_url
          };
          return matchRow;
        }

        // On-the-fly calculation
        try {
          console.log(`[Matches Router] Running Claude matching evaluation for startup "${startup.name}" and investor "${investor.firm_name}"...`);
          
          const prompt = `Evaluate the compatibility between this startup and investor for HopeFusion Africa.

STARTUP PROFILE:
${JSON.stringify({
  name: startup.name,
  tagline: startup.tagline,
  description: startup.description,
  sector: startup.sector,
  stage: startup.stage,
  country: startup.country,
  funding_goal: startup.funding_goal,
  sdgs: startup.sdgs
}, null, 2)}

INVESTOR PROFILE:
${JSON.stringify({
  firm_name: investor.firm_name,
  investor_type: investor.investor_type,
  thesis: investor.thesis,
  sectors: investor.sectors,
  stages: investor.stages,
  countries: investor.countries,
  ticket_min: investor.ticket_min,
  ticket_max: investor.ticket_max,
  sdgs: investor.sdgs
}, null, 2)}

Return a JSON object with exactly this structure:
{
  "score": <integer 0-100>,
  "grade": <"Excellent" | "Strong" | "Good" | "Fair" | "Poor">,
  "reasons": [<3-5 specific reasons why they match or don't>],
  "strengths": [<2-4 strongest compatibility points>],
  "concerns": [<1-3 potential misalignments or risks>],
  "recommendation": <1-2 sentence plain-English summary>,
  "next_steps": [<2-3 concrete actions to move forward>],
  "sdg_alignment": <integer 0-100>,
  "sector_fit": <integer 0-100>,
  "stage_fit": <integer 0-100>,
  "geography_fit": <integer 0-100>,
  "ticket_fit": <integer 0-100>
}`;

          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            system: MATCHING_SYSTEM,
            messages: [{ role: 'user', content: prompt }]
          });

          const result = parseAIResponse(response.content);
          
          const insertRes = await db.query(
            `INSERT INTO matches (startup_id, target_id, target_type, ai_score, ai_grade, ai_reasons, ai_breakdown)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (startup_id, target_id, target_type) DO UPDATE
             SET ai_score = EXCLUDED.ai_score, ai_grade = EXCLUDED.ai_grade,
                 ai_reasons = EXCLUDED.ai_reasons, ai_breakdown = EXCLUDED.ai_breakdown, updated_at = NOW()
             RETURNING *`,
            [startup.id, investor.id, 'investor', result.score, result.grade, result.reasons, JSON.stringify(result)]
          );
          
          const newMatch = insertRes.rows[0];
          newMatch.startup_detail = {
            name: startup.name,
            tagline: startup.tagline,
            sector: startup.sector,
            stage: startup.stage,
            country: startup.country,
            first_name: startup.first_name,
            last_name: startup.last_name,
            avatar: startup.avatar_url
          };
          return newMatch;
        } catch (err) {
          console.error(`[Matches Router] Claude match failed for startup "${startup.name}":`, err.message);
          const distanceVal = parseFloat(startup.distance || 0.5);
          const scoreVal = Math.round((1 - distanceVal) * 100);
          const gradeVal = scoreVal >= 85 ? 'Excellent' : scoreVal >= 70 ? 'Strong' : 'Good';
          
          return {
            id: null,
            startup_id: startup.id,
            target_id: investor.id,
            target_type: 'investor',
            ai_score: scoreVal,
            ai_grade: gradeVal,
            ai_reasons: ['Cosine similarity match based on profile contexts.'],
            ai_breakdown: {},
            status: 'pending',
            startup_detail: {
              name: startup.name,
              tagline: startup.tagline,
              sector: startup.sector,
              stage: startup.stage,
              country: startup.country,
              first_name: startup.first_name,
              last_name: startup.last_name,
              avatar: startup.avatar_url
            }
          };
        }
      });

      dbMatches = await Promise.all(matchPromises);
    } else {
      // Fallback simple retrieval for mentors/admins
      const { rows } = await db.query(
        `SELECT m.*, 
          CASE WHEN m.target_type='investor' THEN (
            SELECT json_build_object('firm',i.firm_name,'type',i.investor_type,'sectors',i.sectors,
              'first_name',u.first_name,'last_name',u.last_name,'avatar',u.avatar_url)
            FROM investors i JOIN users u ON u.id=i.user_id WHERE i.id=m.target_id
          ) END as investor_detail
         FROM matches m WHERE m.ai_score >= $1 LIMIT $2`,
        [parseInt(min_score), parseInt(limit)]
      );
      dbMatches = rows;
    }

    // Sort by AI score descending
    dbMatches.sort((a, b) => b.ai_score - a.ai_score);

    await cacheSet(cacheKey, dbMatches, 120);
    return res.json({ success: true, data: dbMatches, count: dbMatches.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/matches/:id/status
matchesRouter.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['viewed', 'contacted', 'meeting_scheduled', 'invested', 'declined', 'saved'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${valid.join(', ')}` });
    }

    await db.query('UPDATE matches SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
    return res.json({ success: true, message: 'Match status updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export { startupsRouter, investorsRouter, matchesRouter };
