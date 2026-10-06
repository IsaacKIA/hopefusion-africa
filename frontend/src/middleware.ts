import { NextRequest, NextResponse } from 'next/server';

/**
 * HopeFusion Africa — Edge Middleware
 *
 * Responsibilities:
 * 1. Canonical enforcement: www → non-www (301)
 * 2. HTTP → HTTPS redirect in production
 * 3. Security & performance response headers
 * 4. Bot / crawler optimisation hints
 */

// Public routes that should be fully crawlable
const PUBLIC_PATHS = new Set([
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
]);

export function middleware(request: NextRequest) {
  const { pathname, host, protocol } = request.nextUrl;
  const url = request.nextUrl.clone();

  // ─── 1. www → non-www canonical redirect (301) ─────────────────────────
  if (host.startsWith('www.')) {
    url.host = host.replace(/^www\./, '');
    return NextResponse.redirect(url, { status: 301 });
  }

  // ─── 2. HTTP → HTTPS in production ────────────────────────────────────
  if (process.env.NODE_ENV === 'production' && protocol === 'http:') {
    url.protocol = 'https:';
    return NextResponse.redirect(url, { status: 301 });
  }

  // ─── 3. Continue with next response & inject headers ──────────────────
  const response = NextResponse.next();

  // Vary header — important for CDN caching by Accept-Encoding
  response.headers.set('Vary', 'Accept-Encoding, Accept');

  // Cache-Control per path type
  if (pathname.startsWith('/_next/static/')) {
    // Static assets: immutable for 1 year
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (pathname.startsWith('/images/') || pathname.startsWith('/icons/')) {
    // Images & icons: 30-day cache with stale-while-revalidate
    response.headers.set('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
  } else if (pathname === '/manifest.json') {
    response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
  } else if (pathname === '/sw.js') {
    // Service worker must never be cached
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Service-Worker-Allowed', '/');
  } else if (PUBLIC_PATHS.has(pathname)) {
    // Public pages: short cache, always revalidate (ISR-friendly)
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=3600, stale-while-revalidate=59, stale-if-error=3600'
    );
  }

  // ─── 4. Content-Language header (geo signal to Googlebot) ─────────────
  response.headers.set('Content-Language', 'en-GH');

  return response;
}

export const config = {
  /*
   * Run middleware on all routes EXCEPT:
   * - Next.js internal paths (_next/*)
   * - API routes
   * - Static files with extensions
   * - Sentry tunnel
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|monitoring|api/).*)',
  ],
};
