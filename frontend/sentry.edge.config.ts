import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',

  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

  // Edge runtime has lower resources — keep traces minimal
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
});
