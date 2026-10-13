import Link from 'next/link';
import { PublicPage } from '@/components/site/Shell';
import { Icon } from '@/components/icons';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFound() {
  return (
    <PublicPage bg="glow" mainClass="pub-browse">
      <div className="x-wrap">
        <div className="x-glass empty" style={{ marginTop: 48 }} data-testid="not-found">
          <span className="ic"><Icon.search width="24" height="24" /></span>
          <h1 style={{ fontSize: 24, margin: 0 }}>This page doesn&apos;t exist</h1>
          <p>The profile may have been removed, or the link is wrong. Browse the profiles that are online now.</p>
          <Link href="/browse" className="x-btn white">Browse profiles</Link>
        </div>
      </div>
    </PublicPage>
  );
}
