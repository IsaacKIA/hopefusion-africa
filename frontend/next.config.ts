import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Required for Docker standalone deployment
  output: "standalone",

  // Fix Turbopack workspace root warning (monorepo: root lockfile vs frontend lockfile)
  turbopack: {
    root: __dirname,
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control",  value: "on" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },

  // Allow images from Cloudinary + Supabase
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },

  // Compress output
  compress: true,

  // Power-by header removal
  poweredByHeader: false,

  // Production source maps off (Sentry uploads them separately)
  productionBrowserSourceMaps: false,

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_URL:            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY:   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry organisation & project (set in CI environment)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress Sentry CLI output in local dev
  silent: process.env.NODE_ENV !== 'production',

  // Upload source maps only in production CI builds
  sourcemaps: {
    disable: process.env.NODE_ENV !== 'production',
  },

  // Automatically instrument Next.js API routes and server components
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

  // Tree-shake Sentry debug code in production
  disableLogger: true,

  // Tunnel Sentry requests through /monitoring to bypass ad-blockers
  tunnelRoute: '/monitoring',
});

