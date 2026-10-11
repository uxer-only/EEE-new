import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PublicPage } from '@/components/site/Shell';
import { GlassField, ServerError, EMAIL_RE } from '@/components/site/AuthBits';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverErr, setServerErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
      await login(email.trim(), password);
      navigate('/dashboard');
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
    <PublicPage bg="photo" mainClass="pub-auth">
      <section className="x-glass a-card" aria-labelledby="t">
        <div className="a-head">
          <h1 id="t" data-testid="login-title">Log in</h1>
          <p>Welcome back. Log in to manage your profile.</p>
        </div>
        {serverErr && <ServerError {...serverErr} />}
        <div className="a-stack" style={{ gap: 24 }}>
          <form noValidate onSubmit={submit}>
            <GlassField id="li-email" label="E-mail" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={setEmail}
              error={eBad ? (email.trim() ? 'Enter a valid e-mail address, e.g. name@example.com.' : 'Enter your e-mail address.') : ''} testId="email-input" />
            <GlassField id="li-pw" label="Password" password autoComplete="current-password" placeholder="Your password" value={password} onChange={setPassword}
              labelExtra={<Link to="/forgot-password" data-testid="forgot-password-link">Forgot password?</Link>}
              error={pBad ? 'Enter your password.' : ''} testId="password-input" />
            <button type="submit" className="x-btn primary" disabled={loading} style={{ marginTop: 4 }} data-testid="login-button">{loading ? 'Logging in…' : 'Log in'}</button>
          </form>
        </div>
        <div className="a-rule" />
        <p className="a-foot">No account yet? <Link to="/register/provider" data-testid="register-link">Register as advertiser</Link></p>
      </section>
    </PublicPage>
  );
}
