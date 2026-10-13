'use client';

/* Profile page. The profile arrives already rendered from the server (app/providers/[id]/page.js);
   the gallery, phone number, request form and report dialog work here in the browser. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getProviders, createEnquiry, reportProvider } from '@/lib/api';
import { notifyError, notifyProblem } from '@/lib/notify';
import { Icon } from '@/components/icons';
import { isVip } from '@/lib/vip';

const DAYS = [
  ['monday', 'Monday'], ['tuesday', 'Tuesday'], ['wednesday', 'Wednesday'], ['thursday', 'Thursday'],
  ['friday', 'Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday'],
];
const CURRENCY = { EUR: '€', USD: '$', GBP: '£', CHF: 'CHF ', AUD: 'A$', CAD: 'C$', JPY: '¥', AED: 'AED ', SGD: 'S$', HKD: 'HK$' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const yesNo = (v) => {
  if (v === 'yes' || v === true) return 'Yes';
  if (v === 'no' || v === false) return 'No';
  return v || '';
};
const availLabel = (t) => ({ incall: 'Incall', outcall: 'Outcall', both: 'Incall and outcall' }[t] || '');
const pronoun = (g) => (g === 'female' ? ['She', 'replies'] : g === 'male' ? ['He', 'replies'] : ['They', 'reply']);
const money = (sym, v) => `${sym}${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const maskPhone = (raw) => {
  if (!raw) return '';
  const m = String(raw).replace(/\s+/g, ' ').match(/^(\+\d{2})\s?(.*)$/);
  if (!m) return String(raw).replace(/\d/g, 'X');
  return `${m[1]} XXX XX XX XX`;
};
const digits = (s) => (s || '').replace(/[^0-9]/g, '');

/* ---------- small icons ---------- */
const Chev = ({ dir = 'right', size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {dir === 'right' ? <path d="m9 6 6 6-6 6" /> : <path d="m15 6-6 6 6 6" />}
  </svg>
);
const Expand = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg>
);
const Play = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
);
const Phone = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
);
const Mail = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
const Clock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
const Globe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
const Send = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z" /></svg>
);
const Flag = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
);
const Upload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
);
const VideoIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>
);

const APPS = [
  { key: 'sms', label: 'SMS', bg: '#8E8597', on: (c) => c.hasSms, href: (c, ph) => `sms:${ph}`,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.1 6.1L4 21l4.2-2c1.2.4 2.5.6 3.8.6 5.5 0 10-3.8 10-8.5S17.5 3 12 3z" /></svg> },
  { key: 'whatsapp', label: 'WhatsApp', bg: '#25D366', on: (c) => c.hasWhatsapp || !!c.whatsapp, href: (c, ph) => `https://wa.me/${digits(c.whatsapp || ph)}`,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3z" /><path d="M9 9.5c.3 2 2.5 4.3 4.5 4.7l1.2-1.2 2 1-.6 1.6c-3.6.4-7.9-3.9-7.5-7.5L10.2 7.5l1 2z" /></svg> },
  { key: 'telegram', label: 'Telegram', bg: '#0088CC', on: (c) => c.hasTelegram || !!c.telegram, href: (c) => `https://t.me/${(c.telegram || '').replace(/^@/, '')}`,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z" /><path d="m9 13 8-6" /></svg> },
  { key: 'signal', label: 'Signal', bg: '#3A76F0', on: (c) => c.hasSignal || !!c.signal, href: (c, ph) => `https://signal.me/#p/+${digits(c.signal || ph)}`,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="8" strokeDasharray="3 2" /><circle cx="12" cy="12" r="4" fill="#fff" stroke="none" /></svg> },
  { key: 'viber', label: 'Viber', bg: '#7360F2', on: (c) => c.hasViber || !!c.viber, href: (c, ph) => `viber://chat?number=${encodeURIComponent('+' + digits(c.viber || ph))}`,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c5 0 8 2.5 8 7.5S17 18 12 18h-1l-3 3v-3.5C5.5 16.5 4 14 4 10.5 4 5.5 7 3 12 3z" /><path d="M10 8c0 2.5 1.5 4 4 4.5l.8-1 1.4.8" /></svg> },
];

function fmtDur(s) {
  if (!Number.isFinite(s)) return '';
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export default function ProfileClient({ provider }) {
  const id = provider.provider_id;
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [durations, setDurations] = useState({});
  const [showPhone, setShowPhone] = useState(false);
  const [neighbors, setNeighbors] = useState({ prev: null, next: null });
  const [req, setReq] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [report, setReport] = useState(null); // null = closed
  const [submittingReport, setSubmittingReport] = useState(false);
  const touch = useRef(null);

  /* ---------- data ---------- */
  useEffect(() => {
    let alive = true;
    setIdx(0); setShowPhone(false); setSent(false);
    // Remember recently viewed profiles, so Browse can show them when the visitor is offline.
    try {
      const p = provider;
      const KEY = 'lumiere-recent-providers';
      const existing = JSON.parse(localStorage.getItem(KEY) || '[]');
      const slim = { provider_id: p.provider_id, display_name: p.display_name, age: p.age, photos: (p.photos || []).slice(0, 1), location: p.location, verified: p.verified, viewed_at: Date.now() };
      localStorage.setItem(KEY, JSON.stringify([slim, ...existing.filter((x) => x.provider_id !== slim.provider_id)].slice(0, 10)));
    } catch (e) { /* best effort */ }
    // Previous / next profile follow the Browse order.
    getProviders({ limit: 200 })
      .then((r) => {
        if (!alive) return;
        const list = Array.isArray(r.data) ? r.data : [];
        const i = list.findIndex((p) => p.provider_id === id);
        setNeighbors(i === -1 ? { prev: null, next: null } : { prev: i > 0 ? list[i - 1].provider_id : null, next: i < list.length - 1 ? list[i + 1].provider_id : null });
      })
      .catch(() => setNeighbors({ prev: null, next: null }));
    return () => { alive = false; };
  }, [id, provider]);

  const media = useMemo(() => {
    if (!provider) return [];
    return [
      ...(provider.photos || []).map((url) => ({ url, video: false })),
      ...(provider.videos || []).map((url) => ({ url, video: true })),
    ];
  }, [provider]);
  const N = media.length;
  const go = (d) => N && setIdx((i) => (i + d + N) % N);

  /* keyboard: ←/→ = previous/next profile (photos when the lightbox is open) */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || report) return;
      if (lightbox) {
        if (e.key === 'Escape') setLightbox(false);
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
        return;
      }
      if (e.key === 'ArrowRight' && neighbors.next) router.push(`/providers/${neighbors.next}`);
      else if (e.key === 'ArrowLeft' && neighbors.prev) router.push(`/providers/${neighbors.prev}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neighbors, lightbox, report, N, router]);

  useEffect(() => {
    if (!lightbox && !report) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [lightbox, report]);

  const p = provider;
  const c = p.characteristics || {};
  const contact = p.contact || {};
  const city = p.location?.city || '';
  const country = p.location?.country || '';
  const langs = Array.isArray(c.languages) ? c.languages : [];
  const avail = availLabel(p.availability_type);
  const [she, replies] = pronoun(p.gender);
  const vip = isVip(p);
  const phone = contact.phone || '';
  const email = contact.email || '';

  const appearance = [
    ['Nationality', c.nationality], ['Ethnicity', c.ethnicity], ['Orientation', c.orientation],
    ['Height', c.height ? `${c.height} cm` : ''], ['Weight', c.weight ? `${c.weight} kg` : ''],
    ['Eye color', c.eye_color], ['Hair color', c.hair_color], ['Hair length', c.hair_length],
    ['Breast size', c.breast_size], ['Breast type', c.breast_type], ['Pubic hair', c.pubic_hair],
    ['Languages', langs.join(', ')], ['Tattoos', yesNo(c.tattoos)], ['Piercings', yesNo(c.piercings)],
    ['Smoker', yesNo(c.smoker)], ['Available for', avail],
  ].filter(([, v]) => v !== '' && v !== null && v !== undefined);

  /* services: included vs extras */
  let services = [];
  if (Array.isArray(p.services)) services = p.services.map((name) => ({ name, extra: false }));
  else if (p.services && typeof p.services === 'object') {
    services = Object.entries(p.services).filter(([, v]) => v && v.type).map(([name, v]) => ({ name, extra: v.type === 'extra', price: v.price }));
  }
  const included = services.filter((s) => !s.extra);
  const extras = services.filter((s) => s.extra);

  /* rates */
  const r = p.rates || {};
  const sym = CURRENCY[r.currency] || '€';
  const rateRows = (() => {
    if (!(r.incall || r.outcall)) return [];
    const collect = (col = {}) => {
      const out = {};
      [['1hour', 1, '1 hour'], ['2hours', 2, '2 hours'], ['3hours', 3, '3 hours']].forEach(([k, h, label]) => {
        if (col[k] !== undefined && col[k] !== '' && col[k] !== null) out[`h${h}`] = { label, sort: h, v: col[k] };
      });
      (Array.isArray(col.extras) ? col.extras : []).forEach((ex) => {
        const h = Number(ex.hours) || 0;
        if (h > 0 && ex.price !== '' && ex.price !== undefined) out[`h${h}`] = { label: `${h} hours`, sort: h, v: ex.price };
      });
      if (col.overnight !== undefined && col.overnight !== '' && col.overnight !== null) out.overnight = { label: 'Overnight', sort: 900, v: col.overnight };
      if (col.taxi !== undefined && col.taxi !== '' && col.taxi !== null) out.taxi = { label: 'Taxi (not included)', sort: 999, v: col.taxi };
      return out;
    };
    const a = collect(r.incall); const b = collect(r.outcall);
    const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
    return keys
      .map((k) => ({ key: k, label: (a[k] || b[k]).label, sort: (a[k] || b[k]).sort, incall: a[k]?.v, outcall: b[k]?.v }))
      .sort((x, y) => x.sort - y.sort);
  })();

  /* schedule */
  const sched = p.schedule && typeof p.schedule === 'object' ? p.schedule : {};
  const hasSchedule = p.available247 || DAYS.some(([d]) => sched[d]?.available);

  /* ---------- actions ---------- */
  const sendRequest = async () => {
    if (!req.name.trim()) return notifyProblem('Your name is missing.', `Enter your name so ${p.display_name} knows who is contacting.`);
    if (!EMAIL_RE.test(req.email.trim())) return notifyProblem('That e-mail address looks invalid.', `Enter a valid e-mail (e.g. you@example.com) so ${p.display_name} can reply.`);
    if (!req.message.trim()) return notifyProblem('Your message is empty.', 'Write a short request describing what you are looking for.');
    setSending(true);
    try {
      await createEnquiry({ provider_id: p.provider_id, name: req.name.trim(), email: req.email.trim(), message: req.message.trim() });
      setSent(true);
      setReq({ name: '', email: '', message: '' });
    } catch (err) {
      notifyError(err, "We couldn't send your request.");
    } finally {
      setSending(false);
    }
  };

  const reportFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const ok = ['image/jpeg', 'image/png', 'image/webp'];
    const picked = files.filter((f) => ok.includes(f.type) && f.size <= 5 * 1024 * 1024);
    if (picked.length !== files.length) notifyProblem('Some files were skipped.', 'Only JPG, PNG or WEBP images up to 5 MB each are allowed.');
    picked.slice(0, 5 - report.images.length).forEach((file) => {
      const fr = new FileReader();
      fr.onload = () => setReport((s) => (s && s.images.length < 5 ? { ...s, images: [...s.images, fr.result] } : s));
      fr.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const submitReport = async () => {
    if (!report.name.trim()) return notifyProblem('Your name is missing.', 'Enter your name so we know who filed the report.');
    if (!EMAIL_RE.test(report.email.trim())) return notifyProblem('That e-mail address looks invalid.', 'Enter a valid e-mail so we can follow up.');
    if (!report.text.trim()) return notifyProblem('The description is empty.', 'Briefly describe why you believe this profile is fake.');
    setSubmittingReport(true);
    try {
      await reportProvider({ provider_id: p.provider_id, reporter_name: report.name.trim(), reporter_email: report.email.trim(), description: report.text.trim(), images: report.images });
      toast.success('Report submitted. Thank you — our team will review it.');
      setReport(null);
    } catch (err) {
      notifyError(err, "We couldn't submit your report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const cur = media[idx];
  const onTouchStart = (e) => { touch.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touch.current === null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touch.current = null;
  };

  return (
    <>
      <div className="x-wrap">
        <div className="pp-top">
          <nav aria-label="Breadcrumb" className="crumbs">
            <Link href="/browse">Elite Escorts</Link><Chev size={14} />
            {city && <><Link href={`/browse?city=${encodeURIComponent(city)}`}>{city}</Link><Chev size={14} /></>}
            <span aria-current="page">{p.display_name}</span>
          </nav>
          <div className="pnavs">
            {neighbors.prev && <Link className="pnav" href={`/providers/${neighbors.prev}`} prefetch={false} title="Previous profile (←)" data-testid="prev-profile-btn"><Chev dir="left" />Previous profile</Link>}
            {neighbors.next && <Link className="pnav" href={`/providers/${neighbors.next}`} prefetch={false} title="Next profile (→)" data-testid="next-profile-btn">Next profile<Chev /></Link>}
          </div>
        </div>

        <div className="pp-grid">
          {/* ---------- gallery ---------- */}
          <div className="pp-left" data-testid="provider-detail-left-column">
            <div className="pp-main" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
              {cur ? (
                cur.video ? (
                  <>
                    <video key={cur.url} src={cur.url} controls playsInline preload="metadata" className="media" data-testid="provider-video" />
                    <span className="vbadge"><VideoIc />Video</span>
                  </>
                ) : (
                  <button type="button" className="mediabtn" onClick={() => setLightbox(true)} aria-label="Open full-size photo" data-testid={`open-lightbox-${idx}`}>
                    <img src={cur.url} alt={`${p.display_name}, photo ${idx + 1} of ${N}`} className="media" data-testid={`provider-photo-${idx}`} />
                  </button>
                )
              ) : (
                <svg className="fig" viewBox="0 0 120 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="60" cy="66" r="22" fill="#B58AA0" /><path d="M18 160c0-38 18-58 42-58s42 20 42 58z" fill="#B58AA0" /></svg>
              )}
              {cur && !cur.video && <button type="button" className="round tr" aria-label="Open full-size photo" onClick={() => setLightbox(true)}><Expand /></button>}
              {N > 1 && (
                <>
                  <button type="button" className="round l" aria-label="Previous photo" onClick={() => go(-1)}><Chev dir="left" /></button>
                  <button type="button" className="round r" aria-label="Next photo" onClick={() => go(1)}><Chev /></button>
                </>
              )}
              {N > 0 && !cur?.video && <span className="counter">{idx + 1} / {N}</span>}
            </div>
            {N > 1 && (
              <div role="group" aria-label="Photos" className="pp-thumbs" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(N, 5), 6)}, minmax(0, 1fr))` }}>
                {media.map((m, i) => (
                  <button
                    key={`${i}-${m.url.slice(-24)}`}
                    type="button"
                    className={`thumb${i === idx ? ' on' : ''}`}
                    aria-label={`Show ${m.video ? 'video' : 'photo'} ${i + 1} of ${N}`}
                    aria-pressed={i === idx}
                    onClick={() => setIdx(i)}
                    data-testid={`thumbnail-${i}`}
                  >
                    {m.video ? (
                      <>
                        <video src={m.url} muted preload="metadata" onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setDurations((s) => ({ ...s, [m.url]: d })); }} />
                        <span className="tplay"><Play size={14} /></span>
                        {durations[m.url] && <span className="tdur">{fmtDur(durations[m.url])}</span>}
                      </>
                    ) : (
                      <img src={m.url} alt="" loading="lazy" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ---------- details ---------- */}
          <div className="pp-right">
            <section aria-labelledby="pname" className="x-glass card">
              <div className="namerow">
                <h1 id="pname" data-testid="provider-name">{p.display_name}{p.age ? `, ${p.age}` : ''}</h1>
                <div className="badges">
                  {p.verified && <span className="b-ver" data-testid="verified-badge"><Icon.check />Verified</span>}
                  {vip && <span className="b-vip"><Icon.crown />VIP</span>}
                </div>
              </div>
              {(city || country) && <p className="loc"><Icon.pin width="18" height="18" />Elite escort based in {[city, country].filter(Boolean).join(', ')}</p>}
              {(p.bio || p.essence) && (
                <>
                  <div className="rule" />
                  <h2 className="eyebrow">About me</h2>
                  <p className="bio" data-testid="provider-bio">{p.bio || p.essence}</p>
                </>
              )}
              {(avail || langs.length > 0) && (
                <div className="tags">
                  {avail && <span>{avail}</span>}
                  {langs.length > 0 && <span>{langs.join(', ')}</span>}
                </div>
              )}
            </section>

            {appearance.length > 0 && (
              <section aria-labelledby="h-app" className="x-glass card">
                <h2 id="h-app" className="h">My appearance</h2>
                <dl className="kv" data-testid="provider-characteristics">
                  {appearance.map(([k, v]) => (
                    <div key={k} data-testid={`char-row-${k.toLowerCase().replace(/ /g, '-')}`}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
              </section>
            )}

            {(phone || email) && (
              <section aria-labelledby="h-con" className="x-glass card connect" data-testid="contact-section">
                <h2 id="h-con" className="h">Let&apos;s connect</h2>
                {phone && (
                  <div className="crow" data-testid="contact-phone">
                    <span className="cic"><Phone /></span>
                    <div className="cval">
                      <span className="clbl">Mobile</span>
                      <span className="num">
                        {showPhone ? (
                          <a href={`tel:${phone.replace(/\s+/g, '')}`} data-testid="phone-number">{phone}</a>
                        ) : (
                          <>
                            <span>{maskPhone(phone)}</span>
                            <button type="button" className="shownum" onClick={() => setShowPhone(true)} data-testid="show-phone-btn">Show number</button>
                          </>
                        )}
                      </span>
                    </div>
                    <div role="group" aria-label="Message apps" className="apps" data-testid="contact-channels">
                      {APPS.filter((a) => a.on(contact)).map((a) => (
                        <a key={a.key} href={a.href(contact, phone)} target={a.key === 'sms' ? undefined : '_blank'} rel="noopener noreferrer" title={a.label} aria-label={`Message ${p.display_name} on ${a.label}`} style={{ background: a.bg }} data-testid={`channel-${a.key}`}>{a.icon}</a>
                      ))}
                    </div>
                  </div>
                )}
                {email && (
                  <a className="crow mail" href={`mailto:${email}`} data-testid="contact-email">
                    <span className="cic"><Mail /></span>
                    <span className="cval"><span className="clbl">E-mail</span><span className="num">{email}</span></span>
                  </a>
                )}
              </section>
            )}

            {services.length > 0 && (
              <section aria-labelledby="h-srv" className="x-glass card">
                <h2 id="h-srv" className="h">What we can share together</h2>
                <div className="svc">
                  {included.length > 0 && (
                    <div><h3>Included</h3><ul>{included.map((s) => <li key={s.name}>{s.name}</li>)}</ul></div>
                  )}
                  {extras.length > 0 && (
                    <div><h3>Extras</h3><ul>{extras.map((s) => <li key={s.name} className="ex">{s.name}{s.price !== '' && s.price !== undefined && s.price !== null && <b>· +{money(sym, s.price)}</b>}</li>)}</ul></div>
                  )}
                </div>
              </section>
            )}

            {rateRows.length > 0 && (
              <section id="rates" aria-labelledby="h-rates" className="x-glass card">
                <h2 id="h-rates" className="h">Time &amp; investment</h2>
                <table className="rates">
                  <thead><tr><th scope="col">Duration</th><th scope="col">Incall</th><th scope="col">Outcall</th></tr></thead>
                  <tbody>
                    {rateRows.map((row) => (
                      <tr key={row.key} data-testid={`rate-row-${row.key}`}>
                        <th scope="row">{row.label}</th>
                        <td className={row.incall === undefined ? 'na' : ''}>{row.incall === undefined ? '—' : money(sym, row.incall)}</td>
                        <td className={row.outcall === undefined ? 'na' : ''}>{row.outcall === undefined ? '—' : money(sym, row.outcall)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="note">Prices in {sym === '€' ? 'euro' : r.currency}. A dash means this option isn&apos;t offered.</p>
              </section>
            )}

            {(hasSchedule || p.booking_advance || p.worldwide_travel) && (
              <section aria-labelledby="h-sched" className="x-glass card">
                <h2 id="h-sched" className="h tight">My schedule</h2>
                {p.booking_advance && <div className="sline" data-testid="schedule-advance"><Clock />Booking in advance required</div>}
                {p.worldwide_travel && <div className="sline" data-testid="schedule-travel"><Globe />Available for worldwide travel</div>}
                {p.available247 ? (
                  <ul className="days one" data-testid="schedule-247"><li><span className="d">All week</span><span className="t">Available 24/7</span></li></ul>
                ) : hasSchedule && (
                  <ul className="days">
                    {DAYS.map(([k, label]) => {
                      const d = sched[k];
                      const on = d && d.available;
                      return (
                        <li key={k} data-testid={`schedule-${k}`}>
                          <span className="d">{label}</span>
                          <span className={on ? 't' : 't off'}>{on ? `${d.start} – ${d.end}` : 'Not available'}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            <section id="request" aria-labelledby="h-req" className="x-glass card req">
              <h2 id="h-req" className="h tight">Do you have any requests?</h2>
              {sent ? (
                <div role="status" className="sent">
                  <span className="sic" aria-hidden="true"><Icon.check width="18" height="18" /></span>
                  <div>
                    <p className="t">Your request has been sent</p>
                    <p>Thank you. {p.display_name} has received your message and will reply by e-mail. Keep an eye on your inbox, and check your spam folder if you haven&apos;t heard back within a few days.</p>
                    <button type="button" className="txtbtn" onClick={() => setSent(false)}>Send another request</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="sub">Your message goes straight to {p.display_name}. {she} {replies} by e-mail.</p>
                  <div className="two">
                    <label><span>Your name</span><input className="gin" type="text" placeholder="Your name" autoComplete="name" value={req.name} onChange={(e) => setReq({ ...req, name: e.target.value })} data-testid="extra-request-name" /></label>
                    <label><span>Your e-mail address</span><input className="gin" type="email" placeholder="your@email.com" autoComplete="email" value={req.email} onChange={(e) => setReq({ ...req, email: e.target.value })} data-testid="extra-request-email" /></label>
                  </div>
                  <label className="msg"><span>Your message</span>
                    <textarea className="gin" maxLength={350} placeholder="Share your special requests or preferences…" value={req.message} onChange={(e) => setReq({ ...req, message: e.target.value.slice(0, 350) })} data-testid="extra-request-input" />
                  </label>
                  <div className="sendrow">
                    <span aria-live="polite" className="cnt">{req.message.length}/350 characters</span>
                    <button type="button" className="x-btn primary" disabled={sending || !req.message.trim()} onClick={sendRequest} data-testid="send-request-button"><Send />{sending ? 'Sending…' : 'Send request'}</button>
                  </div>
                </>
              )}
            </section>

            <button type="button" className="reportbtn" onClick={() => setReport({ name: '', email: '', text: '', images: [] })} data-testid="report-profile-button"><Flag />Report this profile as fake</button>
          </div>
        </div>
      </div>

      {/* ---------- lightbox ---------- */}
      {lightbox && cur && !cur.video && createPortal(
        <div className="pp-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={() => setLightbox(false)} data-testid="lightbox-overlay">
          <span className="lbc" data-testid="lightbox-counter">{idx + 1} / {N}</span>
          <button type="button" className="round lbx" aria-label="Close" onClick={() => setLightbox(false)} data-testid="lightbox-close"><Icon.close width="20" height="20" /></button>
          {N > 1 && <button type="button" className="round lbl" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); go(-1); }} data-testid="lightbox-prev"><Chev dir="left" /></button>}
          <img src={cur.url} alt={`${p.display_name}, photo ${idx + 1}`} onClick={(e) => e.stopPropagation()} data-testid="lightbox-image" />
          {N > 1 && <button type="button" className="round lbr" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); go(1); }} data-testid="lightbox-next"><Chev /></button>}
        </div>,
        document.body
      )}

      {/* ---------- report dialog ---------- */}
      {report && createPortal(
        <div className="pp-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) setReport(null); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="rep-title" className="pp-dialog" data-testid="report-profile-modal">
            <div className="dh">
              <div>
                <h2 id="rep-title">Report this profile</h2>
                <p>Help us keep the platform safe. Tell us why you believe this profile is fake — our administrators will review your report.</p>
              </div>
              <button type="button" className="dx" aria-label="Close" onClick={() => setReport(null)}><Icon.close width="20" height="20" /></button>
            </div>
            <div className="db">
              <div className="two">
                <label><span>Your name</span><input className="lin" type="text" placeholder="Your name" value={report.name} onChange={(e) => setReport({ ...report, name: e.target.value })} data-testid="report-name-input" /></label>
                <label><span>Your e-mail address</span><input className="lin" type="email" placeholder="your@email.com" value={report.email} onChange={(e) => setReport({ ...report, email: e.target.value })} data-testid="report-email-input" /></label>
              </div>
              <label><span>Description</span>
                <textarea className="lin" maxLength={500} placeholder="Describe why you think this profile is fake…" value={report.text} onChange={(e) => setReport({ ...report, text: e.target.value.slice(0, 500) })} data-testid="report-description-input" />
                <span className="cnt">{report.text.length}/500 characters</span>
              </label>
              <div className="up">
                <span className="ul">Upload pictures <em>(optional)</em></span>
                {report.images.length < 5 && (
                  <label className="drop" data-testid="report-upload-label"><Upload />Add images
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={reportFiles} data-testid="report-upload-input" />
                  </label>
                )}
                {report.images.length > 0 && (
                  <div className="prev" data-testid="report-image-previews">
                    {report.images.map((src, i) => (
                      <span key={i}>
                        <img src={src} alt={`Evidence ${i + 1}`} />
                        <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => setReport({ ...report, images: report.images.filter((_, j) => j !== i) })} data-testid={`report-image-remove-${i}`}><Icon.close width="12" height="12" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <span className="hint">Up to 5 images · JPG, PNG or WEBP · max 5 MB each</span>
              </div>
            </div>
            <div className="df">
              <button type="button" className="x-btn white" onClick={() => setReport(null)} data-testid="report-cancel-button">Cancel</button>
              <button type="button" className="x-btn primary" disabled={submittingReport} onClick={submitReport} data-testid="report-submit-button">{submittingReport ? 'Submitting…' : 'Submit report'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
