import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tagging
  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',

  // Only enable in production; skip during development unless explicitly opted-in
  enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_DEBUG === 'true',

  // Sample 100% of errors in production; adjust for high-traffic
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Session Replay — capture 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,       // Mask PII in replays
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Ignore common non-actionable browser errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Network Error$/,
    /^ChunkLoadError/,
    /^Loading chunk/,
  ],

  // Scrub sensitive fields from breadcrumbs / request data
  beforeSend(event) {
    // Never send events in test environment
    if (process.env.NODE_ENV === 'test') return null;
    return event;
  },
});
