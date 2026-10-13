import Link from 'next/link';
import { PublicPage } from '@/components/site/Shell';
import ProfileTile from '@/components/ProfileTile';
import { Icon } from '@/components/icons';
import { listProviders } from '@/lib/server-api';
import { SITE_URL, SITE_NAME } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: `${SITE_NAME} — Discreet, curated companionship` },
  description: 'Browse verified independent escorts and agency companions in a discreet, premium directory. Contact them directly by phone, message or e-mail.',
  alternates: { canonical: '/' },
};

const WHY = [
  {
    title: 'Verified profiles',
    text: 'The green tick shows the advertiser has completed our verification, so you know the profile is genuine.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  },
  {
    title: 'Discreet by design',
    text: 'Browse without an account and get in touch directly by phone, message or e-mail, on your own terms.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
  },
  {
    title: 'Why advertise with us',
    text: 'Independent companions and agencies present themselves in a curated, premium environment.',
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 10H5z" /></svg>,
    link: { to: '/advertising-prices', label: 'See advertisement plans' },
  },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
};

export default async function Home() {
  const providers = (await listProviders()).slice(0, 10);

  return (
    <PublicPage bg="photo" mainClass="pub-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <section className="hero" aria-labelledby="hero-title" data-testid="hero-section">
        <span className="x-eyebrow">Discreet · Curated · Exceptional</span>
        <h1 id="hero-title" className="x-serif" data-testid="hero-title">
          Bringing your secret desire<br /><span>closer to you</span>
        </h1>
        <p data-testid="hero-subtitle">Connect with verified independent professionals in a safe, premium environment.</p>
        <div className="ctas">
          <Link href="/browse" className="x-btn lg primary" data-testid="hero-browse">Browse profiles <Icon.arrow /></Link>
          <a href="/register/provider" className="x-btn lg glass" data-testid="hero-advertise">Advertise with us</a>
        </div>
      </section>

      <section className="x-wrap latest" aria-labelledby="latest-title" data-testid="latest-profiles-section">
        <div className="x-sechead">
          <span className="x-eyebrow">Discover</span>
          <h2 id="latest-title" className="x-h2">Latest profiles</h2>
        </div>
        <div className="x-tiles c5">
          {providers.map((p, i) => <ProfileTile key={p.provider_id} provider={p} index={i} testId={`profile-card-${i}`} />)}
        </div>
        <div className="more">
          <Link href="/browse" className="x-btn glass" data-testid="cta-browse-button">All profiles <Icon.arrow /></Link>
        </div>
      </section>

      <section className="x-wrap why" aria-labelledby="why-title">
        <div className="x-sechead">
          <span className="x-eyebrow">Why Elite Escorts Europe</span>
          <h2 id="why-title" className="x-h2">A curated, discreet directory</h2>
        </div>
        <div className="cards">
          {WHY.map((w) => (
            <div key={w.title} className="x-glass card">
              <span className="ic">{w.icon}</span>
              <h3>{w.title}</h3>
              <p>{w.text}</p>
              {w.link && <Link href={w.link.to} className="lnk">{w.link.label} <Icon.arrow /></Link>}
            </div>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}
