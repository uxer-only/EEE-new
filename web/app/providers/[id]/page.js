import { cache } from 'react';
import { notFound } from 'next/navigation';
import { PublicPage } from '@/components/site/Shell';
import { getProvider } from '@/lib/server-api';
import { SITE_URL } from '@/lib/site';
import ProfileClient from './ProfileClient';
import '@/styles/profile.css';

export const dynamic = 'force-dynamic';

// The page and its metadata need the same profile: fetch it once per request.
const loadProvider = cache((id) => getProvider(id));

const clip = (text, max) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await loadProvider(id);
  if (!p) return { title: 'Profile not found', robots: { index: false } };
  const city = p.location?.city;
  const name = `${p.display_name}${p.age ? `, ${p.age}` : ''}`;
  const title = city ? `${name} – Elite escort in ${city}` : `${name} – Elite escort`;
  const description = clip(p.bio || p.essence, 160)
    || `${p.display_name} is an elite escort${city ? ` in ${city}` : ''}. See photos, rates and availability, and get in touch directly.`;
  const photo = (p.photos || [])[0];
  return {
    title,
    description,
    alternates: { canonical: `/providers/${p.provider_id}` },
    openGraph: { title, description, type: 'profile', url: `/providers/${p.provider_id}`, images: photo ? [{ url: photo }] : undefined },
    // Profiles whose plan has ended stay reachable by link but are kept out of search results.
    robots: p.featured_active || p.in_grace ? undefined : { index: false, follow: true },
  };
}

export default async function ProfilePage({ params }) {
  const { id } = await params;
  const p = await loadProvider(id);
  if (!p) notFound();

  const city = p.location?.city;
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Elite Escorts', item: `${SITE_URL}/browse` },
      ...(city ? [{ '@type': 'ListItem', position: 2, name: city, item: `${SITE_URL}/browse?city=${encodeURIComponent(city)}` }] : []),
      { '@type': 'ListItem', position: city ? 3 : 2, name: p.display_name, item: `${SITE_URL}/providers/${p.provider_id}` },
    ],
  };

  return (
    <PublicPage bg="glow" mainClass="pub-profile">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs).replace(/</g, '\\u003c') }} />
      <ProfileClient provider={p} />
    </PublicPage>
  );
}
