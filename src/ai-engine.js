/**
 * HopeFusion Africa — AI Engine (Claude API Integration)
 * Backend service: AI matching, pitch analysis, grant eligibility,
 * compliance advisor, recommendation engine, and streaming chat with memory.
 *
 * Stack: Node.js + Express + Anthropic SDK + Redis (ioredis)
 * Install: npm install @anthropic-ai/sdk express cors dotenv multer pdf-parse ioredis
 */

import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

/* ============================================================
   REDIS CLIENT — with in-memory fallback for dev/no-Redis envs
   ============================================================ */
const THREAD_TTL_SECONDS = 60 * 60 * 24; // 24-hour conversation memory
const MAX_HISTORY_TURNS = 20;             // keep last 20 message pairs per thread

/** Simple in-memory store used when Redis is unavailable */
const memoryStore = new Map();

let redisClient = null;
let redisReady = false;

(async () => {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6379' });
    redisClient.on('error', (err) => {
      if (redisReady) console.warn('[AI-Engine] Redis error — falling back to memory store:', err.message);
      redisReady = false;
    });
    redisClient.on('ready', () => {
      redisReady = true;
      console.log('[AI-Engine] Redis connected — chat memory enabled');
    });
    await redisClient.connect();
  } catch (err) {
    console.warn('[AI-Engine] Redis unavailable — using in-memory chat store:', err.message);
    redisReady = false;
  }
})();

/* ============================================================
   THREAD MEMORY HELPERS
   ============================================================ */

/**
 * Retrieve conversation history for a thread.
 * @param {string} threadId
 * @returns {Promise<Array<{role,content}>>}
 */
async function getThreadHistory(threadId) {
  const key = `hfa:thread:${threadId}`;
  try {
    if (redisReady) {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : [];
    }
  } catch (err) {
    console.warn('[AI-Engine] Redis get failed:', err.message);
  }
  return memoryStore.get(key) || [];
}

/**
 * Append user + assistant turns to a thread and persist.
 * Trims history to MAX_HISTORY_TURNS pairs to control token usage.
 * @param {string} threadId
 * @param {string} userMessage
 * @param {string} assistantMessage
 */
async function appendThreadHistory(threadId, userMessage, assistantMessage) {
  const key = `hfa:thread:${threadId}`;
  let history = await getThreadHistory(threadId);

  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'assistant', content: assistantMessage });

  // Trim to the most recent MAX_HISTORY_TURNS pairs (= 2× messages)
  if (history.length > MAX_HISTORY_TURNS * 2) {
    history = history.slice(history.length - MAX_HISTORY_TURNS * 2);
  }

  try {
    if (redisReady) {
      await redisClient.set(key, JSON.stringify(history), { EX: THREAD_TTL_SECONDS });
      return;
    }
  } catch (err) {
    console.warn('[AI-Engine] Redis set failed:', err.message);
  }
  memoryStore.set(key, history);
}

/**
 * Delete (reset) a conversation thread.
 * @param {string} threadId
 */
async function clearThreadHistory(threadId) {
  const key = `hfa:thread:${threadId}`;
  try {
    if (redisReady) await redisClient.del(key);
  } catch (err) {
    console.warn('[AI-Engine] Redis del failed:', err.message);
  }
  memoryStore.delete(key);
}

const app = express();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

/* ============================================================
   SYSTEM PROMPTS
   ============================================================ */

const MATCHING_SYSTEM = `You are HopeFusion Africa's AI matching engine.
Your job is to evaluate compatibility between startups and investors/mentors.
You understand the African startup ecosystem deeply — its funding landscape,
regulatory environments across 14 countries, cultural contexts, and the SDG
priorities that drive impact investment on the continent.

Always respond with valid JSON only. No markdown, no prose outside the JSON.`;

const PITCH_SYSTEM = `You are a world-class startup pitch analyst with deep expertise
in African markets. You have reviewed thousands of pitches for investors including
Tony Elumelu Foundation, Partech Africa, and Novastar Ventures.

You provide specific, actionable feedback — not generic advice.
Focus on what actually matters to African impact investors.
Always respond with valid JSON only. No markdown, no prose outside the JSON.`;

const GRANT_SYSTEM = `You are an expert in African grant programmes and impact funding.
You know every major grant programme active in sub-Saharan Africa, West Africa,
East Africa and North Africa — their eligibility criteria, deadlines, success rates
and what reviewers actually look for.

Always respond with valid JSON only. No markdown, no prose outside the JSON.`;

const COMPLIANCE_SYSTEM = `You are a regulatory compliance advisor specialising in African
business law across Ghana, Nigeria, Kenya, Rwanda, South Africa, Senegal, Ethiopia,
Uganda, Tanzania, Cameroon, Côte d'Ivoire, Egypt, Morocco and Tunisia.

You help startups navigate registration, licensing, tax obligations, data protection
and sector-specific regulations. Provide practical guidance — not just legal disclaimers.
Always flag urgency clearly. Always respond with valid JSON only.`;

const RECOMMENDATION_SYSTEM = `You are HopeFusion Africa's personalisation engine.
You recommend courses, mentors, grants and investors to startups based on their
profile, stage, sector and goals. Your recommendations are specific and ranked.
Always respond with valid JSON only. No markdown, no prose outside the JSON.`;

/* ============================================================
   HELPER: safe JSON parse from Claude response
   ============================================================ */
function parseAIResponse(content) {
  const text = content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/* ============================================================
   1. STARTUP–INVESTOR AI MATCHING
   POST /api/ai/match
   Body: { startup: {...}, investor: {...} }
   Returns: { score, reasons, strengths, concerns, recommendation }
   ============================================================ */
app.post('/api/ai/match', async (req, res) => {
  try {
    const { startup, investor } = req.body;
    if (!startup || !investor) {
      return res.status(400).json({ error: 'startup and investor objects required' });
    }

    const prompt = `Evaluate the compatibility between this startup and investor for HopeFusion Africa.

STARTUP PROFILE:
${JSON.stringify(startup, null, 2)}

INVESTOR PROFILE:
${JSON.stringify(investor, null, 2)}

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

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: MATCHING_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIResponse(response.content);
    res.json({ success: true, data: result, usage: response.usage });

  } catch (err) {
    console.error('Match error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   2. BATCH MATCHING — score startup against multiple investors
   POST /api/ai/match/batch
   Body: { startup: {...}, investors: [...] }
   Returns: { matches: [{investor_id, score, grade, recommendation}] }
   ============================================================ */
app.post('/api/ai/match/batch', async (req, res) => {
  try {
    const { startup, investors } = req.body;
    if (!startup || !investors?.length) {
      return res.status(400).json({ error: 'startup and investors array required' });
    }

    const prompt = `You are ranking ${investors.length} investors for a startup.

STARTUP:
${JSON.stringify(startup, null, 2)}

INVESTORS:
${JSON.stringify(investors, null, 2)}

Score each investor's compatibility with this startup.
Return JSON array sorted by score descending:
[
  {
    "investor_id": <string>,
    "score": <integer 0-100>,
    "grade": <"Excellent"|"Strong"|"Good"|"Fair"|"Poor">,
    "top_reason": <one sentence explaining the score>,
    "sector_fit": <0-100>,
    "sdg_alignment": <0-100>,
    "geography_fit": <0-100>
  }
]`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: MATCHING_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const matches = parseAIResponse(response.content);
    res.json({ success: true, data: matches, count: matches.length });

  } catch (err) {
    console.error('Batch match error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   3. PITCH DECK ANALYSIS
   POST /api/ai/pitch/analyze
   Body: multipart/form-data — file (PDF) + startupData (JSON string)
   Returns: detailed pitch feedback
   ============================================================ */
app.post('/api/ai/pitch/analyze', upload.single('file'), async (req, res) => {
  try {
    let pitchContent = '';

    if (req.file) {
      const pdfData = await pdfParse(req.file.buffer);
      pitchContent = pdfData.text;
    } else if (req.body.pitch_text) {
      pitchContent = req.body.pitch_text;
    } else {
      return res.status(400).json({ error: 'PDF file or pitch_text required' });
    }

    const startupData = req.body.startupData ? JSON.parse(req.body.startupData) : {};

    const prompt = `Analyse this startup pitch for an African investor audience.

STARTUP CONTEXT:
${JSON.stringify(startupData, null, 2)}

PITCH CONTENT:
${pitchContent.slice(0, 6000)}

Return JSON with this exact structure:
{
  "overall_score": <0-100>,
  "investor_readiness": <"Not ready"|"Early stage"|"Ready"|"Excellent">,
  "sections": {
    "problem": { "score": <0-100>, "feedback": <string>, "improvement": <string> },
    "solution": { "score": <0-100>, "feedback": <string>, "improvement": <string> },
    "market": { "score": <0-100>, "feedback": <string>, "improvement": <string> },
    "business_model": { "score": <0-100>, "feedback": <string>, "improvement": <string> },
    "traction": { "score": <0-100>, "feedback": <string>, "improvement": <string> },
    "team": { "score": <0-100>, "feedback": <string>, "improvement": <string> },
    "financials": { "score": <0-100>, "feedback": <string>, "improvement": <string> },
    "ask": { "score": <0-100>, "feedback": <string>, "improvement": <string> }
  },
  "top_strengths": [<3 specific strengths>],
  "critical_gaps": [<3 most important things to fix>],
  "investor_objections": [<3 objections investors will raise>],
  "african_market_fit": <0-100>,
  "sdg_storytelling": <0-100>,
  "executive_summary": <2-3 sentence overall assessment>,
  "recommended_investors": [<3 specific investor types or programmes to target>]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: PITCH_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIResponse(response.content);
    res.json({ success: true, data: result });

  } catch (err) {
    console.error('Pitch analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   4. PITCH LINE GENERATOR
   POST /api/ai/pitch/oneliner
   Body: { startup_name, sector, problem, solution, target_market }
   Returns: { options: [5 one-liner options] }
   ============================================================ */
app.post('/api/ai/pitch/oneliner', async (req, res) => {
  try {
    const { startup_name, sector, problem, solution, target_market } = req.body;

    const prompt = `Generate 5 compelling one-line pitches for this African startup.

Startup: ${startup_name}
Sector: ${sector}
Problem: ${problem}
Solution: ${solution}
Target market: ${target_market}

Format: "We help [who] to [outcome] by [how]"
Make each one specific, compelling, and under 120 characters.

Return JSON:
{
  "options": [
    { "line": <string>, "tone": <"impact"|"growth"|"technical"|"social"|"commercial">, "chars": <integer> }
  ]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: PITCH_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIResponse(response.content);
    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   5. GRANT ELIGIBILITY CHECKER
   POST /api/ai/grants/check
   Body: { startup: {...}, grant: {...} }
   Returns: eligibility analysis + application tips
   ============================================================ */
app.post('/api/ai/grants/check', async (req, res) => {
  try {
    const { startup, grant } = req.body;

    const prompt = `Assess whether this startup qualifies for this grant.

STARTUP PROFILE:
${JSON.stringify(startup, null, 2)}

GRANT PROGRAMME:
${JSON.stringify(grant, null, 2)}

Return JSON:
{
  "eligible": <true|false>,
  "eligibility_score": <0-100>,
  "verdict": <"Highly eligible"|"Eligible"|"Partially eligible"|"Not eligible">,
  "criteria_check": [
    { "criterion": <string>, "met": <true|false|"partial">, "note": <string> }
  ],
  "strengths": [<2-4 things that strengthen the application>],
  "gaps": [<things to address before applying>],
  "application_tips": [<3-5 specific tips for this grant>],
  "success_probability": <"High"|"Medium"|"Low">,
  "recommended_actions": [<immediate next steps>],
  "alternative_grants": [<2-3 grants to consider if not eligible>]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: GRANT_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIResponse(response.content);
    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   6. GRANT DISCOVERY — find best grants for a startup
   POST /api/ai/grants/discover
   Body: { startup: {...} }
   Returns: ranked list of recommended grant programmes
   ============================================================ */
app.post('/api/ai/grants/discover', async (req, res) => {
  try {
    const { startup } = req.body;

    const prompt = `Find the best grant programmes for this African startup.

STARTUP PROFILE:
${JSON.stringify(startup, null, 2)}

Return the top 8 grant programmes this startup should apply for,
ranked by eligibility and impact potential.

Return JSON:
{
  "grants": [
    {
      "name": <string>,
      "organisation": <string>,
      "amount": <string>,
      "deadline": <string or "Rolling">,
      "match_score": <0-100>,
      "match_reason": <one sentence>,
      "region": <string>,
      "type": <"Non-dilutive"|"Equity"|"Mixed">,
      "url": <string or null>,
      "urgency": <"Apply now"|"Apply soon"|"Plan ahead">
    }
  ],
  "total_available": <estimated total funding in USD as integer>,
  "strategy": <2-3 sentence recommended application strategy>
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: GRANT_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIResponse(response.content);
    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   7. COMPLIANCE ADVISOR
   POST /api/ai/compliance/check
   Body: { startup: {...}, country: string, question?: string }
   Returns: compliance status + action items
   ============================================================ */
app.post('/api/ai/compliance/check', async (req, res) => {
  try {
    const { startup, country, question } = req.body;

    const prompt = `${question
      ? `Answer this compliance question: "${question}"\n\nFor this startup:\n${JSON.stringify(startup, null, 2)}\n\nIn country: ${country}`
      : `Run a full compliance check for this startup in ${country}.\n\nSTARTUP:\n${JSON.stringify(startup, null, 2)}`
    }

Return JSON:
{
  "overall_status": <"Compliant"|"Partially compliant"|"Non-compliant">,
  "compliance_score": <0-100>,
  "country": "${country || startup?.country}",
  "items": [
    {
      "area": <string>,
      "status": <"Done"|"In progress"|"Required"|"Not applicable">,
      "urgency": <"Immediate"|"Soon"|"Planned"|"N/A">,
      "deadline": <string or null>,
      "description": <string>,
      "action": <string>,
      "penalty": <string or null>
    }
  ],
  "priority_actions": [<top 3 things to do first>],
  "ai_response": <if question asked, plain-English answer>,
  "disclaimer": "This is AI guidance only. Consult a qualified lawyer for legal decisions."
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: COMPLIANCE_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIResponse(response.content);
    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   8. AI RECOMMENDATIONS ENGINE
   POST /api/ai/recommend
   Body: { user: {...}, type: "courses"|"mentors"|"grants"|"investors"|"all" }
   Returns: personalised ranked recommendations
   ============================================================ */
app.post('/api/ai/recommend', async (req, res) => {
  try {
    const { user, type = 'all' } = req.body;

    const prompt = `Generate personalised ${type} recommendations for this HopeFusion Africa user.

USER PROFILE:
${JSON.stringify(user, null, 2)}

Return JSON with recommendations for: ${type === 'all' ? 'courses, mentors, grants, investors' : type}.

{
  ${type === 'all' || type === 'courses' ? `"courses": [
    { "title": <string>, "reason": <string>, "match": <0-100>, "duration": <string>, "level": <string> }
  ],` : ''}
  ${type === 'all' || type === 'mentors' ? `"mentors": [
    { "name": <string>, "expertise": <string>, "reason": <string>, "match": <0-100> }
  ],` : ''}
  ${type === 'all' || type === 'grants' ? `"grants": [
    { "name": <string>, "amount": <string>, "reason": <string>, "match": <0-100>, "deadline": <string> }
  ],` : ''}
  ${type === 'all' || type === 'investors' ? `"investors": [
    { "type": <string>, "focus": <string>, "reason": <string>, "match": <0-100> }
  ],` : ''}
  "personalisation_summary": <1-2 sentence summary of what drives these recommendations>
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: RECOMMENDATION_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIResponse(response.content);
    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   9. STREAMING CHAT WITH PERSISTENT MEMORY — (SSE)
   POST /api/ai/chat/stream
   Body: {
     messages  : [{role, content}],   // current-turn messages from the client
     context   : "mentor"|"investor"|"compliance"|"general",
     thread_id : string (optional),   // omit to start a fresh thread
     user      : object (optional)    // user profile for personalisation
   }
   Streams: Server-sent events with text chunks + thread_id on completion
   ============================================================ */
app.post('/api/ai/chat/stream', async (req, res) => {
  try {
    const { messages, context = 'general', thread_id, user } = req.body;

    if (!messages?.length) {
      return res.status(400).json({ error: '`messages` array is required' });
    }

    // ── Context-aware system prompts ────────────────────────────────────────
    const systemPrompts = {
      mentor: `You are a world-class business mentor on HopeFusion Africa.
               You've helped 500+ African startups raise funding and scale.
               Be specific, practical, and Africa-aware in your advice.
               Keep responses concise (under 200 words) unless asked for detail.
               You have memory of prior turns in this conversation — use it to give
               coherent, contextually aware responses.`,
      investor: `You are an impact investor advisor on HopeFusion Africa.
                 You help startups understand what investors look for and how to approach them.
                 Be direct, practical and honest. Reference specific African investors where relevant.
                 You have memory of prior turns in this conversation — use it for continuity.`,
      compliance: `You are a regulatory compliance advisor for African startups.
                   Help founders navigate registration, tax, data protection and licensing.
                   Always flag urgency. Always recommend professional legal advice for complex matters.
                   You have memory of prior turns in this conversation — use it for continuity.`,
      general: `You are HopeFusion Africa's AI assistant.
                Help founders, investors and mentors get the most from the platform.
                Be warm, practical and Africa-aware.
                You have memory of prior turns in this conversation — use it for continuity.`
    };

    // ── Resolve or create a thread ID ───────────────────────────────────────
    const activeThreadId = thread_id || `hfa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // ── Load existing conversation history from Redis / memory ───────────────
    const history = await getThreadHistory(activeThreadId);

    // The current user turn is the last message in the request
    const currentUserMessage = messages[messages.length - 1]?.content || '';

    // Build the full message array: persistent history + current turn
    const fullMessages = [
      ...history,
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    // ── Set SSE headers ─────────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Emit the thread_id immediately so the client can persist it
    res.write(`data: ${JSON.stringify({ thread_id: activeThreadId })}\n\n`);

    // ── Stream from Claude ───────────────────────────────────────────────────
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompts[context] || systemPrompts.general,
      messages: fullMessages,
    });

    let assistantReply = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        assistantReply += event.delta.text;
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    const finalMsg = await stream.finalMessage();

    // ── Persist this turn to Redis / memory ─────────────────────────────────
    if (assistantReply) {
      await appendThreadHistory(activeThreadId, currentUserMessage, assistantReply);
    }

    res.write(`data: ${JSON.stringify({
      done      : true,
      thread_id : activeThreadId,
      memory    : redisReady ? 'redis' : 'memory',
      usage     : finalMsg.usage
    })}\n\n`);
    res.end();

  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

/* ============================================================
   9b. CLEAR CHAT THREAD
   DELETE /api/ai/chat/thread/:threadId
   Removes a conversation thread from Redis / memory store
   ============================================================ */
app.delete('/api/ai/chat/thread/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    await clearThreadHistory(threadId);
    res.json({ success: true, message: `Thread ${threadId} cleared` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   9c. GET CHAT THREAD HISTORY
   GET /api/ai/chat/thread/:threadId
   Returns the stored conversation history for a thread
   ============================================================ */
app.get('/api/ai/chat/thread/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const history = await getThreadHistory(threadId);
    res.json({
      success   : true,
      thread_id : threadId,
      turns     : history.length / 2,
      history,
      store     : redisReady ? 'redis' : 'memory'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   10. FINANCIAL MODEL BUILDER
   POST /api/ai/financials/model
   Body: { startup: {...}, months: 18 }
   Returns: 18-month financial projection with assumptions
   ============================================================ */
app.post('/api/ai/financials/model', async (req, res) => {
  try {
    const { startup, months = 18 } = req.body;

    const prompt = `Build a realistic ${months}-month financial model for this African startup.

STARTUP:
${JSON.stringify(startup, null, 2)}

Use conservative, realistic assumptions for the African market.
Factor in local currency risks, seasonal patterns and regulatory costs.

Return JSON:
{
  "assumptions": {
    "monthly_growth_rate": <decimal e.g. 0.15 = 15%>,
    "gross_margin": <decimal>,
    "burn_rate_month1": <USD integer>,
    "cac": <USD integer>,
    "ltv": <USD integer>,
    "churn_rate": <decimal>
  },
  "projections": [
    {
      "month": <1-${months}>,
      "revenue": <USD integer>,
      "expenses": <USD integer>,
      "net": <USD integer>,
      "cumulative_cash": <USD integer>,
      "customers": <integer>,
      "mrr": <USD integer>
    }
  ],
  "runway_months": <integer>,
  "break_even_month": <integer or null>,
  "total_funding_needed": <USD integer>,
  "key_risks": [<3 financial risks specific to African market>],
  "milestones": [<5 financial milestones to hit for next funding round>]
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: PITCH_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = parseAIResponse(response.content);
    res.json({ success: true, data: result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ============================================================
   HEALTH CHECK
   ============================================================ */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'HopeFusion Africa AI Engine',
    model: 'claude-sonnet-4-20250514',
    chat_memory: {
      enabled   : true,
      store     : redisReady ? 'redis' : 'memory',
      ttl_hours : THREAD_TTL_SECONDS / 3600,
      max_turns : MAX_HISTORY_TURNS
    },
    endpoints: [
      'POST   /api/ai/match',
      'POST   /api/ai/match/batch',
      'POST   /api/ai/pitch/analyze',
      'POST   /api/ai/pitch/oneliner',
      'POST   /api/ai/grants/check',
      'POST   /api/ai/grants/discover',
      'POST   /api/ai/compliance/check',
      'POST   /api/ai/recommend',
      'POST   /api/ai/chat/stream',
      'GET    /api/ai/chat/thread/:threadId',
      'DELETE /api/ai/chat/thread/:threadId',
      'POST   /api/ai/financials/model',
    ],
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.AI_ENGINE_PORT || 3001;
app.listen(PORT, () => {
  console.log(`HopeFusion AI Engine running on port ${PORT}`);
});

export default app;
