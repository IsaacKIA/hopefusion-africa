import pg from 'pg';
const { Client } = pg;

const url1 = "postgresql://postgres.idlmeiigyebywjzrpbnv:Kiastartup2026%231@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
const url2 = "postgresql://postgres.idlmeiigyebywjzrpbnv:Kiastartup2026%231@db.idlmeiigyebywjzrpbnv.supabase.co:5432/postgres";

async function testUrl(name, connectionString) {
  console.log(`Testing connection for ${name}...`);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`   ✅ ${name} connected successfully!`);
    const res = await client.query('SELECT version()');
    console.log(`   Query response: ${res.rows[0].version}`);
    await client.end();
  } catch (err) {
    console.error(`   ❌ ${name} failed to connect:`, err.message);
  }
}

async function run() {
  await testUrl("Pooler (Port 6543)", url1);
  await testUrl("Direct (Port 5432)", url2);
}

run();
