/**
 * HopeFusion Africa — Sentry Instrumentation (Backend)
 *
 * This file MUST be imported before any other application code.
 * It initialises Sentry for the Node.js Express server, enabling:
 *  - Automatic error capture & stack traces
 *  - HTTP request tracing
 *  - Unhandled rejection / uncaught exception capture
 *  - PostgreSQL / Redis performance spans (via OpenTelemetry)
 *
 * Usage — add --import flag to start scripts:
 *   node --import ./src/instrument.js src/server.js
 */

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const isProduction = process.env.NODE_ENV === 'production';
const isDebug = process.env.SENTRY_DEBUG === 'true';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.npm_package_version ?? 'unknown',

  // Only send events in production (or explicitly in debug mode)
  enabled: isProduction || isDebug,

  // Performance tracing — 20% of requests in prod
  tracesSampleRate: isProduction ? 0.2 : 1.0,

  // CPU profiling — 10% of sampled transactions
  profilesSampleRate: isProduction ? 0.1 : 1.0,

  integrations: [
    // Profiling
    nodeProfilingIntegration(),

    // Capture console.error calls
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
  ],

  // Scrub sensitive request data before sending
  beforeSend(event, hint) {
    // Never send in test mode
    if (process.env.NODE_ENV === 'test') return null;

    // Strip Authorization headers from request data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }

    // Strip sensitive fields from request body
    if (event.request?.data && typeof event.request.data === 'object') {
      const body = event.request.data;
      ['password', 'otp', 'token', 'refresh_token', 'secret'].forEach(field => {
        if (field in body) body[field] = '[Filtered]';
      });
    }

    return event;
  },
});

// Export Sentry for manual captures in route handlers
export { Sentry };
