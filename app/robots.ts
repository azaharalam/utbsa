import type { MetadataRoute } from 'next';

/**
 * Staging must never be indexed. A test site appearing in Google search
 * results for "UTBSA" is worse than having no site at all — members find it,
 * sign up there, and wonder why nothing works.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.STAGING === 'true') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://utoledobsa.org';
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin/', '/portal/', '/auth/', '/pay/'] },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
