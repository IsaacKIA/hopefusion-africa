/**
 * HopeFusion Africa — Database Setup Migration
 * Run: npm run db:setup
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { SCHEMA } from '../server.js';
import { API_SCHEMA } from '../public-api.js';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is not defined.');
  process.exit(1);
}

console.log('🚀 Initializing HopeFusion Africa database migration...');
console.log(`Connecting to: ${process.env.DATABASE_URL.split('@')[1] || 'local database'}`);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('⏳ Creating platform tables (SCHEMA)...');
    await client.query('BEGIN');
    await client.query(SCHEMA);
    console.log('✅ Core platform schema applied successfully.');

    console.log('⏳ Creating developer API tables (API_SCHEMA)...');
    await client.query(API_SCHEMA);
    console.log('✅ Developer API schema applied successfully.');

    await client.query('COMMIT');
    console.log('🎉 Database setup migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error applying migration schemas:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
