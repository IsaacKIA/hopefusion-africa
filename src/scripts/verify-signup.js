import { db as pool, redis } from '../config/db.js';
import axios from 'axios';

const apiBase = "http://localhost:3000/api/v1";

async function runTests() {
  console.log('Using shared DB and Redis config.');

  // Clean existing test users if any
  const testEmails = [
    'startup.test.new@example.com',
    'investor.test.new@example.com',
    'mentor.test.new@example.com'
  ];
  for (const email of testEmails) {
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows.length) {
      const userId = rows[0].id;
      console.log(`Cleaning up old test user: ${email} (ID: ${userId})`);
      // Delete dependent rows first to satisfy FK constraints
      await pool.query('DELETE FROM audit_log WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM startups WHERE founder_id = $1', [userId]);
      await pool.query('DELETE FROM investors WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM mentors WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await redis.del(`verify:${userId}`);
    }
  }

  // Helper to get verify code
  const getVerifyCode = async (userId) => {
    const raw = await redis.get(`verify:${userId}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  };

  // 1. Test Startup Registration
  console.log('\n--- 1. Testing Startup Registration ---');
  try {
    const startupPayload = {
      email: 'startup.test.new@example.com',
      password: 'Password123',
      role: 'startup',
      first_name: 'Startup',
      last_name: 'Founder',
      phone: '0244111222', // ghana format, should normalize to +233244111222
      country: 'Ghana',
      linkedin_url: 'https://linkedin.com/in/startup-test',
      startup_name: 'Oasis Agri',
      sector: 'agribusiness',
      stage: 'mvp',
      startup_country: 'Ghana',
      team_size: 4,
      funding_goal: 50000,
      funding_type: 'equity',
      sdgs: [1, 2],
      is_women_led: true,
      startup_tagline: 'Farming the future',
      startup_website: 'https://oasisagri.com'
    };

    const regRes = await axios.post(`${apiBase}/auth/register`, startupPayload);
    const token = regRes.data.token;
    const userId = regRes.data.user.id;
    console.log('Startup registered successfully. User ID:', userId);

    // Retrieve OTP from Redis
    const otpCode = await getVerifyCode(userId);
    console.log('OTP code:', otpCode);

    // Verify OTP
    const verifyRes = await axios.post(`${apiBase}/auth/verify`, { code: otpCode }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('OTP verified successfully:', verifyRes.data);

    // Verify DB fields
    const { rows: [userRow] } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    console.log('User row website_url:', userRow.website_url);
    console.log('User row normalized phone:', userRow.phone);
    if (userRow.phone !== '+233244111222') throw new Error('Phone number normalization failed!');
    if (userRow.website_url !== 'https://oasisagri.com') throw new Error('User website_url field mismatch!');
    if (!userRow.is_verified) throw new Error('User is_verified is false!');

    const { rows: [startupRow] } = await pool.query('SELECT * FROM startups WHERE founder_id = $1', [userId]);
    console.log('Startup row name:', startupRow.name);
    console.log('Startup row funding_goal:', startupRow.funding_goal);
    console.log('Startup row sdgs:', startupRow.sdgs);
    if (startupRow.name !== 'Oasis Agri') throw new Error('Startup profile insert failed or field mismatch!');
    console.log('✅ Startup Registration test PASSED!');
  } catch (err) {
    console.error('❌ Startup Registration test FAILED:', err.response?.data || err.message);
  }

  // 2. Test Investor Registration
  console.log('\n--- 2. Testing Investor Registration ---');
  try {
    const investorPayload = {
      email: 'investor.test.new@example.com',
      password: 'Password123',
      role: 'investor',
      first_name: 'Investor',
      last_name: 'Firm',
      phone: '+233244222333',
      country: 'Ghana',
      linkedin_url: 'https://linkedin.com/in/investor-test',
      investor_type: 'vc',
      firm_name: 'Oasis Impact Capital',
      ticket_min: 20000,
      ticket_max: 200000,
      sectors: ['agribusiness', 'fintech'],
      stages: ['early_traction', 'growth'],
      countries: ['Ghana', 'Nigeria'],
      instruments: ['equity', 'debt'],
      firm_website: 'https://oasisimpact.com'
    };

    const regRes = await axios.post(`${apiBase}/auth/register`, investorPayload);
    const token = regRes.data.token;
    const userId = regRes.data.user.id;
    console.log('Investor registered successfully. User ID:', userId);

    const otpCode = await getVerifyCode(userId);
    const verifyRes = await axios.post(`${apiBase}/auth/verify`, { code: otpCode }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('OTP verified successfully:', verifyRes.data);

    const { rows: [userRow] } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRow.website_url !== 'https://oasisimpact.com') throw new Error('User website_url field mismatch for investor!');

    const { rows: [investorRow] } = await pool.query('SELECT * FROM investors WHERE user_id = $1', [userId]);
    console.log('Investor row firm_name:', investorRow.firm_name);
    console.log('Investor row stages:', investorRow.stages);
    if (investorRow.firm_name !== 'Oasis Impact Capital') throw new Error('Investor profile insert failed!');
    console.log('✅ Investor Registration test PASSED!');
  } catch (err) {
    console.error('❌ Investor Registration test FAILED:', err.response?.data || err.message);
  }

  // 3. Test Mentor Registration
  console.log('\n--- 3. Testing Mentor Registration ---');
  try {
    const mentorPayload = {
      email: 'mentor.test.new@example.com',
      password: 'Password123',
      role: 'mentor',
      first_name: 'Mentor',
      last_name: 'Guide',
      phone: '244333444', // ghana format without leading 0 or +, should normalize to +233244333444
      country: 'Ghana',
      linkedin_url: 'https://linkedin.com/in/mentor-test',
      expertise: ['fundraising', 'strategy'],
      session_types: ['one_on_one', 'group'],
      languages: ['en', 'fr'],
      experience_years: 10,
      max_mentees: 5,
      hourly_rate: 50,
      current_role: 'Partner',
      mentor_bio: 'Helping startups grow and scale across West Africa.'
    };

    const regRes = await axios.post(`${apiBase}/auth/register`, mentorPayload);
    const token = regRes.data.token;
    const userId = regRes.data.user.id;
    console.log('Mentor registered successfully. User ID:', userId);

    const otpCode = await getVerifyCode(userId);
    const verifyRes = await axios.post(`${apiBase}/auth/verify`, { code: otpCode }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('OTP verified successfully:', verifyRes.data);

    const { rows: [userRow] } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    console.log('User row phone normalized:', userRow.phone);
    if (userRow.phone !== '+233244333444') throw new Error('Phone normalization failed for mentor!');
    if (userRow.bio !== 'Helping startups grow and scale across West Africa.') throw new Error('Mentor bio not saved to users table!');

    const { rows: [mentorRow] } = await pool.query('SELECT * FROM mentors WHERE user_id = $1', [userId]);
    console.log('Mentor row expertise:', mentorRow.expertise);
    console.log('Mentor row experience_years:', mentorRow.experience_years);
    console.log('Mentor row current_role:', mentorRow.current_role);
    if (mentorRow.experience_years !== 10) throw new Error('Mentor experience_years mismatch!');
    if (mentorRow.current_role !== 'Partner') throw new Error('Mentor current_role mismatch!');
    console.log('✅ Mentor Registration test PASSED!');
  } catch (err) {
    console.error('❌ Mentor Registration test FAILED:', err.response?.data || err.message);
  }

  // 4. Test Duplicate Email
  console.log('\n--- 4. Testing Duplicate Email Handling ---');
  try {
    const dupPayload = {
      email: 'mentor.test.new@example.com',
      password: 'Password123',
      role: 'mentor',
      first_name: 'Dup',
      last_name: 'User'
    };
    await axios.post(`${apiBase}/auth/register`, dupPayload);
    console.log('❌ Duplicate Email test FAILED: registered duplicate email successfully?');
  } catch (err) {
    if (err.response && err.response.status === 409) {
      console.log('Duplicate Email returned 409 correctly:', err.response.data);
      console.log('✅ Duplicate Email test PASSED!');
    } else {
      console.error('❌ Duplicate Email test FAILED:', err.message);
    }
  }

  // 5. Test Wrong OTP
  console.log('\n--- 5. Testing Wrong OTP Handling ---');
  try {
    const loginRes = await axios.post(`${apiBase}/auth/login`, {
      email: 'mentor.test.new@example.com',
      password: 'Password123'
    });
    const token = loginRes.data.token;
    await axios.post(`${apiBase}/auth/verify`, { code: '999999' }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('❌ Wrong OTP test FAILED: verified with wrong code?');
  } catch (err) {
    if (err.response && err.response.status === 400) {
      console.log('Wrong OTP returned 400 correctly:', err.response.data);
      console.log('✅ Wrong OTP test PASSED!');
    } else {
      console.error('❌ Wrong OTP test FAILED:', err.message);
    }
  }

  pool.end();
}

runTests();
