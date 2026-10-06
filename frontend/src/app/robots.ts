import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = 'https://hopefusionafrica.com';

  return {
    rules: [
      // ─── Default: allow all crawlers on public pages ──────────────────
      {
        userAgent: '*',
        allow: [
          '/',
          '/grants',
          '/matching',
          '/marketplace',
          '/elearning',
          '/mentorship',
          '/mentor',
          '/register',
          '/login',
          '/download',
          '/forgot-password',
          '/_next/static/',    // allow static assets to be indexed for speed signals
          '/icons/',
          '/images/',
        ],
        disallow: [
          '/dashboard',
          '/admin',
          '/onboard',
          '/startup',
          '/investor',
          '/student',
          '/government',
          '/corporate',
          '/service-provider',
          '/welcome',
          '/verify',
          '/reset-password',
          '/api/',
          '/monitoring',       // Sentry tunnel route
          '/_next/data/',      // Next.js internal data routes
          '/offline',
        ],
        crawlDelay: 1,
      },

      // ─── Googlebot — no crawl delay, allow full public crawl ─────────
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/grants',
          '/matching',
          '/marketplace',
          '/elearning',
          '/mentorship',
          '/mentor',
          '/register',
          '/login',
          '/download',
          '/forgot-password',
        ],
        disallow: [
          '/dashboard',
          '/admin',
          '/onboard',
          '/api/',
          '/monitoring',
          '/_next/data/',
        ],
      },

      // ─── Googlebot-Image — allow all public images ───────────────────
      {
        userAgent: 'Googlebot-Image',
        allow: ['/images/', '/icons/'],
        disallow: [],
      },

      // ─── Bingbot ─────────────────────────────────────────────────────
      {
        userAgent: 'Bingbot',
        allow: ['/', '/grants', '/matching', '/marketplace', '/elearning', '/mentorship'],
        disallow: ['/dashboard', '/admin', '/api/'],
        crawlDelay: 2,
      },

      // ─── Block known scrapers & bad bots ─────────────────────────────
      {
        userAgent: 'SemrushBot',
        disallow: ['/'],
      },
      {
        userAgent: 'AhrefsBot',
        disallow: ['/'],
      },
      {
        userAgent: 'MJ12bot',
        disallow: ['/'],
      },
      {
        userAgent: 'DotBot',
        disallow: ['/'],
      },
    ],

    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
