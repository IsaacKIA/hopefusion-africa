import dotenv from 'dotenv';
dotenv.config();

import { db } from '../config/db.js';

async function migrate() {
  console.log('🔄 HopeFusion Africa — DB Migration Auth & Onboarding V2');
  console.log('━'.repeat(50));

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  try {
    console.log('⏳ Applying database adjustments...');
    await db.query('BEGIN');

    // 1. Add onboarding tracking and goals to users table
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS goals TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
    `);

    // 2. Drop existing constraint and define new roles check constraint
    await db.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
        role IN ('startup','investor','mentor','admin','corporate','government','student','service_provider')
      );
    `);

    // 3. Create startup_passports table
    await db.query(`
      CREATE TABLE IF NOT EXISTS startup_passports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        profile_completion INTEGER DEFAULT 10,
        verification_status TEXT DEFAULT 'Verified',
        hope_score INTEGER DEFAULT 300,
        funding_readiness TEXT DEFAULT 'Low',
        opportunity_readiness TEXT DEFAULT 'Low',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 4. Backfill existing users with role arrays if empty
    await db.query(`
      UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL OR roles = '{}'::TEXT[];
    `);

    await db.query('COMMIT');
    console.log('✅ Auth & Onboarding V2 migration applied successfully!');
    process.exit(0);
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
