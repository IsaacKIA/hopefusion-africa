/**
 * HopeFusion Africa — Database Vector Migration Script
 * Runs: node src/scripts/migrate-embeddings.js
 * Generates local semantic embeddings for all existing startups and investors.
 */

import './setup-env.js';
import pg from 'pg';
import dotenv from 'dotenv';
import { generateEmbedding, formatStartupText, formatInvestorText } from '../utils/embeddings.js';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Running pgvector embedding migrations...');

    // 1. Enable pgvector extension
    console.log('⏳ Ensuring pgvector extension is enabled...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ Extension "vector" is active.');

    // 2. Add columns if not exists
    console.log('⏳ Adding embedding vector(384) columns to startups and investors tables...');
    await client.query('ALTER TABLE startups ADD COLUMN IF NOT EXISTS embedding vector(384);');
    await client.query('ALTER TABLE investors ADD COLUMN IF NOT EXISTS embedding vector(384);');
    console.log('✅ Tables altered successfully.');

    // 3. Migrate startups
    console.log('⏳ Querying startups needing semantic vectorization...');
    const startupsRes = await client.query('SELECT * FROM startups WHERE embedding IS NULL');
    console.log(`Found ${startupsRes.rows.length} startups to vectorise.`);

    for (const startup of startupsRes.rows) {
      console.log(`⏳ Generating embedding for startup: "${startup.name}"...`);
      const text = formatStartupText(startup);
      const embedding = await generateEmbedding(text);
      
      // pgvector accepts arrays formatted as string representation e.g. '[1.2,3.4,-0.4]'
      const pgVector = `[${embedding.join(',')}]`;
      await client.query('UPDATE startups SET embedding = $1 WHERE id = $2', [pgVector, startup.id]);
      console.log(`✅ Startup "${startup.name}" updated successfully.`);
    }

    // 4. Migrate investors
    console.log('⏳ Querying investors needing semantic vectorization...');
    const investorsRes = await client.query('SELECT * FROM investors WHERE embedding IS NULL');
    console.log(`Found ${investorsRes.rows.length} investors to vectorise.`);

    for (const investor of investorsRes.rows) {
      console.log(`⏳ Generating embedding for investor firm: "${investor.firm_name}"...`);
      const text = formatInvestorText(investor);
      const embedding = await generateEmbedding(text);
      
      const pgVector = `[${embedding.join(',')}]`;
      await client.query('UPDATE investors SET embedding = $1 WHERE id = $2', [pgVector, investor.id]);
      console.log(`✅ Investor firm "${investor.firm_name}" updated successfully.`);
    }

    console.log('🎉 pgvector embedding migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
