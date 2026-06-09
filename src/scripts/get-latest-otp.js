import { db as pool, redis } from '../config/db.js';

async function main() {
  try {
    // Connect to PG and find the latest registered user
    const { rows } = await pool.query('SELECT id, email, first_name, role, is_verified FROM users ORDER BY created_at DESC LIMIT 5');
    if (!rows.length) {
      console.log('No users found in database.');
      await pool.end();
      await redis.quit();
      return;
    }

    console.log('--- Latest 5 registered users ---');
    for (const user of rows) {
      const raw = await redis.get(`verify:${user.id}`);
      let code = null;
      if (raw) {
        try {
          code = JSON.parse(raw);
        } catch {
          code = raw;
        }
      }
      console.log(`ID: ${user.id} | Email: ${user.email} | Name: ${user.first_name} | Role: ${user.role} | Verified: ${user.is_verified} | OTP Code: ${code}`);
    }

  } catch (err) {
    console.error('Error fetching OTP:', err);
  } finally {
    await pool.end();
    // Use quit or disconnect to close Redis
    try {
      await redis.quit();
    } catch {
      try {
        await redis.disconnect();
      } catch {}
    }
  }
}

main();
