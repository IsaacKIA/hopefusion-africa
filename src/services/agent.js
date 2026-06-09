/**
 * HopeFusion Africa — Proactive AI Agent Service
 * Handles background sweeps, self-healing vector calculations, and real-time Socket.io match alerts.
 */

import { db } from '../config/db.js';
import { generateEmbedding, formatStartupText, formatInvestorText } from '../utils/embeddings.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MATCHING_SYSTEM = `You are HopeFusion Africa's AI matching engine.
Your job is to evaluate compatibility between startups and investors/mentors.
You understand the African startup ecosystem deeply — its funding landscape,
regulatory environments across 14 countries, cultural contexts, and the SDG
priorities that drive impact investment on the continent.

Always respond with valid JSON only. No markdown, no prose outside the JSON.`;

let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;
let anthropicCreditsOk = true; // set to false on credit-exhaustion error

function parseAIResponse(content) {
  const text = content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/**
 * Sweeps and heals embeddings, then pre-computes matching scores and triggers notifications.
 * @param {object} io - Socket.io instance
 */
async function runAgentSweep(io) {
  if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    console.warn('[Proactive Match Agent] Paused due to repeated errors.');
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[Proactive Match Agent] Anthropic API Key missing. Skipping AI-dependent tasks.');
  }

  console.log('[Proactive Match Agent] Executing sweep & vector healing sweep...');

  try {
    // 1. Self-heal startups missing embeddings
    const startupsRes = await db.query('SELECT * FROM startups WHERE embedding IS NULL');
    for (const startup of startupsRes.rows) {
      try {
        console.log(`[Proactive Match Agent] Self-healing startup vector: "${startup.name}"`);
        const text = formatStartupText(startup);
        const embedding = await generateEmbedding(text);
        const pgVector = `[${embedding.join(',')}]`;
        await db.query('UPDATE startups SET embedding = $1 WHERE id = $2', [pgVector, startup.id]);
        console.log(`[Proactive Match Agent] Fixed missing startup embedding: "${startup.name}"`);
      } catch (err) {
        console.error(`[Proactive Match Agent] Startup embedding failed for "${startup.name}":`, err.message);
      }
    }

    // 2. Self-heal investors missing embeddings
    const investorsRes = await db.query('SELECT * FROM investors WHERE embedding IS NULL');
    for (const investor of investorsRes.rows) {
      try {
        console.log(`[Proactive Match Agent] Self-healing investor vector: "${investor.firm_name}"`);
        const text = formatInvestorText(investor);
        const embedding = await generateEmbedding(text);
        const pgVector = `[${embedding.join(',')}]`;
        await db.query('UPDATE investors SET embedding = $1 WHERE id = $2', [pgVector, investor.id]);
        console.log(`[Proactive Match Agent] Fixed missing investor embedding: "${investor.firm_name}"`);
      } catch (err) {
        console.error(`[Proactive Match Agent] Investor embedding failed for "${investor.firm_name}":`, err.message);
      }
    }

    // 3. Proactively pre-calculate matches for high-similarity pairs
    if (process.env.ANTHROPIC_API_KEY && anthropicCreditsOk) {
      const activeStartups = await db.query('SELECT * FROM startups WHERE embedding IS NOT NULL');
      for (const startup of activeStartups.rows) {
        
        // Query top 3 closest investors by cosine distance
        const closestRes = await db.query(
          `SELECT i.*, u.id as user_uid, (i.embedding <=> $1) as distance
           FROM investors i
           JOIN users u ON u.id = i.user_id
           WHERE i.embedding IS NOT NULL
           ORDER BY i.embedding <=> $1 ASC
           LIMIT 3`,
          [startup.embedding]
        );

        for (const investor of closestRes.rows) {
          // Check if matching row already exists
          const matchCheck = await db.query(
            'SELECT * FROM matches WHERE startup_id = $1 AND target_id = $2 AND target_type = $3',
            [startup.id, investor.id, 'investor']
          );

          if (!matchCheck.rows.length) {
            try {
              console.log(`[Proactive Match Agent] Calculating pre-match compatibility: "${startup.name}" + "${investor.firm_name}"`);
              
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

              await db.query(
                `INSERT INTO matches (startup_id, target_id, target_type, ai_score, ai_grade, ai_reasons, ai_breakdown)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [startup.id, investor.id, 'investor', result.score, result.grade, result.reasons, JSON.stringify(result)]
              );

              console.log(`[Proactive Match Agent] Calculated & saved match (${result.score}%) for "${startup.name}"`);

              // If the match is stellar (Excellent/Strong >= 85), push alert notifications
              if (result.score >= 85) {
                const title = `🤖 New Elite Match Found: ${result.score}%`;
                const body = `Awesome news! Oasis Impact Ventures (${investor.firm_name}) has been matches with your crop insurance model. View compatibility reasons now!`;

                // DB notification insert
                await db.query(
                  'INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)',
                  [startup.founder_id, 'new_match', title, body]
                );

                // Live websocket event
                if (io) {
                  io.to(`user:${startup.founder_id}`).emit('notification:new', {
                    type: 'new_match',
                    title,
                    body,
                    created_at: new Date()
                  });
                  console.log(`[Proactive Match Agent] Dispatched live match socket notify to user ${startup.founder_id}`);
                }
              }
              consecutiveErrors = 0;
            } catch (err) {
              if (err.message && err.message.includes('credit balance is too low')) {
                console.warn('[Proactive Match Agent] Anthropic credits exhausted — disabling AI match calculations for this session.');
                anthropicCreditsOk = false;
              } else {
                consecutiveErrors++;
              }
              console.error(`[Proactive Match Agent] Match calculation failed:`, err.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[Proactive Match Agent] Sweep failed:', err.message);
  }
}

/**
 * Starts the match sweeps agent loop
 * @param {object} io - Socket.io instance
 */
export function initAgent(io) {
  console.log('[Proactive Match Agent] Initialized daemon. Sweeps will execute every 30 minutes.');
  
  // Delay first sweep by 90 seconds to let server fully stabilise
  setTimeout(() => {
    runAgentSweep(io).catch(err => console.error('[Proactive Match Agent] Sweep error:', err.message));
  }, 90 * 1000);

  // Run background sweep loop every 30 minutes
  setInterval(() => {
    runAgentSweep(io).catch(err => console.error('[Proactive Match Agent] Sweep error:', err));
  }, 1000 * 60 * 30);
}
