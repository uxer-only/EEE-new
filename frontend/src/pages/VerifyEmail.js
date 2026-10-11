import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { PublicPage } from '@/components/site/Shell';
import { StatusIcon } from '@/components/site/AuthBits';

const I = {
  mail: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="a-spin" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>,
  ok: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>,
  bad: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
};

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const { checkAuth } = useAuth();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke would consume the one-time token
    ran.current = true;
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    verifyEmail(token)
      .then(() => { setStatus('success'); checkAuth(); })
      .catch(() => setStatus('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PublicPage bg="photo" mainClass="pub-auth">
      <section className="x-glass a-card" style={{ paddingTop: 48 }} data-testid="verify-email-page">
        {status === 'verifying' && (
          <div role="status" aria-live="polite" className="a-head center">
            <StatusIcon tone="rose">{I.mail}</StatusIcon>
            <h1>Confirming your e-mail…</h1>
            <p>Just a moment.</p>
          </div>
        )}
        {status === 'success' && (
          <>
            <div role="status" className="a-head center">
              <StatusIcon tone="green">{I.ok}</StatusIcon>
              <h1>E-mail confirmed</h1>
              <p>Your e-mail address has been confirmed. You’re all set.</p>
            </div>
            <Link to="/dashboard" className="x-btn primary" style={{ width: '100%' }} data-testid="verify-dashboard">Go to my dashboard</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div role="alert" className="a-head center">
              <StatusIcon tone="red">{I.bad}</StatusIcon>
              <h1>Confirmation failed</h1>
              <p>We couldn’t confirm your e-mail. The link may have expired or be incomplete. Use the link in your most recent e-mail.</p>
            </div>
            <div className="a-btns">
              <Link to="/dashboard" className="x-btn primary">Go to my dashboard</Link>
              <Link to="/contact" className="x-btn white">Contact support</Link>
            </div>
          </>
        )}
      </section>
    </PublicPage>
  );
}
