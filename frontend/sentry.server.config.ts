import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',

  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

  // Sample traces at a lower rate server-side to reduce overhead
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture all unhandled promise rejections
  integrations: [
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
  ],

  beforeSend(event) {
    if (process.env.NODE_ENV === 'test') return null;
    return event;
  },
});
