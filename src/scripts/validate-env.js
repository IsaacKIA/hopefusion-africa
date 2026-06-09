/**
 * HopeFusion Africa — Environment Variable Validator
 * Run: node src/scripts/validate-env.js
 * Called automatically on server start if NODE_ENV=production
 */

const REQUIRED = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
];

const RECOMMENDED = [
  'PAYSTACK_SECRET_KEY',
  'FLUTTERWAVE_SECRET_KEY',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'ANTHROPIC_API_KEY',
  'SMTP_HOST',
  'FRONTEND_URL',
];

export function validateEnv() {
  const missing   = REQUIRED.filter(k => !process.env[k]);
  const warnings  = RECOMMENDED.filter(k => !process.env[k]);

  if (missing.length) {
    console.error('❌ Missing REQUIRED environment variables:');
    missing.forEach(k => console.error(`   • ${k}`));
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }

  if (warnings.length) {
    console.warn('⚠️  Missing RECOMMENDED environment variables (some features disabled):');
    warnings.forEach(k => console.warn(`   • ${k}`));
  }

  if (!missing.length) {
    console.log(`✅ Environment validated (${REQUIRED.length} required, ${RECOMMENDED.length - warnings.length}/${RECOMMENDED.length} recommended set)`);
  }
}

// Run directly
validateEnv();
