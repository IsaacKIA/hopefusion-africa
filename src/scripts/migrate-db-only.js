import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL || '').includes('localhost') ? false : { rejectUnauthorized: false }
});

async function run() {
  console.log('🔄 direct postgresql migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add columns
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS goals TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
    `);

    // Drop and update CHECK constraint
    await client.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
        role IN ('startup','investor','mentor','admin','corporate','government','student','service_provider')
      );
    `);

    // Create startup_passports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS startup_passports (
        id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        profile_completion   INTEGER DEFAULT 10,
        verification_status  TEXT DEFAULT 'Verified',
        hope_score           INTEGER DEFAULT 300,
        funding_readiness    TEXT DEFAULT 'Low',
        opportunity_readiness TEXT DEFAULT 'Low',
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Backfill existing user roles array
    await client.query(`
      UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL OR roles = '{}'::TEXT[];
    `);

    await client.query('COMMIT');
    console.log('✅ direct postgresql migration successful!');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ direct postgresql migration failed:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
