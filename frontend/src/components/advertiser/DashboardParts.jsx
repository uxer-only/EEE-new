import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Switch, Check } from '@/components/site/Form';
import { invoicePdfUrl } from '@/services/api';
import { currencySymbol } from '@/constants/companionData';
import '@/styles/dashboard.css';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const abs = (u) => (u && u.startsWith('/api/') ? BACKEND + u : u);
export const fmtDate = (iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', opts);
};
const shortWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const days = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (days === 0) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
export const planName = (sub) => (sub?.featured_active || sub?.featured_until ? (sub?.vip_active ? 'Featured + VIP' : 'Featured') : sub?.vip_active ? 'VIP' : '');
const money = (sym, v) => `${sym}${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export const Ico = {
  pulse: <svg width="20" height="20" viewBox="0 0 24 24" fill="#B04585" aria-hidden="true"><path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-2 10H5z" /></svg>,
  pin: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>,
  ext: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>,
  dl: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5M4 20h16" /></svg>,
  pen: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m14 6 4 4" /></svg>,
  chev: <svg className="chv" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>,
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  shield: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  play: <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>,
};

/** Small modal dialog in the light theme. */
export function Dialog({ title, children, onClose, footer, width = 520, danger = false }) {
  return createPortal(
    <div className="dx-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="dx-dlg" style={{ width }}>
        <div className="dh"><h2 className={danger ? 'danger' : ''}>{title}</h2><button type="button" className="xbtn" aria-label="Close" onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button></div>
        <div className="db">{children}</div>
        {footer && <div className="df">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/**
 * Profile status card. state: live | pending | expired | draft.
 * sub = subscription (/subscriptions/me), planHref = "Extend or upgrade plan" page.
 */
export function StatusCard({ state, sub, latestInvoice, planHref, onToggleRenew }) {
  const daysLeft = Math.max(0, Math.round(sub?.featured_days_left || 0));
  const total = (latestInvoice && sub?.plans?.[latestInvoice.featured_id]?.duration_days) || Math.max(daysLeft, 1);
  const pct = Math.min(100, Math.max(0, (daysLeft / total) * 100));
  const ends = fmtDate(sub?.featured_until);
  const name = planName(sub);
  const renew = sub?.auto_renew !== false;
  const delDate = sub?.featured_until ? fmtDate(new Date(new Date(sub.featured_until).getTime() + 61 * 86400000).toISOString()) : '';
  const line = {
    live: ['live', `Online · ${name}`],
    pending: ['pend', 'Not live yet · waiting for verification'],
    expired: ['exp', 'Offline · plan expired'],
    draft: ['pend', 'Not live yet · no plan chosen'],
  }[state];
  const renewNote = state === 'pending'
    ? (renew ? 'Renews automatically when your plan ends' : 'Your plan ends when the paid period is over')
    : (renew ? `Renews ${fmtDate(sub?.featured_until, { day: 'numeric', month: 'short' })}${latestInvoice?.amount ? ` for €${Math.round(latestInvoice.amount)}` : ''}` : `Your plan ends on ${fmtDate(sub?.featured_until, { day: 'numeric', month: 'short' })}`);
  return (
    <section aria-labelledby="st-title" className="dsec st">
      <div className="sth">
        <span className="ic">{Ico.pulse}</span>
        <span className="tx"><h2 id="st-title">Profile status</h2><span className={`line ${line[0]}`}><span className="dot" aria-hidden="true" />{line[1]}</span></span>
      </div>
      {state === 'live' && (
        <div className="prog">
          <div className="r"><b>{daysLeft} of {total} days left</b><span>Ends {ends}</span></div>
          <div className="bar"><div style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      {state === 'pending' && (
        <div className="info"><b>{name || 'Plan'}{sub?.featured_until ? '' : ''}</b><span>Paid. Your profile goes live as soon as your verification is approved.</span></div>
      )}
      {state === 'expired' && (
        <div className="info"><b>{name} · ended {ends}</b><span>Your profile is offline and hidden from Browse. Renew before {delDate}, after that your profile is deleted.</span></div>
      )}
      {state === 'draft' && (
        <div className="info"><b>Your profile is saved</b><span>Choose a plan to appear on Browse. Your profile goes live once it is verified.</span></div>
      )}
      {(state === 'live' || state === 'pending') && (
        <div className="ren">
          <span className="tx"><span id="ren-l" className="t">Auto-renew</span><span className="d">{renewNote}</span></span>
          <Switch checked={renew} onChange={onToggleRenew} labelledBy="ren-l" testId="dash-auto-renew" />
        </div>
      )}
      {(state === 'live' || state === 'pending') && <Link to={planHref} className="lnk" data-testid="extend-plan-link">Extend or upgrade plan</Link>}
      {state === 'expired' && <Link to={planHref} className="x-btn primary sm" style={{ height: 44 }} data-testid="renew-plan">Renew plan</Link>}
      {state === 'draft' && <Link to={planHref} className="x-btn primary sm" style={{ height: 44 }} data-testid="activate-plan">Activate profile</Link>}
    </section>
  );
}

export function MessagesCard({ enquiries = [], unread = 0, href = '/messages', pending = false }) {
  const list = enquiries.slice(0, 3);
  return (
    <section aria-labelledby="ms-title" className="dsec ms">
      <div className="card-h">
        <h2 id="ms-title">Messages</h2>
        {unread > 0 && <span className="newb">{unread} new</span>}
      </div>
      {list.length === 0 ? (
        <p className="empty">{pending ? 'No messages yet. Requests from clients appear here once your profile is live.' : 'No messages yet. Requests from clients appear here and in your e-mail.'}</p>
      ) : (
        <ul className="msgs">
          {list.map((m) => (
            <li key={m.enquiry_id} className="mrow">
              <Link className="msg" to={`${href}#${m.enquiry_id}`} aria-label={`Open message from ${m.name}`}>
                <span className={`dot${m.read ? '' : ' on'}`} aria-hidden="true" />
                <span className="b">
                  <span className="t"><span className={`nm${m.read ? '' : ' un'}`}>{m.name}</span><span className="dt">{shortWhen(m.created_at)}</span></span>
                  <span className="pv">{m.message}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {list.length > 0 && <Link to={href} className="lnk end" data-testid="view-all-messages">View all messages</Link>}
    </section>
  );
}

const invLabel = (inv, plans) => {
  const f = plans?.[inv.featured_id]?.label?.replace('Featured · ', '') || '';
  const kind = inv.vip_id ? 'Featured + VIP' : inv.featured_id ? 'Featured' : 'Plan';
  return f ? `${kind} · ${f}` : kind;
};

export function InvoicesCard({ invoices = [], plans }) {
  const [all, setAll] = useState(false);
  const inv = invoices[0];
  const row = (i) => (
    <div key={i.invoice_id} className="inv">
      <span className="tx"><b>{invLabel(i, plans)}</b><span>{fmtDate(i.created_at)} · {money(currencySymbol(i.currency), i.amount)}</span></span>
      <a className="dlb" href={invoicePdfUrl(i.invoice_id)} target="_blank" rel="noopener noreferrer" aria-label={`Download invoice of ${fmtDate(i.created_at)}`}>{Ico.dl}</a>
    </div>
  );
  return (
    <section aria-labelledby="iv-title" className="dsec iv">
      <div className="card-h">
        <h2 id="iv-title">Invoices</h2>
        <span className="cnt">{invoices.length === 1 ? '1 invoice' : `${invoices.length} invoices`}</span>
      </div>
      {inv ? row(inv) : <p className="empty">No invoices yet. Your invoice appears here after you pay for a plan.</p>}
      {invoices.length > 0 && <button type="button" className="lnk end" onClick={() => setAll(true)} data-testid="view-all-invoices">View all invoices</button>}
      {all && (
        <Dialog title="Invoices" onClose={() => setAll(false)}>
          <div className="invlist">{invoices.map(row)}</div>
        </Dialog>
      )}
    </section>
  );
}

/* ---------- profile sections (accordion with Edit buttons) ---------- */
const DAY_SHORT = [['monday', 'Mon', 'Monday'], ['tuesday', 'Tue', 'Tuesday'], ['wednesday', 'Wed', 'Wednesday'], ['thursday', 'Thu', 'Thursday'], ['friday', 'Fri', 'Friday'], ['saturday', 'Sat', 'Saturday'], ['sunday', 'Sun', 'Sunday']];

function SectionCard({ num, title, editHref, open, onToggle, children, testId }) {
  return (
    <section className="dsec acc" data-testid={testId}>
      <div className="card-h">
        <button type="button" className="acc-b" aria-expanded={open} onClick={onToggle}>
          <span className="num">{num}</span>
          <h2>{title}</h2>
          <span className={`ch${open ? ' open' : ''}`}>{Ico.chev}</span>
        </button>
        <Link className="edit" to={editHref} aria-label={`Edit ${title}`} data-testid={`edit-${testId}`}>{Ico.pen}<span>Edit</span></Link>
      </div>
      {open && <div className="acc-body">{children}</div>}
    </section>
  );
}

/**
 * The 5 profile sections shown on the advertiser dashboard and the agency companion page.
 * data = normalized profile data, media = /providers/media/mine items, edit(section) → href.
 */
export function ProfileSections({ data, media = [], edit, expanded = false, who = 'your', hideContact = false }) {
  const [open, setOpen] = useState(() => (expanded ? { 0: true, 1: true, 2: true, 3: true, 4: true } : {}));
  const t = (i) => setOpen((o) => ({ ...o, [i]: !o[i] }));
  const c = data.characteristics || {};
  const ct = data.contact || {};
  const info = [
    ['Display name', data.display_name], ['Age', data.age], ['Gender', data.gender ? data.gender[0].toUpperCase() + data.gender.slice(1) : ''],
    ['Orientation', c.orientation], ['Location', [data.location?.city, data.location?.country].filter(Boolean).join(', ')],
    ['Languages', (c.languages || []).join(', ')],
    ...(hideContact ? [] : [['Mobile phone', ct.phone], ['E-mail', ct.email], ['Telegram', ct.hasTelegram && ct.telegramId ? `@${ct.telegramId}` : '']]),
  ].filter(([, v]) => v);
  const svc = Object.entries(data.services || {}).filter(([, v]) => v?.type);
  const incl = svc.filter(([, v]) => v.type === 'inclusive').map(([k]) => k);
  const extras = svc.filter(([, v]) => v.type === 'extra');
  const sym = currencySymbol(data.rates?.currency);
  const kinds = data.availability_type === 'incall' ? ['incall'] : data.availability_type === 'outcall' ? ['outcall'] : ['incall', 'outcall'];
  const rateRows = (col = {}) => [
    ['1 hour', col['1hour']], ['2 hours', col['2hours']], ['3 hours', col['3hours']],
    ...(Array.isArray(col.extras) ? col.extras : []).slice().sort((a, b) => a.hours - b.hours).map((x) => [`${x.hours} hours`, x.price]),
    ['Overnight', col.overnight], ['Weekend', col.weekend],
  ].filter(([, v]) => v !== '' && v !== undefined && v !== null);
  const taxi = data.rates?.outcall?.taxi;
  const photos = media.filter((m) => m.media_type !== 'video');
  const videos = media.filter((m) => m.media_type === 'video');
  const sched = data.schedule || {};
  const availLabel = { incall: 'Incall', outcall: 'Outcall', both: 'Incall & outcall' }[data.availability_type] || 'Incall & outcall';

  return (
    <>
      <SectionCard num={1} title="Basic info" editHref={edit('basic')} open={!!open[0]} onToggle={() => t(0)} testId="card-basic-info">
        <dl className="g2 dkv">{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        {data.bio && <div className="ess"><span className="ey">My Essence</span><p>{data.bio}</p></div>}
      </SectionCard>
      <SectionCard num={2} title="Photos & videos" editHref={edit('photos')} open={!!open[1]} onToggle={() => t(1)} testId="card-photos">
        {media.length === 0 ? <p className="empty">No photos yet. Add at least one photo — it becomes {who} cover.</p> : (
          <ul className="media">
            {[...photos, ...videos].map((m, i) => (
              <li key={m.media_id} className={i === 0 && m.media_type !== 'video' ? 'cover' : ''}>
                {m.media_type === 'video' ? <><video src={abs(m.url)} muted preload="metadata" /><span className="pl">{Ico.play}</span></> : <img src={abs(m.url)} alt="" loading="lazy" />}
                {i === 0 && m.media_type !== 'video' && <span className="b cov">Cover</span>}
                {m.status === 'pending' && <span className="b rev">In review</span>}
                {m.status === 'rejected' && <span className="b rej">Rejected</span>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard num={3} title="Services" editHref={edit('services')} open={!!open[2]} onToggle={() => t(2)} testId="card-services">
        {svc.length === 0 ? <p className="empty">No services chosen yet.</p> : (
          <div className="svcs">
            {incl.length > 0 && <div className="grp"><span className="ey">Included in {who} rate · {incl.length}</span><div className="dtags">{incl.map((s) => <span key={s}>{s}</span>)}</div></div>}
            {extras.length > 0 && <div className="grp tight"><span className="ey">Extras · {extras.length}</span>{extras.map(([k, v]) => <div key={k} className="dlr"><span>{k}</span><b>{v.price ? `+ ${money(sym, v.price)}` : 'Price not set'}</b></div>)}</div>}
          </div>
        )}
      </SectionCard>
      <SectionCard num={4} title="Availability" editHref={edit('rates')} open={!!open[3]} onToggle={() => t(3)} testId="card-availability">
        <div className="dtags">
          <span>{availLabel}</span>
          {data.booking_advance && <span>Booking in advance required</span>}
          {data.worldwide_travel && <span>Available for worldwide travel</span>}
        </div>
        {data.available247 ? <p className="lead">Available 24/7</p> : (
          <ul className="wdays">
            {DAY_SHORT.map(([k, short, long]) => {
              const s = sched[k];
              const on = !!s?.available;
              return (
                <li key={k} className={`wday${on ? ' on' : ''}`}>
                  <span className="dd"><span className="lg">{short}</span><span className="sm">{long}</span></span>
                  <span className="tt">{on ? <><span className="lg">{s.start}</span><span className="sm">{s.start} – {s.end}</span></> : 'Closed'}</span>
                  {on && <span className="tt lg">{s.end}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
      <SectionCard num={5} title="Rates" editHref={edit('rates')} open={!!open[4]} onToggle={() => t(4)} testId="card-rates">
        <div className="g2">
          {kinds.map((k) => {
            const rows = rateRows(data.rates?.[k]);
            return (
              <div key={k} className="rc">
                <span className="ey">{k === 'incall' ? 'Incall' : 'Outcall'}</span>
                {rows.length ? rows.map(([l, v]) => <div key={l} className="dlr"><span>{l}</span><b>{money(sym, v)}</b></div>) : <p className="empty">No rates yet.</p>}
              </div>
            );
          })}
        </div>
        <span className="foot">{kinds.includes('outcall') && taxi ? `Outcall: + ${money(sym, taxi)} taxi · ` : ''}Prices in {data.rates?.currency || 'EUR'}</span>
      </SectionCard>
    </>
  );
}

export function VerificationBanner({ profile, onStart }) {
  const s = profile.verification_status || 'pending';
  if (profile.verified) return null;
  if (s === 'submitted') {
    return (
      <div role="status" className="vban pend">
        <span className="i">{Ico.clock}</span>
        <span className="tx"><b>Verification pending</b><span>We’re checking your ID documents, usually within 24 hours. Your profile goes live with the Verified badge once it’s approved.</span></span>
      </div>
    );
  }
  if (s === 'rejected') {
    return (
      <div role="alert" className="vban rej">
        <span className="i">!</span>
        <span className="tx"><b>Verification needs attention</b><span>{profile.rejection_reason ? `Reason: ${profile.rejection_reason}. ` : ''}Upload new documents so we can verify your profile.</span></span>
        <button type="button" className="x-btn primary sm" onClick={onStart} data-testid="verification-resubmit-btn">Resubmit documents</button>
      </div>
    );
  }
  return (
    <div className="vban start">
      <span className="i">{Ico.shield}</span>
      <span className="tx"><b>Verify your profile</b><span>Upload an ID and a selfie so we can verify you. Your profile goes live with the Verified badge once it’s approved — it takes about 2 minutes.</span></span>
      <button type="button" className="x-btn primary sm" onClick={onStart} data-testid="verification-start-btn">Start verification</button>
    </div>
  );
}

export function DangerZone({ onRemove, label = 'Remove my profile', text = 'This permanently deletes your profile, photos, subscriptions and verification documents. This can’t be undone.', button = 'Remove profile permanently' }) {
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <section aria-labelledby="dz-title" className="dsec dz">
      <h2 id="dz-title">{label}</h2>
      <p>{text}</p>
      <button type="button" className="danger" onClick={() => setAsk(true)} data-testid="remove-profile-btn">{button}</button>
      {ask && (
        <Dialog title="Remove profile permanently?" danger onClose={() => setAsk(false)}
          footer={<><button type="button" className="x-btn white" onClick={() => setAsk(false)}>Cancel</button><button type="button" className="x-btn dangerb" disabled={busy} onClick={async () => { setBusy(true); try { await onRemove(); } finally { setBusy(false); } }} data-testid="confirm-remove">{busy ? 'Removing…' : 'Remove permanently'}</button></>}>
          <p className="dtext">{text}</p>
        </Dialog>
      )}
    </section>
  );
}

export { Check };
