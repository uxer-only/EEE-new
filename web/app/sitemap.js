import { listProviders } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** sitemap.xml: the public pages, every city with live profiles, and every live profile. */
export default async function sitemap() {
  const providers = await listProviders();
  const now = new Date();
  const cities = [...new Set(providers.map((p) => (p.location?.city || '').trim()).filter(Boolean))].sort();
  const lastChange = (p) => {
    const d = new Date(p.updated_at || p.created_at || now);
    return Number.isNaN(d.getTime()) ? now : d;
  };
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/browse`, changeFrequency: 'daily', priority: 0.9 },
    ...cities.map((c) => ({ url: `${SITE_URL}/browse?city=${encodeURIComponent(c)}`, changeFrequency: 'daily', priority: 0.8 })),
    ...providers.map((p) => ({ url: `${SITE_URL}/providers/${p.provider_id}`, lastModified: lastChange(p), changeFrequency: 'weekly', priority: 0.7 })),
    { url: `${SITE_URL}/advertising-prices`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
