import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://hopefusionafrica.com';
  return [
    { url: base,                     lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/register`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/login`,          lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/grants`,         lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/matching`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/marketplace`,    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${base}/elearning`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/mentorship`,     lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${base}/mentor`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/download`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/forgot-password`,lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ];
}
