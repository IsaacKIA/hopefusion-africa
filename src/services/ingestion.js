import Anthropic from '@anthropic-ai/sdk';
import { db } from '../config/db.js';
import { generateEmbedding, formatOpportunityText } from '../utils/embeddings.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INGESTION_SYSTEM = `You are HopeFusion Africa's V4 Ingestion AI parser.
Your task is to take unstructured opportunity text (such as grant descriptions, corporate RFP postings, investment notices, or program announcements) and normalize them into a structured JSON schema mapping to our database columns.

You must output valid JSON only. Do not wrap it in markdown block quotes (e.g. do not write \`\`\`json ... \`\`\`), do not write introductory or concluding prose. Output raw JSON ONLY.

The JSON schema you must return is:
{
  "title": "A short, descriptive title of the opportunity",
  "description": "A clean, concise summary of what the opportunity is about, its objectives, and key requirements.",
  "opportunity_type": "grant" | "investment" | "job" | "accelerator" | "competition" | "scholarship" | "procurement" | "corporate_challenge" | "government_program",
  "value_amount": number or null (e.g. 50000 if it specifies 50,000 USD, or null if unspecified),
  "currency": "3 letter ISO code, default 'USD'",
  "eligible_countries": ["ISO alpha-2 country codes, or 'ALL' if open globally. For example: ['NG', 'GH', 'KE']"],
  "eligible_sectors": ["Target industries or sectors, or 'ALL'. For example: ['Fintech', 'Agriculture', 'Healthcare']"],
  "eligible_stages": ["Eligible startup stages. For example: ['idea', 'mvp', 'early_traction', 'growth'] or ['ALL']"],
  "deadline": "ISO 8601 string representing the deadline timestamp, or null if rolling/unspecified",
  "metadata": {
    "application_url": "extracted URL if found, or null",
    "funder_name": "name of the funding organization or sponsor",
    "requirements": ["bullet points of specific requirements or rules"]
  }
}`;

/**
 * Parses raw, unstructured opportunity text using Claude 3.5 Sonnet.
 * @param {string} rawText 
 * @returns {Promise<object>}
 */
export async function parseOpportunityWithClaude(rawText) {
  if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
    throw new Error('rawText is required');
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1200,
    system: INGESTION_SYSTEM,
    messages: [
      { role: 'user', content: `Parse the following unstructured opportunity description:\n\n${rawText}` }
    ]
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

/**
 * Ingests unstructured opportunity text, normalizes it, generates local embedding, and saves to DB.
 * @param {string} rawText 
 * @returns {Promise<object>}
 */
export async function ingestOpportunity(rawText) {
  const parsed = await parseOpportunityWithClaude(rawText);

  // Generate vector embedding
  const formattedText = formatOpportunityText(parsed);
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
      parsed.title,
      parsed.description,
      parsed.opportunity_type,
      parsed.value_amount || null,
      parsed.currency || 'USD',
      JSON.stringify(parsed.eligible_countries || []),
      JSON.stringify(parsed.eligible_sectors || []),
      JSON.stringify(parsed.eligible_stages || []),
      parsed.deadline || null,
      pgVector,
      JSON.stringify(parsed.metadata || {})
    ]
  );

  return rows[0];
}

/**
 * Seed mock opportunities for matching validation.
 */
export async function runMockCrawler() {
  const mockFeeds = [
    `AGRA Agri-business grant for East Africa. Value is $25000 USD for smallholder farmers and agricultural technology providers.
     Must be based in Kenya (KE), Uganda (UG) or Tanzania (TZ). Ideal startup stage: mvp or early_traction. Sector: Agriculture, Agtech.
     Deadline is 2026-12-31. Apply online at https://agra.org/grants. Focus is SDG 2 (Zero Hunger) and SDG 8.`,

    `Verventures seed investment fund notice. Looking for seed stage FinTech and CleanTech startups in Nigeria (NG), Ghana (GH) and South Africa (ZA).
     Funding ticket size is $100000. Startups must have launched product with some customer traction. Applications accepted on a rolling basis.`,

    `Standard Bank corporate innovation procurement challenge. Seeking software engineering partners to build payment rails.
     Country limit: South Africa (ZA). Stage requirement: growth. Sector: Fintech, Enterprise Software. Value is $50000.
     Deadline: 2026-09-30. Apply via bank innovation portal.`
  ];

  const results = [];
  for (const text of mockFeeds) {
    try {
      const opp = await ingestOpportunity(text);
      results.push(opp);
    } catch (err) {
      console.error('[Ingestion Crawler] Mock seed failure:', err.message);
    }
  }
  return results;
}
