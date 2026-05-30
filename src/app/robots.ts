import { MetadataRoute } from 'next';

const SITE_URL = process.env.SITE_URL?.trim() || 'https://insightnote.ai';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/account'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
