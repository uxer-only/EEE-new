import { PublicPage } from '@/components/site/Shell';
import { listProviders } from '@/lib/server-api';
import BrowseClient from './BrowseClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const city = ((await searchParams).city || '').trim();
  return city
    ? {
        title: `Elite escorts in ${city}`,
        description: `Verified independent escorts and agency companions in ${city}. Browse profiles with photos, rates and availability, and contact them directly.`,
        alternates: { canonical: `/browse?city=${encodeURIComponent(city)}` },
      }
    : {
        title: 'Browse elite escorts',
        description: 'Browse verified independent escorts and agency companions across Europe. Filter by city, category, services, rates and appearance.',
        alternates: { canonical: '/browse' },
      };
}

export default async function BrowsePage({ searchParams }) {
  const city = ((await searchParams).city || '').trim();
  // One shuffle seed per visit: the order changes on every visit but stays stable while filtering.
  const seed = Math.floor(Math.random() * 1e9);
  const providers = await listProviders({ seed, city });
  return (
    <PublicPage bg="glow" mainClass="pub-browse">
      <BrowseClient initial={providers} initialCity={city} seed={seed} />
    </PublicPage>
  );
}
