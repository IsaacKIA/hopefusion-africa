import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://hopefusionafrica.com';
  const now = new Date();

  return [
    // ─── Core / highest-priority ────────────────────────────────────────────
    { url: `${base}`,              lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/register`,     lastModified: now, changeFrequency: 'monthly', priority: 0.95 },
    { url: `${base}/login`,        lastModified: now, changeFrequency: 'monthly', priority: 0.85 },

    // ─── High-value feature pages ────────────────────────────────────────────
    { url: `${base}/grants`,       lastModified: now, changeFrequency: 'daily',   priority: 0.95 },
    { url: `${base}/matching`,     lastModified: now, changeFrequency: 'daily',   priority: 0.95 },
    { url: `${base}/marketplace`,  lastModified: now, changeFrequency: 'daily',   priority: 0.90 },
    { url: `${base}/mentorship`,   lastModified: now, changeFrequency: 'weekly',  priority: 0.88 },
    { url: `${base}/elearning`,    lastModified: now, changeFrequency: 'weekly',  priority: 0.85 },
    { url: `${base}/mentor`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.80 },

    // ─── Support & app pages ─────────────────────────────────────────────────
    { url: `${base}/download`,         lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${base}/forgot-password`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.30 },
  ];
}
