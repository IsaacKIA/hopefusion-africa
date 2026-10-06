import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // ─── Docker / Vercel standalone output ───────────────────────────────────
  output: "standalone",

  // ─── Turbopack workspace root (monorepo) ─────────────────────────────────
  turbopack: {
    root: __dirname,
  },

  // ─── Compression ─────────────────────────────────────────────────────────
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  // ─── React strict mode (catches hydration bugs early) ────────────────────
  reactStrictMode: true,

  // ─── Image optimization ──────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],       // AVIF first (40% smaller than WebP)
    minimumCacheTTL: 60 * 60 * 24 * 30,          // 30-day CDN cache for images
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'none'; style-src 'unsafe-inline'",
  },

  // ─── Experimental perf flags ─────────────────────────────────────────────
  experimental: {
    // Optimise CSS — inlines critical CSS, reduces render-blocking
    optimizeCss: true,
    // Faster server-side rendering
    serverComponentsHmrCache: true,
  },

  // ─── HTTP Security + performance headers ─────────────────────────────────
  async headers() {
    return [
      // Global security headers
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control",  value: "on" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          { key: "X-XSS-Protection",         value: "1; mode=block" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload" },
          // Tell Googlebot this is an African platform (Ghana-first)
          { key: "Content-Language", value: "en-GH" },
        ],
      },

      // Public images — 30-day cache
      {
        source: "/images/(.*)",
        headers: [
          { key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },

      // Icons / PWA assets — 30-day cache
      {
        source: "/icons/(.*)",
        headers: [
          { key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400" },
        ],
      },

      // Service Worker — NEVER cache (must always revalidate)
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control",          value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },

      // Manifest — short cache (1 day) so updates roll out quickly
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
    ];
  },

  // ─── Redirects ───────────────────────────────────────────────────────────
  async redirects() {
    return [
      // /app → /download (app store redirect)
      { source: "/app", destination: "/download", permanent: false },
      // www → non-www canonical (preserves full path and query string)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.hopefusionafrica.com" }],
        destination: "https://hopefusionafrica.com/:path*",
        permanent: true,
      },
    ];
  },

  // ─── Browser environment variables ───────────────────────────────────────
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: process.env.NODE_ENV !== "production",

  sourcemaps: {
    disable: process.env.NODE_ENV !== "production",
  },

  webpack: {
    autoInstrumentServerFunctions: true,
    autoInstrumentMiddleware: true,
    autoInstrumentAppDirectory: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },

  tunnelRoute: "/monitoring",
});
