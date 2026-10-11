import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '@/services/api';
import { PublicPage, Icon } from '@/components/site/Shell';
import { GlassField, ServerError, StatusIcon, EMAIL_RE } from '@/components/site/AuthBits';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverErr, setServerErr] = useState(false);
  const ok = EMAIL_RE.test(email.trim());

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerErr(false);
    if (!ok) return;
    setLoading(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSent(true);
      setSubmitted(false);
    } catch (err) {
      setServerErr(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPage bg="photo" mainClass="pub-auth">
      <section className="x-glass a-card" aria-labelledby="t">
        <Link to="/login" className="back"><Icon.back />Back to log in</Link>
        {!sent ? (
          <>
            <div className="a-head">
              <h1 id="t">Forgot your password?</h1>
              <p>Enter the e-mail address of your account and we’ll send you a link to reset it.</p>
            </div>
            {serverErr && <ServerError title="We couldn’t send the link." text="Check your connection and try again." />}
            <form noValidate onSubmit={submit}>
              <GlassField id="fp-email" label="E-mail" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={setEmail}
                error={submitted && !ok ? (email.trim() ? 'Enter a valid e-mail address, e.g. name@example.com.' : 'Enter your e-mail address.') : ''} testId="forgot-email-input" />
              <button type="submit" className="x-btn primary" disabled={loading} style={{ marginTop: 4 }} data-testid="forgot-submit">{loading ? 'Sending…' : 'Send reset link'}</button>
            </form>
            <div className="a-rule" />
            <p className="a-foot">Remembered it? <Link to="/login">Log in</Link></p>
          </>
        ) : (
          <div role="status" className="a-stack" style={{ gap: 24 }}>
            <div className="a-head">
              <StatusIcon tone="rose"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg></StatusIcon>
              <h1 id="t">Check your e-mail</h1>
              <p>If an account exists for <strong>{email.trim()}</strong>, we’ve sent a link to reset your password.</p>
            </div>
            <div className="a-tip"><Icon.info width="18" height="18" style={{ flexShrink: 0, marginTop: 1 }} /><span>The link expires in 24 hours. Can’t find it? Check your spam folder.</span></div>
            <div className="a-btns">
              <Link to="/login" className="x-btn primary">Back to log in</Link>
              <button type="button" className="x-btn white" onClick={() => { setSent(false); setEmail(''); }}>Use a different e-mail</button>
            </div>
          </div>
        )}
      </section>
    </PublicPage>
  );
}
