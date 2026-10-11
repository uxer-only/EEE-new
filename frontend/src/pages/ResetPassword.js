import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/services/api';
import { PublicPage } from '@/components/site/Shell';
import { GlassField, StatusIcon } from '@/components/site/AuthBits';

const Tick = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState(token ? 'form' : 'invalid'); // form | done | invalid

  const longOk = password.length >= 8;
  const mixOk = /[a-z]/i.test(password) && /\d/.test(password);
  const rule = (ok) => (ok ? 'ok' : submitted ? 'bad' : '');

  useEffect(() => {
    if (state !== 'done') return undefined;
    const t = setTimeout(() => navigate('/login'), 2500);
    return () => clearTimeout(t);
  }, [state, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!longOk || !mixOk || confirm !== password) return;
    setLoading(true);
    try {
      await resetPassword({ token, new_password: password });
      setState('done');
    } catch (err) {
      setState('invalid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPage bg="photo" mainClass="pub-auth">
      <section className="x-glass a-card" aria-labelledby="t">
        {state === 'form' && (
          <>
            <div className="a-head">
              <h1 id="t">Create a new password</h1>
              <p>Choose something only you’ll remember.</p>
            </div>
            <form noValidate onSubmit={submit}>
              <GlassField id="rp-pw" label="New password" password autoComplete="new-password" placeholder="Enter new password" value={password} onChange={setPassword}
                error={submitted && !longOk ? 'Your password is too short. Use at least 8 characters.' : ''} testId="reset-password-input" />
              <ul aria-label="Password requirements" className="a-rules">
                <li className={rule(longOk)}><span className="dot">{longOk && <Tick />}</span>At least 8 characters</li>
                <li className={rule(mixOk)}><span className="dot">{mixOk && <Tick />}</span>Letters and numbers</li>
              </ul>
              <GlassField id="rp-confirm" label="Confirm password" password autoComplete="new-password" placeholder="Re-enter new password" value={confirm} onChange={setConfirm}
                error={submitted && longOk && mixOk && confirm !== password ? (confirm ? 'The passwords don’t match. Re-enter the same password.' : 'Re-enter your new password.') : ''} testId="reset-confirm-input" />
              <button type="submit" className="x-btn primary" disabled={loading} style={{ marginTop: 4 }} data-testid="reset-submit">{loading ? 'Updating…' : 'Update password'}</button>
            </form>
          </>
        )}
        {state === 'done' && (
          <>
            <div role="status" className="a-head">
              <StatusIcon tone="green"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></StatusIcon>
              <h1 id="t">Password updated</h1>
              <p>Your password has been changed. Redirecting you to log in…</p>
            </div>
            <Link to="/login" className="x-btn primary" style={{ width: '100%' }}>Continue to log in</Link>
          </>
        )}
        {state === 'invalid' && (
          <>
            <div role="alert" className="a-head">
              <StatusIcon tone="red"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></StatusIcon>
              <h1 id="t">Invalid reset link</h1>
              <p>This reset link is incomplete or no longer valid. Request a new one and use the most recent e-mail.</p>
            </div>
            <div className="a-btns">
              <Link to="/forgot-password" className="x-btn primary">Request new link</Link>
              <Link to="/login" className="x-btn white">Back to log in</Link>
            </div>
          </>
        )}
      </section>
    </PublicPage>
  );
}
