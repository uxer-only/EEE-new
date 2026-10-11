import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LightPage } from '@/components/site/Shell';
import { Dialog } from '@/components/advertiser/DashboardParts';
import { BACKEND_URL } from '@/services/api';
import '@/styles/advertiser.css';
import '@/styles/dashboard.css';
import '@/styles/admin.css';

const sv = (d, w = 18, extra = {}) => <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...extra}>{d}</svg>;
export const AI = {
  users: sv(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></>),
  user: sv(<><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>),
  clock: sv(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  warn: sv(<><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17v.01" /></>),
  shield: sv(<><path d="M12 2.5 4 5.5v6c0 5 3.4 9.4 8 10.5 4.6-1.1 8-5.5 8-10.5v-6l-8-3z" /><path d="m9 12 2 2 4-4" /></>),
  house: sv(<><path d="M4 10 12 4l8 6v10H4z" /><path d="M10 20v-5h4v5" /></>),
  building: sv(<><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></>),
  live: sv(<><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" /></>),
  ban: sv(<><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>),
  arrow: sv(<path d="M5 12h14M13 6l6 6-6 6" />),
  chevR: sv(<path d="m9 6 6 6-6 6" />),
  chevL: sv(<path d="m15 6-6 6 6 6" />),
  chevD: sv(<path d="m6 9 6 6 6-6" />),
  check: sv(<path d="M5 12.5l4.5 4.5L19 7.5" />, 16, { strokeWidth: 2.4 }),
  x: sv(<path d="M6 6l12 12M18 6 6 18" />, 16, { strokeWidth: 2.4 }),
  search: sv(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>),
  mail: sv(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>, 16),
  pin: sv(<><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>, 16),
  cal: sv(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>, 16),
  crown: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" /></svg>,
  idcard: sv(<><rect x="2.5" y="5" width="19" height="14" rx="2" /><circle cx="8.5" cy="11" r="2.2" /><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h5M14 13.5h4" /></>, 56, { strokeWidth: 1.4 }),
  selfie: sv(<><circle cx="9" cy="8" r="3.5" /><path d="M3 20c1-3.6 3.4-5.5 6-5.5 1.2 0 2.3.4 3.2 1.1" /><rect x="13" y="13" width="8" height="6" rx="1" /></>, 56, { strokeWidth: 1.4 }),
  expand: sv(<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" />, 14),
  photo: sv(<><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" /></>, 12),
  play: <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5v14l12-7z" /></svg>,
  trash: sv(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />, 16),
};

export const abs = (u) => (!u ? '' : /^(https?:|data:|blob:)/.test(u) ? u : `${BACKEND_URL || ''}${u.startsWith('/') ? '' : '/'}${u}`);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
export const fmtDay = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
export const fmtDayTime = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${fmtDay(iso)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export function fmtAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso); const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  const t = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return `today, ${t}`;
  if (d.toDateString() === y.toDateString()) return `yesterday, ${t}`;
  return `${d.getDate()} ${MON[d.getMonth()]}, ${t}`;
}

/** Admin page frame: light page with the admin nav (active = overview | independents | agencies). */
export function AdminPage({ active, children, testId }) {
  return (
    <LightPage admin={active}>
      <div className="adv adm" data-testid={testId}>{children}</div>
    </LightPage>
  );
}

export function AdminHead({ title, sub, eyebrow = 'Administration' }) {
  return (
    <header className="adm-head">
      <span className="ey">{eyebrow}</span>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </header>
  );
}

export function Crumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="adm-crumbs">
      {AI.chevL}
      {items.map((it, i) => (
        <span key={it.label}>
          {it.to ? <Link to={it.to}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
          {i < items.length - 1 && <span className="sl" aria-hidden="true">/</span>}
        </span>
      ))}
    </nav>
  );
}

/** Segmented filter with counts. */
export function Tabs({ value, onChange, options, label }) {
  return (
    <div role="tablist" aria-label={label} className="adm-tabs">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)} data-testid={`tab-${o.value}`}>
          <span>{o.label}</span><span className="n">{o.count}</span>
        </button>
      ))}
    </div>
  );
}

export function Search({ value, onChange, placeholder, testId }) {
  return (
    <label className="adm-search">
      {AI.search}
      <span className="sr-only">{placeholder}</span>
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testId} />
    </label>
  );
}

export function Pager({ page, pages, onPage, total, from, to, noun }) {
  if (!total) return null;
  const list = Array.from({ length: pages }, (_, i) => i + 1);
  return (
    <div className="adm-pager">
      <span>Showing {from}–{to} of {total} {noun}</span>
      <div className="pg">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>{AI.chevL}</button>
        {list.map((n) => <button key={n} type="button" aria-current={n === page ? 'page' : undefined} className={n === page ? 'on' : ''} onClick={() => onPage(n)}>{n}</button>)}
        <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>{AI.chevR}</button>
      </div>
    </div>
  );
}

export const Thumb = ({ src, size = 'm' }) => (
  <span className={`adm-av ${size}`} aria-hidden="true">{src ? <img src={abs(src)} alt="" /> : AI.user}</span>
);

/** Dialog asking for a reason (sent to the advertiser). */
export function ReasonDialog({ title, cta = 'Send rejection', onSend, onClose, placeholder = 'e.g. ID photo is blurry — please resubmit with clearer corners', help = 'The advertiser receives this by e-mail and can resubmit from their dashboard.' }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title={title} danger onClose={onClose}
      footer={<><button type="button" className="x-btn white" onClick={onClose}>Back</button><button type="button" className="x-btn dangerb" disabled={busy || reason.trim().length < 3} onClick={async () => { setBusy(true); try { await onSend(reason.trim()); } finally { setBusy(false); } }} data-testid="send-rejection">{busy ? 'Sending…' : cta}</button></>}>
      <label className="adm-reason">
        <span>Reason (sent to the advertiser)</span>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} data-testid="reason-input" />
        <small>{help}</small>
      </label>
    </Dialog>
  );
}

const DOC_LABEL = { id_front: 'Government ID (front)', id_selfie: 'Selfie with ID', secondary_doc: 'Secondary document' };
/** Verification document tiles (ID front, selfie, optional secondary). */
export function DocTiles({ docs = [] }) {
  const by = Object.fromEntries(docs.map((d) => [d.document_type, d]));
  const [full, setFull] = useState(null);
  return (
    <>
      <div className="adm-docs">
        {['id_front', 'id_selfie', 'secondary_doc'].map((k) => {
          const d = by[k];
          return (
            <div key={k} className="doc">
              <span className="dl">{DOC_LABEL[k]}</span>
              <div className={`im${d ? '' : ' none'}`}>
                {d?.document_url ? <img src={abs(d.document_url)} alt={DOC_LABEL[k]} /> : d ? (k === 'id_selfie' ? AI.selfie : AI.idcard) : <span>Not provided (optional)</span>}
              </div>
              {d?.document_url && <button type="button" className="vfull" onClick={() => setFull(d)}><span>View full size</span>{AI.expand}</button>}
            </div>
          );
        })}
      </div>
      {full && (
        <Dialog title={DOC_LABEL[full.document_type]} width={900} onClose={() => setFull(null)}>
          <img src={abs(full.document_url)} alt={DOC_LABEL[full.document_type]} style={{ display: 'block', maxWidth: '100%', margin: '0 auto', borderRadius: 8 }} />
        </Dialog>
      )}
    </>
  );
}
