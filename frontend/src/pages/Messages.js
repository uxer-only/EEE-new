import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { listMyEnquiries, markEnquiryRead, replyToEnquiry } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifyError } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import '@/styles/advertiser.css';
import '@/styles/dashboard.css';

const Back = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
const Mail = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>;
const Send = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" /></svg>;
const Chat = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" /></svg>;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (d, yr) => `${d.getDate()} ${MON[d.getMonth()]}${yr ? ` ${d.getFullYear()}` : ''}`;
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const time = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso); const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return time(d);
  if (sameDay(d, y)) return 'Yesterday';
  if (now - d < 6 * 864e5) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return dm(d);
}
function fullDate(iso) {
  if (!iso) return '';
  const d = new Date(iso); const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `Today, ${time(d)}`;
  if (sameDay(d, y)) return `Yesterday, ${time(d)}`;
  return `${dm(d, d.getFullYear() !== now.getFullYear())}, ${time(d)}`;
}

/** Advertiser inbox: requests visitors send from a public profile. Replies go out by e-mail. */
export default function Messages() {
  const { user } = useAuth();
  const location = useLocation();
  const isAgency = user?.account_type === 'agency';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await listMyEnquiries();
      const list = data?.enquiries || [];
      setItems(list);
      return list;
    } catch (err) {
      notifyError(err, "We couldn't load your messages.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const open = useCallback(async (e, { fromUser = true } = {}) => {
    if (!e) return;
    setSel(e.enquiry_id);
    if (fromUser) { setMobileOpen(true); if (window.matchMedia('(max-width: 899px)').matches) window.scrollTo({ top: 0 }); }
    if (!e.read) {
      setItems((l) => l.map((x) => (x.enquiry_id === e.enquiry_id ? { ...x, read: true } : x)));
      try { await markEnquiryRead(e.enquiry_id, true); } catch (_e) { /* stays unread on the server; harmless */ }
    }
  }, []);

  useEffect(() => {
    load().then((list) => {
      const hash = (location.hash || '').replace('#', '');
      const target = list.find((x) => x.enquiry_id === hash);
      if (target) open(target);
      else if (list[0] && window.matchMedia('(min-width: 900px)').matches) open(list[0], { fromUser: false });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = useMemo(() => items.find((x) => x.enquiry_id === sel) || null, [items, sel]);
  const unread = items.filter((x) => !x.read).length;
  const draft = (cur && drafts[cur.enquiry_id]) || '';

  const send = async (ev) => {
    ev.preventDefault();
    if (!cur || draft.trim().length < 2) return;
    setSending(true);
    try {
      const { data } = await replyToEnquiry(cur.enquiry_id, draft.trim());
      const entry = { message: draft.trim(), sent_at: new Date().toISOString(), delivered: !!data?.delivered };
      setItems((l) => l.map((x) => (x.enquiry_id === cur.enquiry_id ? { ...x, read: true, replies: [...(x.replies || []), entry] } : x)));
      setDrafts((d) => ({ ...d, [cur.enquiry_id]: '' }));
      if (data?.delivered === false) toast.message('Reply saved', { description: "E-mail sending isn't set up on this server, so the visitor didn't receive it." });
      else toast.success(`Reply sent to ${cur.name}`);
    } catch (err) {
      notifyError(err, "We couldn't send your reply.");
    } finally {
      setSending(false);
    }
  };

  const nameFor = (e) => e.provider_name || 'you';

  return (
    <LightPage>
      <div className="adv inbox-pg" data-testid="messages-page">
        <Link to="/dashboard" className="lnk back" data-testid="back-dashboard"><Back />Back to dashboard</Link>
        <header className="msgs-head">
          <h1>Messages</h1>
          <p>Requests visitors send from {isAgency ? 'your companions’ profiles' : 'your profile'}. Your reply is sent as an e-mail to the visitor.</p>
        </header>

        {!loading && items.length === 0 && (
          <section className="msgs-empty" data-testid="messages-empty">
            <span className="ic"><Chat /></span>
            <h2>No messages yet</h2>
            <p>When a visitor sends a request from {isAgency ? 'one of your profiles' : 'your profile'}, it appears here and in your e-mail.</p>
          </section>
        )}

        {loading && <section className="msgs-empty"><p>Loading messages…</p></section>}

        {!loading && items.length > 0 && (
          <div className={`msgs-box${mobileOpen && cur ? ' reading' : ''}`}>
            <aside aria-label="Inbox" className="msgs-list">
              <div className="lh">
                <span className="t">Inbox</span>
                <span className="c">{items.length} {items.length === 1 ? 'message' : 'messages'}{unread ? ` · ${unread} new` : ''}</span>
              </div>
              <ul>
                {items.map((e) => {
                  const on = e.enquiry_id === sel;
                  const isNew = !e.read && !on;
                  return (
                    <li key={e.enquiry_id}>
                      <button type="button" className={`cv${on ? ' on' : ''}${isNew ? ' new' : ''}`} aria-current={on ? 'true' : undefined} onClick={() => open(e)} data-testid={`msg-${e.enquiry_id}`}>
                        <span className="dot">{isNew && <span aria-label="Unread" />}</span>
                        <span className="bd">
                          <span className="r1"><span className="nm">{e.name}</span><span className="dt">{shortDate(e.created_at)}</span></span>
                          <span className="em">{isAgency && e.provider_name ? `For ${e.provider_name} · ` : ''}{e.email}</span>
                          <span className="pv">{(e.message || '').replace(/\s+/g, ' ')}</span>
                          {(e.replies || []).length > 0 && <span className="rp">Replied</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <section aria-label={cur ? `Message from ${cur.name}` : 'Message'} className="msgs-read">
              {cur ? (
                <>
                  <div className="body">
                    <button type="button" className="lnk inbox" onClick={() => setMobileOpen(false)}><Back />Inbox</button>
                    <div className="mh">
                      <span className="who">
                        <span className="tt">Request from {cur.name}</span>
                        <span className="fr">From <strong>{cur.name}</strong> · {cur.email}{isAgency && cur.provider_name ? <> · for <strong>{cur.provider_name}</strong></> : null}</span>
                      </span>
                      <span className="dt">{fullDate(cur.created_at)}</span>
                    </div>
                    <p className="txt">{cur.message}</p>
                    {(cur.replies || []).map((r, i) => (
                      <div className="rep" key={`${r.sent_at}-${i}`}>
                        <span className="rh">Your reply · {fullDate(r.sent_at)}</span>
                        <p>{r.message}</p>
                      </div>
                    ))}
                  </div>
                  <form aria-label="Reply" className="msgs-form" onSubmit={send}>
                    <div className="meta">
                      <span className="k">To</span>
                      <span className="v"><Mail /><span>{cur.name} &lt;{cur.email}&gt;</span></span>
                      <span className="k">Subject</span>
                      <span className="v">Re: Your request to {nameFor(cur) === 'you' ? (user?.name || 'you') : nameFor(cur)} on Elite Escorts Europe</span>
                    </div>
                    <label className="ta-wrap">
                      <span className="sr-only">Your reply to {cur.name}</span>
                      <textarea className="ta" rows={4} placeholder="Write your reply…" value={draft} onChange={(ev) => setDrafts((d) => ({ ...d, [cur.enquiry_id]: ev.target.value }))} data-testid="reply-text" />
                    </label>
                    <div className="act">
                      <span className="note">Sent as an e-mail from Elite Escorts Europe. Your own e-mail address stays private.</span>
                      <button type="submit" className="x-btn primary" disabled={sending || draft.trim().length < 2} data-testid="send-reply"><Send />{sending ? 'Sending…' : 'Send reply'}</button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="msgs-pick">Pick a message to read it.</div>
              )}
            </section>
          </div>
        )}
      </div>
    </LightPage>
  );
}
