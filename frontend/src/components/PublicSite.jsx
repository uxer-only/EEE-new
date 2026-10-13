import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

/*
 * The public pages (Home, Browse, profiles, plans, contact, terms) are served by the Next.js site in ../web.
 * When this app is asked for one of them (a link inside the app, or the back button), load it from that site.
 *
 * REACT_APP_SITE_URL: address of the Next.js site. Leave it empty when this app is served by that site
 * (the normal set-up). Set it to http://localhost:3000 when running this app on its own with `yarn start`.
 */
const SITE_URL = (process.env.REACT_APP_SITE_URL || '').replace(/\/$/, '');

// Addresses that belong to this app (keep in sync with APP_ROUTES in web/next.config.mjs).
const APP_PREFIXES = ['/login', '/admin', '/register', '/verify-email', '/forgot-password', '/reset-password', '/dashboard', '/messages', '/subscribe', '/payment-success'];
export const isAppPath = (p) => APP_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));

export default function PublicSite() {
  const { pathname, search, hash } = useLocation();
  const target = `${SITE_URL}${pathname.startsWith('/app/') ? '/' : pathname}${search}${hash}`;
  // Guard against a reload loop when the site isn't configured: only jump once per address.
  const looped = (() => {
    try {
      const last = JSON.parse(sessionStorage.getItem('eee-public-jump') || 'null');
      return !!last && last.to === target && Date.now() - last.at < 4000;
    } catch (e) { return false; }
  })();
  const unknown = isAppPath(pathname) || looped;

  useEffect(() => {
    if (unknown) return;
    try { sessionStorage.setItem('eee-public-jump', JSON.stringify({ to: target, at: Date.now() })); } catch (e) { /* ignore */ }
    window.location.replace(target);
  }, [unknown, target]);

  if (!unknown) return null;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>This page doesn&apos;t exist</h1>
        <p style={{ marginBottom: 20 }}>The link may be wrong or the page was moved.</p>
        {isAppPath(pathname) ? <Link to="/dashboard" className="x-btn primary">Go to your dashboard</Link> : <a href={`${SITE_URL}/`} className="x-btn primary">Go to the home page</a>}
      </div>
    </main>
  );
}
