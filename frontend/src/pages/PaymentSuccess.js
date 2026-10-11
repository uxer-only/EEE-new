import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSubscriptionStatus, getProviderDashboard, listMyInvoices, invoicePdfUrl } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { PublicPage } from '@/components/site/Shell';
import '@/styles/public.css';

const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 8;

const I = {
  ok: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#24603F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  fail: <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#A3243B" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  arrow: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  ext: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>,
  dl: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
  retry: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12a8 8 0 0114-5.3L20 9M20 4v5h-5M20 12a8 8 0 01-14 5.3L4 15M4 20v-5h5" /></svg>,
  warn: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#A3243B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>,
  user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  tick: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
};

const PLAN_LEN = { featured_7d: '7 days', featured_15d: '15 days', featured_1m: '1 month', featured_3m: '3 months' };
const planLabel = (fp, vp) => [PLAN_LEN[fp] ? `Featured · ${PLAN_LEN[fp]}` : 'Featured', vp ? 'VIP' : null].filter(Boolean).join(' + ');

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sessionId = searchParams.get('session_id');
  const isAgency = searchParams.get('agency') === '1';
  const [state, setState] = useState({ status: 'pending', tx: null });
  const [extra, setExtra] = useState({ profile: null, invoice: null });

  // Agency: show which profiles went live, then move on to the dashboard.
  useEffect(() => {
    if (state.status === 'paid' && isAgency) {
      const t = setTimeout(() => navigate('/dashboard'), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [state.status, isAgency, navigate]);

  useEffect(() => {
    if (!sessionId) { setState({ status: 'error', tx: null }); return undefined; }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      try {
        const { data } = await getSubscriptionStatus(sessionId);
        if (cancelled) return;
        if (data.payment_status === 'paid') { setState({ status: 'paid', tx: data }); return; }
        if (data.status === 'expired') { setState({ status: 'failed', tx: data }); return; }
        attempts += 1;
        if (attempts >= MAX_ATTEMPTS) { setState({ status: 'timeout', tx: data }); return; }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (_pollErr) {
        if (!cancelled) setState({ status: 'error', tx: null });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  // After a successful independent payment: public profile link + latest invoice.
  useEffect(() => {
    if (state.status !== 'paid' || isAgency) return;
    Promise.allSettled([getProviderDashboard(), listMyInvoices()]).then(([d, inv]) => {
      setExtra({
        profile: d.status === 'fulfilled' ? d.value.data?.profile || null : null,
        invoice: inv.status === 'fulfilled' ? (inv.value.data?.invoices || [])[0] || null : null,
      });
    });
  }, [state.status, isAgency]);

  const tx = state.tx || {};
  const profiles = tx.profiles || [];
  const agency = isAgency || profiles.length > 1;
  const verified = extra.profile ? !!extra.profile.verified : true;

  let title; let lead;
  if (agency) {
    title = profiles.length === 1 ? 'Your profile is live' : 'Your profiles are live';
    lead = `Thank you. ${profiles.length === 1 ? 'The profile below is' : 'All paid profiles are'} now Featured on Elite Escorts Europe.`;
  } else if (!verified) {
    title = 'Your plan is active';
    lead = 'Thank you. Your profile goes live as soon as your identity is verified.';
  } else {
    title = 'Your profile is live';
    lead = `Thank you. Your Featured listing${tx.vip_plan ? ' and VIP are' : ' is'} active.`;
  }

  return (
    <PublicPage bg="photo" noAgeGate mainClass="pay-main">
      <section className="x-glass pay-card" data-testid="payment-status-card" aria-live="polite">
        {state.status === 'pending' && (
          <>
            <span className="pay-spin" aria-hidden="true" />
            <div className="pay-tx">
              <h1>Confirming payment…</h1>
              <p>Please don't close this window.</p>
            </div>
          </>
        )}

        {state.status === 'paid' && (
          <>
            <span className="pay-ic ok">{I.ok}</span>
            <div className="pay-tx">
              <span className="ey">Payment received</span>
              <h1 data-testid="paid-title">{title}</h1>
              <p>{lead}</p>
            </div>
            {agency && profiles.length > 0 && (
              <>
                <ul className="pay-list">
                  {profiles.map((pr) => (
                    <li key={pr.provider_id}>
                      <span className="av">{I.user}</span>
                      <span className="nm"><strong>{pr.name}</strong><span>{planLabel(pr.featured_plan, pr.vip_plan)}</span></span>
                      <span className="live">{I.tick}Live</span>
                    </li>
                  ))}
                </ul>
                <span className="pay-wait"><span className="pay-spin sm" aria-hidden="true" />Taking you to your dashboard…</span>
              </>
            )}
            <div className="pay-btns">
              <button type="button" className="x-btn primary lg" onClick={() => navigate('/dashboard')} data-testid="go-dashboard-btn">Go to dashboard{I.arrow}</button>
              {!agency && extra.profile?.provider_id && (
                <Link to={`/providers/${extra.profile.provider_id}`} className="x-btn glass lg" data-testid="view-public-btn">View public profile{I.ext}</Link>
              )}
            </div>
            <div className="pay-rule" />
            <div className="pay-foot">
              {user?.email && <span>A receipt was sent to {user.email}.</span>}
              {extra.invoice?.invoice_id && (
                <a className="pay-lnk" href={invoicePdfUrl(extra.invoice.invoice_id)} target="_blank" rel="noopener noreferrer" data-testid="invoice-pdf">{I.dl}Download invoice (PDF)</a>
              )}
            </div>
          </>
        )}

        {(state.status === 'failed' || state.status === 'error') && (
          <>
            <span className="pay-ic bad">{I.fail}</span>
            <div className="pay-tx">
              <h1>Payment didn't complete</h1>
              <p>No charge was made. You can try again any time.</p>
            </div>
            <div className="pay-note" role="note">
              {I.warn}
              <span>
                <strong>Reason:</strong>{' '}
                {state.status === 'failed'
                  ? 'the secure checkout session expired before payment was completed. Your profile and current plan are unchanged.'
                  : "we couldn't confirm this payment. Your profile and current plan are unchanged."}
              </span>
            </div>
            <div className="pay-btns">
              <button type="button" className="x-btn primary lg" onClick={() => navigate(agency ? '/dashboard' : '/dashboard/plan')} data-testid="retry-btn">{I.retry}Try again</button>
              <button type="button" className="x-btn glass lg" onClick={() => navigate('/dashboard')}>Back to dashboard</button>
            </div>
            <span className="pay-help">Need help? <Link to="/contact" className="pay-lnk inl">Contact us</Link></span>
          </>
        )}

        {state.status === 'timeout' && (
          <>
            <span className="pay-spin" aria-hidden="true" />
            <div className="pay-tx">
              <h1>Still processing…</h1>
              <p>The payment provider is taking a bit longer than usual. Your dashboard updates automatically once payment is confirmed.</p>
            </div>
            <div className="pay-btns">
              <button type="button" className="x-btn primary lg" onClick={() => navigate('/dashboard')} data-testid="go-dashboard-late-btn">Go to dashboard{I.arrow}</button>
            </div>
          </>
        )}
      </section>
    </PublicPage>
  );
}
