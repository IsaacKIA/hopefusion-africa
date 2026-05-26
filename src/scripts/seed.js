/**
 * HopeFusion Africa — Database Seeding Script
 * Run: npm run db:seed
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

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

async function runSeed() {
  const client = await pool.connect();
  try {
    console.log('⏳ Hashing passwords for seed users...');
    const hashedPwd = await bcrypt.hash('Password123!', 12);

    console.log('⏳ Clearing old seed data from tables...');
    await client.query('BEGIN');
    
    // Clear in order of dependencies
    await client.query('TRUNCATE audit_log, notifications, compliance_items, enrollments, courses, messages, mentor_sessions, grant_applications, matches, mentors, investors, startup_team, startups, users, api_keys, webhooks CASCADE');
    console.log('✅ Stale records cleared.');

    // ─── INSERT USERS ──────────────────────────────────────────
    console.log('⏳ Inserting seed users...');
    
    // 1. Founder
    const founderUser = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, country, avatar_url, bio, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING id`,
      [
        'founder@hopefusion.com',
        hashedPwd,
        'startup',
        'Ama',
        'Korantema',
        '+233 24 111 2222',
        'Ghana',
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=120&q=80',
        'Co-founder of GreenHarvest, passionate about sustainable agriculture and rural empowerment.',
      ]
    );
    const founderId = founderUser.rows[0].id;

    // 2. Investor
    const investorUser = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, country, avatar_url, bio, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING id`,
      [
        'investor@hopefusion.com',
        hashedPwd,
        'investor',
        'Rene',
        'Moerman',
        '+31 6 1234 5678',
        'Netherlands',
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=120&q=80',
        'Impact investor with 15+ years experience in emerging markets, focusing on food security and financial inclusion.',
      ]
    );
    const investorUserId = investorUser.rows[0].id;

    // 3. Mentor
    const mentorUser = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, country, avatar_url, bio, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE) RETURNING id`,
      [
        'mentor@hopefusion.com',
        hashedPwd,
        'mentor',
        'Dr. Kweku',
        'Mensah',
        '+233 20 999 8888',
        'Ghana',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
        'Agricultural economist and veteran advisor. Helped scale 20+ startups across West Africa.',
      ]
    );
    const mentorUserId = mentorUser.rows[0].id;

    // 4. Admin
    await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, is_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE)`,
      ['admin@hopefusion.com', hashedPwd, 'admin', 'Selasie', 'Gbeho']
    );

    console.log('✅ Seed users created.');

    // ─── INSERT STARTUP ────────────────────────────────────────
    console.log('⏳ Inserting startup profile...');
    const startupRes = await client.query(
      `INSERT INTO startups (founder_id, name, slug, tagline, description, sector, sub_sectors, country, city, stage, founded_year, team_size, funding_goal, funding_raised, funding_type, annual_revenue, mrr, customers, sdgs, is_women_led, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, TRUE) RETURNING id`,
      [
        founderId,
        'GreenHarvest Ghana',
        'greenharvest-ghana',
        'AI-powered crop insurance for smallholder farmers using satellite climate analysis.',
        'GreenHarvest Ghana leverages satellite imagery, IoT sensors, and machine learning to deliver instant micro-crop insurance to rural farmers across West Africa, mitigating climate risks and securing livelihood credit.',
        'Agritech',
        ['Fintech', 'Cleantech'],
        'Ghana',
        'Accra',
        'mvp',
        2024,
        6,
        200000,
        15000,
        ['Grant', 'Angel'],
        12000,
        1500,
        250,
        [1, 2, 8, 13], // SDG 1, 2, 8, 13
        TRUE,
      ]
    );
    const startupId = startupRes.rows[0].id;

    // Startup Team members
    await client.query(
      `INSERT INTO startup_team (startup_id, name, role, is_founder) VALUES 
       ($1, 'Yaw Mensah', 'CTO & Co-founder', TRUE),
       ($1, 'Efe Nkrumah', 'Head of Agronomy & Ops', FALSE)`,
      [startupId]
    );

    console.log('✅ Startup profile created.');

    // ─── INSERT INVESTOR PROFILE ──────────────────────────────
    console.log('⏳ Inserting investor profile...');
    const investorRes = await client.query(
      `INSERT INTO investors (user_id, firm_name, investor_type, thesis, sectors, stages, countries, sdgs, ticket_min, ticket_max, instruments, portfolio_count, total_deployed, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE) RETURNING id`,
      [
        investorUserId,
        'Oasis Impact Ventures',
        'vc',
        'Focusing on seed and pre-series A impact solutions raising tech in agritech, clean energy, and fintech in West Africa.',
        ['Agritech', 'Fintech', 'Cleantech'],
        ['mvp', 'early_traction', 'growth'],
        ['Ghana', 'Nigeria', 'Kenya', 'Rwanda'],
        [1, 2, 8, 13],
        50000,
        500000,
        ['Equity', 'Convertible Note', 'SAFE'],
        14,
        2400000,
      ]
    );
    const investorId = investorRes.rows[0].id;

    console.log('✅ Investor profile created.');

    // ─── INSERT MENTOR PROFILE ────────────────────────────────
    console.log('⏳ Inserting mentor profile...');
    const mentorRes = await client.query(
      `INSERT INTO mentors (user_id, expertise, industries, countries, languages, hourly_rate, session_types, max_mentees, avg_rating, rating_count, total_sessions, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE) RETURNING id`,
      [
        mentorUserId,
        ['Business Scaling', 'Grant Writing', 'Agronomy Economics'],
        ['Agritech', 'Logistics'],
        ['Ghana', 'Nigeria', 'Kenya'],
        ['English', 'Twi'],
        50,
        ['one_on_one', 'workshop'],
        5,
        4.85,
        18,
        34,
      ]
    );
    const mentorId = mentorRes.rows[0].id;

    console.log('✅ Mentor profile created.');

    // ─── INSERT MATCHES ───────────────────────────────────────
    console.log('⏳ Seeding compatibility matches...');
    
    // Match with Rene Moerman (Investor) - 98%
    await client.query(
      `INSERT INTO matches (startup_id, target_id, target_type, ai_score, ai_grade, ai_reasons, ai_breakdown)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        startupId,
        investorId,
        'investor',
        98,
        'Excellent',
        [
          'Perfect sector fit (Agritech & Fintech sub-sector alignment).',
          'Geographical fit (Startup is based in Ghana, targeted by Oasis Ventures).',
          'Ticket size fit ($200K goal is directly within the $50K - $500K range).',
          'Strong mutual alignment on SDGs (1, 2, 8, 13).',
        ],
        JSON.stringify({
          sector: 100,
          geography: 100,
          stage: 95,
          ticket: 98,
          sdg: 100,
        }),
      ]
    );

    // Match with Dr. Kweku Mensah (Mentor) - 92%
    await client.query(
      `INSERT INTO matches (startup_id, target_id, target_type, ai_score, ai_grade, ai_reasons, ai_breakdown)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        startupId,
        mentorId,
        'mentor',
        92,
        'Strong',
        [
          'Mentor specializes in Agronomy economics which matches the startup core domain.',
          'Geographical overlap in Ghana facilitates strategic networking and local introductions.',
          'Dr. Mensah has a proven track record helping MVP-stage founders raise grant funding.',
        ],
        JSON.stringify({
          expertise: 95,
          geography: 100,
          industry: 90,
          stage: 90,
        }),
      ]
    );

    console.log('✅ Seeding matches finished.');

    // ─── INSERT COMPLIANCE ITEMS ──────────────────────────────
    console.log('⏳ Seeding compliance checklist for Ghana...');
    await client.query(
      `INSERT INTO compliance_items (startup_id, country, area, authority, status, deadline, reference, notes) VALUES
       ($1, 'Ghana', 'Corporate Registration', 'Registrar General''s Department', 'done', NULL, 'RG-98472-GH', 'Company incorporated as a private limited liability company.'),
       ($1, 'Ghana', 'Tax Identification', 'Ghana Revenue Authority (GRA)', 'done', NULL, 'TIN-C0039281', 'TIN generated and registered for corporate taxes.'),
       ($1, 'Ghana', 'Environmental Licensing', 'Environmental Protection Agency (EPA)', 'required', '2026-09-30', 'EPA Act 490', 'Required for agro-monitoring sensors and operations in rural farming belts.'),
       ($1, 'Ghana', 'Data Protection', 'Data Protection Commission (DPC)', 'in_progress', '2026-07-15', 'Act 843', 'Required for collecting smallholder farmer registration, geolocations, and personal telemetry.')`,
      [startupId]
    );

    // ─── INSERT COURSES ───────────────────────────────────────
    console.log('⏳ Seeding learning hub courses...');
    await client.query(
      `INSERT INTO courses (title, slug, description, sector_tags, level, duration_min, is_free, price_usd, thumbnail_url, is_published, enrollment_count) VALUES
       ('Succeeding in West African Agritech', 'succeeding-agritech-west-africa', 'Learn the regulatory, cultural, and distribution strategies required to deploy and scale agritech solutions across Ghana, Nigeria, and Côte d''Ivoire.', ARRAY['Agritech', 'Scale'], 'intermediate', 180, TRUE, 0, 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=400&q=80', TRUE, 142),
       ('Pitching for Impact: Grants and SAFEs', 'pitching-impact-grants-safes', 'Step-by-step masterclass on how to format your deck, write compelling problem statements, and score high on ESG criteria for Pan-African grants.', ARRAY['Funding', 'Scale'], 'beginner', 120, TRUE, 0, 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=400&q=80', TRUE, 308)`
    );

    // ─── INSERT MESSAGE THREADS ───────────────────────────────
    console.log('⏳ Seeding first connection message thread...');
    const threadId = [founderId, investorUserId].sort().join(':');
    await client.query(
      `INSERT INTO messages (sender_id, recipient_id, thread_id, content, is_read) VALUES
       ($1, $2, $3, 'Hi Rene, thank you for connecting with us! I saw that Oasis Impact Ventures matches our agritech thesis. We would love to share our pitch deck.', TRUE),
       ($2, $1, $3, 'Hi Ama, pleasure meeting you. Yes, satellite-based crop insurance is a highly exciting field. I reviewed your 98% AI match scorecard and would like to see a demo of your satellite dashboard. Do you have time next week?', FALSE)`,
      [founderId, investorUserId, threadId]
    );

    // ─── INSERT NOTIFICATIONS ─────────────────────────────────
    console.log('⏳ Seeding notifications...');
    await client.query(
      `INSERT INTO notifications (user_id, type, title, body, is_read) VALUES
       ($1, 'new_match', '🤖 98% AI Match Found!', 'Oasis Impact Ventures has been matched to your profile. View their investment thesis now.', FALSE),
       ($1, 'message', '💬 New message from Rene Moerman', '"Hi Ama, pleasure meeting you. Yes, satellite..."', FALSE),
       ($1, 'info', '🌍 Welcome to HopeFusion Africa!', 'Your founder registration is verified. Start scanning for matching programs and resources.', TRUE)`,
      [founderId]
    );

    await client.query('COMMIT');
    console.log('🎉 Database seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database seeding:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
