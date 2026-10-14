'use client';

/*
 * Page frame for the public pages: header, footer, age check and the dark backgrounds.
 * Same look and behaviour as PublicPage in the React app (frontend/src/components/site/Shell.jsx).
 *
 * Links to pages that still live in the React app (log in, advertise, dashboard) are plain <a> links,
 * so the browser loads that app. Links between public pages use next/link.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';
import { useMe } from '@/lib/useMe';
import { logout } from '@/lib/api';

/* ---------- header ---------- */
export function SiteNav({ theme = 'dark' }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, setUser } = useMe();
  const pathname = usePathname();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const doLogout = async () => {
    try { await logout(); } catch (e) { /* signed out locally anyway */ }
    setUser(null);
    window.location.assign('/');
  };

  // app: true = page of the React app (full page load)
  const items = user
    ? [
        { to: '/browse', label: 'Elite Escorts' },
        { to: user.role === 'admin' ? '/admin' : '/dashboard', label: 'Dashboard', app: true },
        { label: 'Log out', onClick: doLogout, cta: true },
      ]
    : [
        { to: '/browse', label: 'Elite Escorts' },
        { to: '/login', label: 'Log in', app: true },
        { to: '/register/provider', label: 'Advertise', cta: true, app: true },
      ];

  const render = (it) => {
    const cls = it.cta ? 'x-snc' : 'x-sn';
    if (it.onClick && !it.to) {
      return <button key={it.label} type="button" className={cls} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>;
    }
    const current = pathname === it.to || (it.to !== '/' && pathname.startsWith(it.to + '/')) ? 'page' : undefined;
    if (it.app) return <a key={it.label} href={it.to} className={cls} aria-current={current}>{it.label}</a>;
    return <Link key={it.label} href={it.to} className={cls} aria-current={current} onClick={() => setOpen(false)}>{it.label}</Link>;
  };

  return (
    <>
      <header className={`x-nav ${theme}${scrolled ? ' scrolled' : ''}${open ? ' open' : ''}`} data-testid="header">
        <span className="x-brand">
          <Link href="/" className="x-logo" data-testid="logo-link">Elite Escorts Europe</Link>
        </span>
        <nav aria-label="Main" className="x-navlinks">{items.map(render)}</nav>
        <button type="button" className="x-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid="mobile-menu-toggle">
          {open ? <Icon.close /> : <Icon.burger />}
        </button>
      </header>
      {open && (
        <nav aria-label="Main" className={`x-menu ${theme}`} data-testid="mobile-menu">{items.map(render)}</nav>
      )}
    </>
  );
}

/* ---------- footer ---------- */
export function SiteFoot({ theme = 'dark' }) {
  const pathname = usePathname();
  const cur = (to) => (pathname === to ? 'page' : undefined);
  return (
    <footer className={`x-foot ${theme}`} data-testid="footer">
      <div className="copy">
        <span>© {new Date().getFullYear()} Elite Escorts Europe. All rights reserved.</span>
        <span className="x-18">18+ only</span>
      </div>
      <nav aria-label="Footer">
        <Link href="/terms" aria-current={cur('/terms')} data-testid="footer-terms-link">Terms, Privacy &amp; Cookies</Link>
        <Link href="/advertising-prices" aria-current={cur('/advertising-prices')} data-testid="footer-advertising-link">Advertisement plans</Link>
        <Link href="/contact" aria-current={cur('/contact')} data-testid="footer-contact-link">Contact</Link>
        <a href="/admin/login" data-testid="footer-admin-link">Admin</a>
      </nav>
    </footer>
  );
}

/* ---------- age check (first visit, any public page) ---------- */
// The server always renders the check. A tiny script in app/layout.js adds the class "age-ok" to <html>
// before the page is shown when the visitor already confirmed, so returning visitors never see it flash.
export const AGE_KEY = 'ageConfirmed';
export function AgeGate() {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    let ok = false;
    try { ok = !!localStorage.getItem(AGE_KEY); } catch (e) { ok = false; }
    if (ok) setOpen(false);
  }, []);
  useEffect(() => {
    if (!open || document.documentElement.classList.contains('age-ok')) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  const enter = () => {
    try { localStorage.setItem(AGE_KEY, 'true'); } catch (e) { /* private mode: ask again next visit */ }
    document.documentElement.classList.add('age-ok');
    setOpen(false);
  };
  return (
    <div className="x-age">
      <div className="bgimg" aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.jpg" />
          <img src="/hero-bg.jpg" alt="" />
        </picture>
      </div>
      <div className="box x-glass" role="dialog" aria-modal="true" aria-labelledby="age-title" aria-describedby="age-desc">
        <span className="ic">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="M12 8v4" /><path d="M12 15.5h.01" /></svg>
        </span>
        <span className="ey">Attention · 18+ only</span>
        <h2 id="age-title">Are you 18 or older?</h2>
        <p id="age-desc">This website contains adult content and is intended for individuals 18 years of age or older. By entering, you confirm that you are of legal age in your jurisdiction.</p>
        <div className="acts">
          <button type="button" className="x-btn primary" onClick={enter} data-testid="age-confirm-button">I am 18 or older – Enter</button>
          <a className="x-btn leave" href="https://www.google.com" rel="noopener noreferrer" data-testid="leave-website-button">Leave website</a>
        </div>
        <p className="fine">By entering you accept our <Link href="/terms">Terms, Privacy &amp; Cookies</Link>.</p>
      </div>
    </div>
  );
}

/* ---------- page shell ---------- */
/** Dark public page. bg: 'photo' (hero photo fixed behind), 'glow' (dark with wine glow) or 'plain'. */
export function PublicPage({ bg = 'glow', children, mainClass = '', mainStyle, noAgeGate = false }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (bg !== 'photo') return undefined;
    const on = () => setScrolled(window.scrollY > window.innerHeight * 0.5);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [bg]);
  return (
    <div className="x-page dark">
      {bg === 'photo' && (
        <div className={`x-photo${scrolled ? ' scrolled' : ''}`} aria-hidden="true">
          <link rel="preload" as="image" href="/hero-bg-mobile.webp" media="(max-width: 767px)" />
          <link rel="preload" as="image" href="/hero-bg.webp" media="(min-width: 768px)" />
          <picture>
            <source media="(max-width: 767px)" type="image/webp" srcSet="/hero-bg-mobile.webp" />
            <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.jpg" />
            <source type="image/webp" srcSet="/hero-bg.webp" />
            <img src="/hero-bg.jpg" alt="" fetchPriority="high" />
          </picture>
          <div className="shade" />
          <div className="dim" />
        </div>
      )}
      {bg === 'glow' && <div className="x-glowbg" aria-hidden="true" />}
      <SiteNav theme="dark" />
      <main className={`x-main ${mainClass}`} style={mainStyle}>{children}</main>
      <SiteFoot theme="dark" />
      {!noAgeGate && <AgeGate />}
    </div>
  );
}
