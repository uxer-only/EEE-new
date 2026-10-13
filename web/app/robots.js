export const dynamic = 'force-dynamic';

import { SITE_URL } from '@/lib/site';

export default function robots() {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/dashboard', '/messages', '/payment-success', '/subscribe', '/verify-email', '/reset-password', '/app/'],
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
