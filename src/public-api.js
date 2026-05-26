/**
 * HopeFusion Africa — Public API + Developer Portal
 * RESTful public API for third-party integrations
 * Partners: iHub, MEST, government ministries, accelerators
 * Install: npm install express-rate-limit swagger-ui-express yamljs
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import pg from 'pg';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const { Pool } = pg;
const db = new Pool({ connectionString: process.env.DATABASE_URL });

/* ============================================================
   API KEY MANAGEMENT
   ============================================================ */

// Generate API key
function generateApiKey() {
  return 'hfa_' + crypto.randomBytes(32).toString('hex');
}

// Hash API key for storage
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// API key auth middleware
async function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key) return res.status(401).json({ error: 'API key required', docs: 'https://api.hopefusionafrica.com/docs' });

  const hash = hashKey(key);
  const { rows } = await db.query(
    `SELECT ak.*, u.id as user_id, u.role, u.first_name, u.last_name
     FROM api_keys ak JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = $1 AND ak.is_active = TRUE`,
    [hash]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid or inactive API key' });

  const apiKey = rows[0];

  // Check if key has expired
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return res.status(401).json({ error: 'API key expired. Generate a new key at https://hopefusionafrica.com/settings/api' });
  }

  // Update last used
  await db.query('UPDATE api_keys SET last_used_at = NOW(), request_count = request_count + 1 WHERE id = $1', [apiKey.id]);

  req.apiKey   = apiKey;
  req.apiUser  = { id: apiKey.user_id, role: apiKey.role, name: `${apiKey.first_name} ${apiKey.last_name}` };
  req.apiScope = apiKey.scopes || [];
  next();
}

// Scope check middleware
function requireScope(...scopes) {
  return (req, res, next) => {
    const hasScope = scopes.some(s => req.apiScope.includes(s) || req.apiScope.includes('*'));
    if (!hasScope) {
      return res.status(403).json({
        error: `Insufficient scope. Required: ${scopes.join(' or ')}`,
        your_scopes: req.apiScope,
        docs: 'https://api.hopefusionafrica.com/docs#authentication',
      });
    }
    next();
  };
}

// Rate limiting tiers
const freeTierLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 100, message: { error: 'Rate limit exceeded. Free tier: 100 req/hour. Upgrade at hopefusionafrica.com/pricing' } });
const proTierLimit  = rateLimit({ windowMs: 60 * 60 * 1000, max: 5000, message: { error: 'Rate limit exceeded. Pro tier: 5000 req/hour.' } });

// Apply API key auth to all public API routes
router.use(apiKeyAuth);
router.use(freeTierLimit);

/* ============================================================
   API VERSIONING HEADER
   ============================================================ */
router.use((req, res, next) => {
  res.setHeader('X-HFA-API-Version', 'v1');
  res.setHeader('X-HFA-Request-ID', crypto.randomUUID());
  res.setHeader('X-HFA-Rate-Limit-Tier', req.apiKey?.tier || 'free');
  next();
});

/* ============================================================
   v1/startups
   ============================================================ */

// GET /v1/startups — list startups
router.get('/v1/startups', requireScope('startups:read', 'startups:*', '*'), async (req, res) => {
  try {
    const {
      sector, country, stage, is_women_led, is_verified,
      min_mrr, max_ask, sdg, page = 1, limit = 20, q, sort = 'created_at'
    } = req.query;

    const limitNum  = Math.min(parseInt(limit) || 20, 100);
    const offset    = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;
    const conditions = ['s.status = $1'];
    const params    = ['active'];
    let pi = 2;

    if (sector)       { conditions.push(`s.sector = $${pi++}`);                     params.push(sector); }
    if (country)      { conditions.push(`s.country = $${pi++}`);                    params.push(country); }
    if (stage)        { conditions.push(`s.stage = $${pi++}`);                      params.push(stage); }
    if (is_women_led) { conditions.push(`s.is_women_led = $${pi++}`);               params.push(is_women_led === 'true'); }
    if (is_verified)  { conditions.push(`s.is_verified = $${pi++}`);                params.push(is_verified === 'true'); }
    if (min_mrr)      { conditions.push(`s.mrr >= $${pi++}`);                       params.push(parseInt(min_mrr)); }
    if (max_ask)      { conditions.push(`s.funding_goal <= $${pi++}`);              params.push(parseInt(max_ask)); }
    if (sdg)          { conditions.push(`$${pi++} = ANY(s.sdgs)`);                  params.push(parseInt(sdg)); }
    if (q)            { conditions.push(`(s.name ILIKE $${pi++} OR s.tagline ILIKE $${pi++})`); params.push(`%${q}%`, `%${q}%`); pi++; }

    const sortMap = { created_at: 's.created_at', mrr: 's.mrr', funding_goal: 's.funding_goal', name: 's.name' };
    const sortCol = sortMap[sort] || 's.created_at';

    const { rows } = await db.query(
      `SELECT s.id, s.name, s.slug, s.tagline, s.sector, s.country, s.city, s.stage,
              s.team_size, s.funding_goal, s.mrr, s.customers, s.sdgs, s.is_women_led,
              s.is_verified, s.logo_url, s.website_url, s.created_at,
              u.first_name as founder_first, u.last_name as founder_last
       FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY ${sortCol} DESC
       LIMIT $${pi++} OFFSET $${pi}`,
      [...params, limitNum, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM startups s WHERE ${conditions.join(' AND ')}`,
      params.slice(0, params.length)
    );

    res.json({
      object:   'list',
      data:     rows,
      meta: {
        total:       parseInt(count),
        page:        parseInt(page),
        limit:       limitNum,
        total_pages: Math.ceil(parseInt(count) / limitNum),
        has_more:    offset + limitNum < parseInt(count),
      },
      api_version: 'v1',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/startups/:id
router.get('/v1/startups/:id', requireScope('startups:read', '*'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.*, u.first_name as founder_first, u.last_name as founder_last,
              u.linkedin_url as founder_linkedin,
              (SELECT json_agg(t) FROM startup_team t WHERE t.startup_id = s.id) as team
       FROM startups s JOIN users u ON u.id = s.founder_id
       WHERE s.id = $1 OR s.slug = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Startup not found' });
    res.json({ object: 'startup', data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   v1/investors
   ============================================================ */

router.get('/v1/investors', requireScope('investors:read', '*'), async (req, res) => {
  try {
    const { type, sector, country, min_ticket, max_ticket, sdg, page = 1, limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 50);
    const offset   = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;
    const conditions = ['i.is_verified = TRUE'];
    const params    = [];
    let pi = 1;
    if (type)       { conditions.push(`i.investor_type = $${pi++}`);     params.push(type); }
    if (sector)     { conditions.push(`$${pi++} = ANY(i.sectors)`);      params.push(sector); }
    if (country)    { conditions.push(`$${pi++} = ANY(i.countries)`);    params.push(country); }
    if (min_ticket) { conditions.push(`i.ticket_max >= $${pi++}`);       params.push(parseInt(min_ticket)); }
    if (max_ticket) { conditions.push(`i.ticket_min <= $${pi++}`);       params.push(parseInt(max_ticket)); }
    if (sdg)        { conditions.push(`$${pi++} = ANY(i.sdgs)`);         params.push(parseInt(sdg)); }

    const { rows } = await db.query(
      `SELECT i.id, i.firm_name, i.investor_type, i.sectors, i.stages, i.countries,
              i.sdgs, i.ticket_min, i.ticket_max, i.instruments, i.portfolio_count,
              u.first_name, u.last_name, u.avatar_url, u.linkedin_url
       FROM investors i JOIN users u ON u.id = i.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY i.portfolio_count DESC LIMIT $${pi++} OFFSET $${pi}`,
      [...params, limitNum, offset]
    );
    res.json({ object: 'list', data: rows, meta: { page: parseInt(page), limit: limitNum } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   v1/mentors
   ============================================================ */

router.get('/v1/mentors', requireScope('mentors:read', '*'), async (req, res) => {
  try {
    const { expertise, country, language, available, limit = 20 } = req.query;
    const { rows } = await db.query(
      `SELECT m.id, m.expertise, m.industries, m.countries, m.languages,
              m.session_types, m.hourly_rate, m.avg_rating, m.rating_count,
              m.total_sessions, m.is_available, m.bio_extended,
              u.first_name, u.last_name, u.avatar_url, u.linkedin_url
       FROM mentors m JOIN users u ON u.id = m.user_id
       WHERE m.is_available = TRUE AND m.is_verified = TRUE
       ORDER BY m.avg_rating DESC NULLS LAST, m.total_sessions DESC
       LIMIT $1`,
      [Math.min(parseInt(limit) || 20, 50)]
    );
    res.json({ object: 'list', data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   v1/matches — retrieve AI matches for a startup
   ============================================================ */

router.get('/v1/matches', requireScope('matches:read', '*'), async (req, res) => {
  try {
    const { startup_id, min_score = 70, target_type, status, limit = 20 } = req.query;
    if (!startup_id) return res.status(400).json({ error: 'startup_id is required' });

    const { rows } = await db.query(
      `SELECT m.id, m.startup_id, m.target_id, m.target_type, m.ai_score,
              m.ai_grade, m.ai_reasons, m.ai_breakdown, m.status, m.created_at
       FROM matches m
       WHERE m.startup_id = $1 AND m.ai_score >= $2
         ${target_type ? `AND m.target_type = '${target_type}'` : ''}
         ${status ? `AND m.status = '${status}'` : ''}
       ORDER BY m.ai_score DESC LIMIT $3`,
      [startup_id, parseInt(min_score), Math.min(parseInt(limit) || 20, 100)]
    );
    res.json({ object: 'list', data: rows, count: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   v1/grants — public grant programmes
   ============================================================ */

router.get('/v1/grants', requireScope('grants:read', '*'), async (req, res) => {
  try {
    const { sector, country, min_amount, max_amount, page = 1, limit = 20 } = req.query;
    // In production: query grants table. For now return structured mock.
    res.json({
      object: 'list',
      data: [
        { id: 'grant_001', name: 'Tony Elumelu Foundation Grant', organisation: 'Tony Elumelu Foundation', amount_usd: 25000, deadline: '2026-05-28', region: 'Pan-African', sectors: ['all'], stage: ['idea','mvp'], type: 'non_dilutive', success_rate: 0.12, url: 'https://tefoundation.com' },
        { id: 'grant_002', name: 'World Bank Climate Innovation Grant', organisation: 'World Bank Group', amount_usd: 150000, deadline: '2026-06-15', region: 'Sub-Saharan Africa', sectors: ['cleantech','agritech'], stage: ['mvp','early_traction'], type: 'non_dilutive', success_rate: 0.08, url: 'https://worldbank.org' },
        { id: 'grant_003', name: 'GIZ Digital Transformation Grant', organisation: 'GIZ Africa', amount_usd: 80000, deadline: '2026-07-30', region: 'Pan-African', sectors: ['agritech','healthtech','edtech'], stage: ['mvp','early_traction','growth'], type: 'non_dilutive', success_rate: 0.15 },
        { id: 'grant_004', name: 'Mastercard Foundation Young Africa Works', organisation: 'Mastercard Foundation', amount_usd: 200000, deadline: '2026-08-15', region: 'West & East Africa', sectors: ['all'], stage: ['early_traction','growth'], type: 'non_dilutive', success_rate: 0.05 },
      ],
      meta: { total: 47, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   v1/platform/stats — public platform statistics
   ============================================================ */

router.get('/v1/platform/stats', async (req, res) => {
  try {
    const [users, startups, matches, funding] = await Promise.all([
      db.query("SELECT COUNT(*) FROM users WHERE is_active=TRUE"),
      db.query("SELECT COUNT(*) FROM startups WHERE status='active'"),
      db.query("SELECT COUNT(*), AVG(ai_score) as avg_score FROM matches"),
      db.query("SELECT SUM(awarded_amount) as total FROM grant_applications WHERE status='awarded'"),
    ]);
    res.json({
      object: 'platform_stats',
      data: {
        total_users:         parseInt(users.rows[0].count),
        total_startups:      parseInt(startups.rows[0].count),
        total_matches:       parseInt(matches.rows[0].count),
        avg_match_score:     parseFloat(matches.rows[0].avg_score || 0).toFixed(1),
        total_grants_awarded_usd: parseInt(funding.rows[0].total || 0),
        countries_covered:   14,
        sdgs_addressed:      9,
        updated_at:          new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   v1/webhooks — register webhook endpoints
   ============================================================ */

router.post('/v1/webhooks', requireScope('webhooks:write', '*'), async (req, res) => {
  try {
    const { url, events, secret } = req.body;
    const validEvents = ['startup.created','match.generated','grant.submitted','grant.awarded','investment.completed','session.scheduled'];
    if (!url) return res.status(400).json({ error: 'url required' });
    const invalidEvents = (events || []).filter(e => !validEvents.includes(e));
    if (invalidEvents.length) return res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}`, valid_events: validEvents });

    const webhookId = 'whk_' + crypto.randomBytes(12).toString('hex');
    res.status(201).json({
      object:   'webhook',
      data: {
        id:        webhookId,
        url,
        events:    events || validEvents,
        secret:    secret || 'whsec_' + crypto.randomBytes(24).toString('hex'),
        is_active: true,
        created_at: new Date().toISOString(),
      },
      message: 'Webhook registered. We will POST to your URL on each event with an X-HFA-Signature header.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   API KEY MANAGEMENT ROUTES (authenticated user routes)
   ============================================================ */

export function apiKeyManagementRouter(authenticate) {
  const mgmt = express.Router();
  mgmt.use(authenticate);

  // Create API key
  mgmt.post('/api/developer/keys', async (req, res) => {
    try {
      const { name, scopes = ['startups:read','investors:read'], expires_days } = req.body;
      if (!name) return res.status(400).json({ error: 'name required' });
      const key     = generateApiKey();
      const hash    = hashKey(key);
      const expiresAt = expires_days ? new Date(Date.now() + expires_days * 86400000) : null;

      await db.query(
        `INSERT INTO api_keys (user_id, name, key_hash, scopes, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.userId, name, hash, scopes, expiresAt]
      );

      res.status(201).json({
        success: true,
        data: {
          key,    // Only shown once — user must copy it now
          name,
          scopes,
          expires_at: expiresAt,
          warning: 'Copy this key now. It will not be shown again.',
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // List API keys
  mgmt.get('/api/developer/keys', async (req, res) => {
    try {
      const { rows } = await db.query(
        `SELECT id, name, scopes, tier, is_active, last_used_at, request_count, expires_at, created_at
         FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
        [req.user.userId]
      );
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Revoke API key
  mgmt.delete('/api/developer/keys/:keyId', async (req, res) => {
    try {
      await db.query('UPDATE api_keys SET is_active = FALSE WHERE id = $1 AND user_id = $2', [req.params.keyId, req.user.userId]);
      res.json({ success: true, message: 'API key revoked' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return mgmt;
}

/* ============================================================
   WEBHOOK DELIVERY HELPER
   Call this from your route handlers to notify webhooks
   ============================================================ */

export async function deliverWebhook(event, data) {
  try {
    const { rows: hooks } = await db.query(
      "SELECT * FROM webhooks WHERE $1 = ANY(events) AND is_active = TRUE",
      [event]
    );
    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    await Promise.allSettled(
      hooks.map(async (hook) => {
        const sig = crypto.createHmac('sha256', hook.secret).update(payload).digest('hex');
        try {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 10000);
          const res = await fetch(hook.url, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-HFA-Signature': `sha256=${sig}`, 'X-HFA-Event': event },
            body:    payload,
            signal:  controller.signal,
          });
          await db.query('UPDATE webhooks SET last_delivered_at = NOW(), delivery_count = delivery_count + 1 WHERE id = $1', [hook.id]);
          console.log(`[Webhook] Delivered ${event} to ${hook.url} — ${res.status}`);
        } catch (err) {
          console.error(`[Webhook] Failed to deliver ${event} to ${hook.url}:`, err.message);
          await db.query('UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = $1', [hook.id]);
        }
      })
    );
  } catch (err) {
    console.error('[Webhook] Delivery error:', err);
  }
}

export const API_SCHEMA = `
-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  key_hash       TEXT UNIQUE NOT NULL,
  scopes         TEXT[] DEFAULT ARRAY['startups:read'],
  tier           TEXT DEFAULT 'free' CHECK (tier IN ('free','pro','enterprise')),
  is_active      BOOLEAN DEFAULT TRUE,
  last_used_at   TIMESTAMPTZ,
  request_count  INTEGER DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash   ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user   ON api_keys(user_id);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  events            TEXT[] NOT NULL,
  secret            TEXT NOT NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  last_delivered_at TIMESTAMPTZ,
  delivery_count    INTEGER DEFAULT 0,
  failure_count     INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
`;

export default router;
