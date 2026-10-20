import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import '@/styles/site.css';

/* ---------- small icon set used across the redesign ---------- */
export const Icon = {
  arrow: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  ),
  back: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
  ),
  crown: (p) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
  ),
  verified: ({ size = 14, ...p }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified" style={{ flexShrink: 0 }} {...p}><circle cx="12" cy="12" r="11" fill="#2F7A55" /><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  burger: (p) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
  close: (p) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  pin: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
  ),
  search: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
  ),
  check: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><path d="m5 12 5 5 9-10" /></svg>
  ),
  info: (p) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  ),
};

/* ---------- header ---------- */
export function SiteNav({ theme = 'dark', links = null, admin = null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const doLogout = async () => {
    try { await logout(); } finally { navigate('/'); }
  };

  const adminItems = admin && [
    { to: '/admin', label: 'Overview', key: 'overview' },
    { to: '/admin/independents', label: 'Independents', key: 'independents' },
    { to: '/admin/agencies', label: 'Agencies', key: 'agencies' },
    { to: '/admin/profiles/new', label: 'Add profile', key: 'profiles' },
    { sep: true, label: 'sep' },
    { href: '/browse', label: 'View site', ext: true },
    { label: 'Log out', onClick: doLogout, cta: true },
  ];
  const items = adminItems || links || (user
    ? [
        { to: '/browse', label: 'Elite Escorts' },
        { to: user.role === 'admin' ? '/admin' : '/dashboard', label: 'Dashboard' },
        { label: 'Log out', onClick: doLogout, cta: true },
      ]
    : [
        { to: '/browse', label: 'Elite Escorts' },
        { to: '/login', label: 'Log in' },
        { to: '/register/provider', label: 'Advertise', cta: true },
      ]);

  const render = (it) => {
    const cls = it.cta ? 'x-snc' : 'x-sn';
    if (it.sep) return <span key="sep" className="x-sep" aria-hidden="true" />;
    if (it.href) {
      return <a key={it.label} href={it.href} className={`${cls} ext`} target="_blank" rel="noopener noreferrer">{it.label}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg></a>;
    }
    const current = (admin ? it.key === admin : it.to && (pathname === it.to || (it.to !== '/' && pathname.startsWith(it.to + '/')))) ? 'page' : undefined;
    if (it.onClick && !it.to) {
      return <button key={it.label} type="button" className={cls} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</button>;
    }
    return <Link key={it.label} to={it.to} className={cls} aria-current={current} onClick={() => setOpen(false)}>{it.label}</Link>;
  };

  return (
    <>
      <header className={`x-nav ${theme}${scrolled ? ' scrolled' : ''}${open ? ' open' : ''}`} data-testid="header">
        <span className="x-brand">
          <Link to={admin ? '/admin' : '/'} className="x-logo" data-testid="logo-link">Elite Escorts Europe</Link>
          {admin && <span className="x-adm">Admin</span>}
        </span>
        <nav aria-label={admin ? 'Admin' : 'Main'} className={`x-navlinks${admin ? ' is-adm' : ''}`}>{items.map(render)}</nav>
        <button type="button" className="x-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid="mobile-menu-toggle">
          {open ? <Icon.close /> : <Icon.burger />}
        </button>
      </header>
      {open && (
        <nav aria-label={admin ? 'Admin' : 'Main'} className={`x-menu ${theme}${admin ? ' is-adm' : ''}`} data-testid="mobile-menu">{items.map(render)}</nav>
      )}
    </>
  );
}

/* ---------- footer ---------- */
export function SiteFoot({ theme = 'dark' }) {
  const { pathname } = useLocation();
  const cur = (to) => (pathname === to ? 'page' : undefined);
  return (
    <footer className={`x-foot ${theme}`} data-testid="footer">
      <div className="copy">
        <span>© {new Date().getFullYear()} Elite Escorts Europe. All rights reserved.</span>
        <span className="x-18">18+ only</span>
      </div>
      <nav aria-label="Footer">
        <Link to="/terms" aria-current={cur('/terms')} data-testid="footer-terms-link">Terms, Privacy &amp; Cookies</Link>
        <Link to="/advertising-prices" aria-current={cur('/advertising-prices')} data-testid="footer-advertising-link">Advertisement plans</Link>
        <Link to="/contact" aria-current={cur('/contact')} data-testid="footer-contact-link">Contact</Link>
        <Link to="/admin/login" aria-current={cur('/admin/login')} data-testid="footer-admin-link">Admin</Link>
      </nav>
    </footer>
  );
}

/* ---------- age check (first visit, any public page) ---------- */
const AGE_KEY = 'ageConfirmed';
export function AgeGate() {
  const [open, setOpen] = useState(() => {
    try { return !localStorage.getItem(AGE_KEY); } catch (e) { return true; }
  });
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  const enter = () => {
    try { localStorage.setItem(AGE_KEY, 'true'); } catch (e) { /* private mode: ask again next visit */ }
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
        <p className="fine">By entering you accept our <Link to="/terms">Terms, Privacy &amp; Cookies</Link>.</p>
      </div>
    </div>
  );
}

/* ---------- page shells ---------- */
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
          <picture>
            <source media="(max-width: 767px)" type="image/webp" srcSet="/hero-bg-mobile.webp" />
            <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.jpg" />
            <source type="image/webp" srcSet="/hero-bg.webp" />
            <img src="/hero-bg.jpg" alt="" fetchpriority="high" />
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

/** Light advertiser / agency / admin page. */
export function LightPage({ children, links, admin = null, mainClass = '', mainStyle }) {
  return (
    <div className="x-page light">
      <SiteNav theme="light" links={links} admin={admin} />
      <main className={`x-main ${mainClass}`} style={{ paddingTop: 40, ...mainStyle }}>{children}</main>
      <SiteFoot theme="light" />
    </div>
  );
}

/* ---------- profile tile ---------- */
const TINTS = [
  ['#7A5468', '#3C2733', '#B58AA0'], ['#5E5476', '#2E2840', '#9A8DBA'], ['#4E6A5E', '#24332D', '#88AE9C'],
  ['#7A6048', '#3A2C20', '#C2A07C'], ['#74505C', '#36242B', '#B07F90'], ['#525A78', '#262A3C', '#8E98BC'],
];

export function isVip(p) {
  if (typeof p.vip_active === 'boolean') return p.vip_active;
  return !!(p.vip_until && new Date(p.vip_until) > new Date());
}

export function ProfileTile({ provider, index = 0, testId }) {
  const t = TINTS[index % TINTS.length];
  const photo = provider.photos?.[0];
  const city = provider.location?.city;
  const meta = [provider.age, city].filter(Boolean).join(' · ');
  const vip = isVip(provider);
  return (
    <Link
      to={`/providers/${provider.provider_id}`}
      className="x-tile"
      data-testid={testId}
      aria-label={`${provider.display_name}${meta ? ', ' + meta : ''}${provider.verified ? ', verified' : ''}${vip ? ', VIP' : ''}`}
    >
      <div className="ph" style={photo ? undefined : { background: `linear-gradient(180deg, ${t[0]} 0%, ${t[1]} 100%)` }}>
        {photo ? (
          <img src={photo} alt="" loading="lazy" />
        ) : (
          <svg className="fig" viewBox="0 0 120 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="60" cy="66" r="22" fill={t[2]} /><path d="M18 160c0-38 18-58 42-58s42 20 42 58z" fill={t[2]} /></svg>
        )}
        {vip && <span className="x-vip"><Icon.crown />VIP</span>}
        <div className="bar">
          <div className="nm"><span>{provider.display_name}</span>{provider.verified && <Icon.verified />}</div>
          {meta && <div className="mt">{meta}</div>}
        </div>
      </div>
    </Link>
  );
}
