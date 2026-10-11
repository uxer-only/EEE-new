import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PublicPage } from '@/components/site/Shell';
import { GlassField, ServerError, EMAIL_RE } from '@/components/site/AuthBits';

const Shield = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2.5 4 5.5v6c0 5 3.4 9.4 8 10.5 4.6-1.1 8-5.5 8-10.5v-6l-8-3z" /><path d="m9 12 2 2 4-4" /></svg>;
const Lock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

/** Administrator log in (restricted). Non-admin accounts are logged out again. */
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverErr, setServerErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const eBad = submitted && !EMAIL_RE.test(email.trim());
  const pBad = submitted && !password;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerErr(null);
    if (!EMAIL_RE.test(email.trim()) || !password) return;
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      if (user?.role !== 'admin') {
        await logout();
        setServerErr({ title: 'This is not an administrator account.', text: 'Use the regular log in for advertiser accounts.' });
        return;
      }
      navigate('/admin');
    } catch (err) {
      const status = err?.response?.status;
      setServerErr(status === 401 || status === 400
        ? { title: 'We couldn’t log you in.', text: 'Check your e-mail and password and try again.' }
        : { title: 'Something went wrong.', text: 'Check your connection and try again in a moment.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPage bg="photo" mainClass="pub-auth" noAgeGate>
      <section className="x-glass a-card adml-card" aria-labelledby="t">
        <div className="a-head">
          <span className="adm-badge" data-testid="admin-login-badge"><Shield />Administrator</span>
          <h1 id="t" data-testid="admin-login-title">Administrator log in</h1>
          <p>Restricted area. Log in with your administrator account.</p>
        </div>
        {serverErr && <ServerError {...serverErr} />}
        <div className="a-stack"><form noValidate onSubmit={submit}>
          <GlassField id="ad-email" label="E-mail" type="email" autoComplete="email" placeholder="admin@example.com" value={email} onChange={setEmail}
            error={eBad ? (email.trim() ? 'Enter a valid e-mail address, e.g. name@example.com.' : 'Enter your e-mail address.') : ''} testId="admin-email-input" />
          <GlassField id="ad-pw" label="Password" password autoComplete="current-password" placeholder="Your password" value={password} onChange={setPassword}
            labelExtra={<Link to="/forgot-password">Forgot password?</Link>}
            error={pBad ? 'Enter your password.' : ''} testId="admin-password-input" />
          <button type="submit" className="x-btn primary" disabled={loading} style={{ marginTop: 4 }} data-testid="admin-login-button">{loading ? 'Logging in…' : 'Log in'}</button>
        </form></div>
      </section>
      <p className="adm-alt"><Lock />Not an administrator? <Link to="/login">Go to the regular log in</Link></p>
    </PublicPage>
  );
}
