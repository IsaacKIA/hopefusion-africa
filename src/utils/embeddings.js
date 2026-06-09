/**
 * HopeFusion Africa — Local AI Embedding Engine
 * Utilizes @xenova/transformers to generate 384-dimensional dense vectors locally.
 */

import { pipeline } from '@xenova/transformers';

let extractor = null;

/**
 * Lazy loads and caches the pipeline extractor.
 */
async function getExtractor() {
  if (!extractor) {
    console.log('[Embeddings Engine] Initializing Xenova/all-MiniLM-L6-v2 pipeline...');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[Embeddings Engine] Pipeline loaded successfully.');
  }
  return extractor;
}

/**
 * Generate a 384-dimensional dense vector representing the text.
 * @param {string} text 
 * @returns {Promise<Array<number>>}
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new Error('generateEmbedding requires a non-empty string');
  }

  try {
    const extract = await getExtractor();
    // We pool mean and normalize to ensure cosine distance lookups work seamlessly
    const result = await extract(text, { pooling: 'mean', normalize: true });
    
    // Convert Float32Array to standard JavaScript number array
    return Array.from(result.data);
  } catch (err) {
    console.error('[Embeddings Engine] Embedding generation error:', err);
    throw err;
  }
}

/**
 * Formats a startup's fields into a dense textual context block.
 * @param {object} startup 
 * @returns {string}
 */
export function formatStartupText(startup) {
  if (!startup) return '';
  const name = startup.name || '';
  const tagline = startup.tagline || '';
  const description = startup.description || '';
  const sector = startup.sector || '';
  const subSectors = Array.isArray(startup.sub_sectors) ? startup.sub_sectors.join(', ') : '';
  const country = startup.country || '';
  const city = startup.city || '';
  const stage = startup.stage || '';
  const fundingGoal = startup.funding_goal ? `seeking $${startup.funding_goal}` : '';
  const sdgs = Array.isArray(startup.sdgs) ? `targeting SDGs: ${startup.sdgs.join(', ')}` : '';

  return `Startup: ${name}.
Tagline: ${tagline}.
Description: ${description}.
Sector: ${sector} ${subSectors ? `(Sub-sectors: ${subSectors})` : ''}.
Location: ${city ? `${city}, ` : ''}${country}.
Development Stage: ${stage}.
Funding Goal: ${fundingGoal}.
Impact Goals: ${sdgs}.`.trim();
}

/**
 * Formats an investor's fields into a dense textual context block.
 * @param {object} investor 
 * @returns {string}
 */
export function formatInvestorText(investor) {
  if (!investor) return '';
  const firmName = investor.firm_name || '';
  const type = investor.investor_type || '';
  const thesis = investor.thesis || '';
  const sectors = Array.isArray(investor.sectors) ? investor.sectors.join(', ') : '';
  const stages = Array.isArray(investor.stages) ? investor.stages.join(', ') : '';
  const countries = Array.isArray(investor.countries) ? investor.countries.join(', ') : '';
  const sdgs = Array.isArray(investor.sdgs) ? `focusing on SDGs: ${investor.sdgs.join(', ')}` : '';
  const minTicket = investor.ticket_min ? `$${investor.ticket_min}` : '';
  const maxTicket = investor.ticket_max ? `$${investor.ticket_max}` : '';
  const tickets = minTicket && maxTicket ? `ticket size: ${minTicket} to ${maxTicket}` : '';

  return `Investor Firm: ${firmName}.
Investor Type: ${type}.
Investment Thesis: ${thesis}.
Preferred Sectors: ${sectors}.
Target Stages: ${stages}.
Target Countries: ${countries}.
Investment Tickets: ${tickets}.
Impact Alignment: ${sdgs}.`.trim();
}
