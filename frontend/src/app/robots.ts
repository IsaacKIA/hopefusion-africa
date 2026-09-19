import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/grants', '/matching', '/marketplace', '/elearning', '/mentorship', '/mentor', '/register', '/login', '/download'],
        disallow: ['/dashboard', '/admin', '/onboard', '/startup', '/investor', '/student', '/government', '/corporate', '/service-provider', '/welcome', '/verify', '/api/'],
      },
    ],
    sitemap: 'https://hopefusionafrica.com/sitemap.xml',
    host: 'https://hopefusionafrica.com',
  };
}
