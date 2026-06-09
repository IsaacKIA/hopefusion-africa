/**
 * HopeFusion Africa — Production Database Migration Script
 * Run: npm run db:migrate
 *
 * Uses shared db pool. Idempotent — safe to re-run.
 * Exits 0 on success, 1 on failure.
 */

import dotenv from 'dotenv';
dotenv.config();

import { db } from '../config/db.js';
import { SCHEMA } from '../config/schema.js';

async function migrate() {
  console.log('🔄 HopeFusion Africa — DB Migration');
  console.log('━'.repeat(50));

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log(`📡 Target: ${process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')}`);

  try {
    console.log('\n⏳ Applying schema (idempotent)...');
    const start = Date.now();

    await db.query('BEGIN');
    await db.query(SCHEMA);
    await db.query('COMMIT');

    console.log(`✅ Schema applied in ${Date.now() - start}ms`);

    // List tables
    const { rows } = await db.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`
    );
    console.log(`\n📋 Tables (${rows.length}):`);
    rows.forEach(r => console.log(`   ✓ ${r.table_name}`));
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
