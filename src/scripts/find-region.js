import pg from 'pg';

const regions = ['eu-west-1', 'eu-west-2', 'eu-central-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ap-southeast-1', 'ap-southeast-2', 'sa-east-1'];
const password = 'Kiastartup2026#1';
const projectRef = 'ylwpurwprwesddiqnkav';

async function main() {
  for (const r of regions) {
    const host = `aws-0-${r}.pooler.supabase.com`;
    const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:6543/postgres`;
    const client = new pg.Client({
      connectionString,
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      console.log(`FOUND REGION: ${r}`);
      await client.end();
      break;
    } catch (e) {
      if (e.message.includes('tenant/user') && e.message.includes('not found')) {
        // wrong region, continue search
      } else {
        console.log(`FOUND REGION (auth error means region is correct): ${r} -> ${e.message}`);
        await client.end().catch(() => {});
        break;
      }
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
