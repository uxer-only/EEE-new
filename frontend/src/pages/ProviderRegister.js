import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PublicPage } from '@/components/site/Shell';
import { GlassField, ServerError, GoogleButton, OrDivider, EMAIL_RE, startGoogleAuth } from '@/components/site/AuthBits';

const svg = (d) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const BENEFITS = [
  ['Every profile manually verified', 'We check each profile to ensure quality and authenticity.', svg(<><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></>)],
  ['A premium audience', 'Your ad sits next to other verified, upmarket profiles only.', svg(<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />)],
  ['Private and secure', 'Your account details are never shown on your profile.', svg(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>)],
];
const TYPES = [
  ['independent', 'Independent', 'I advertise myself', svg(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>)],
  ['agency', 'Agency', 'I manage several profiles', svg(<><circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a7 7 0 0 1 4 6.5" /></>)],
];

export default function ProviderRegister() {
  const [type, setType] = useState('independent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverErr, setServerErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const okMail = EMAIL_RE.test(email.trim());
  const okPw = password.length >= 8 && /[a-z]/i.test(password) && /\d/.test(password);

  const remember = () => { try { localStorage.setItem('pending_account_type', type); } catch (e) { /* ignore */ } };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerErr(null);
    if (!okMail || !okPw || !agree) return;
    setLoading(true);
    try {
      remember();
      await register(email.trim(), password, email.trim().split('@')[0], 'provider', type);
      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setServerErr(typeof detail === 'string' && /exist|registered/i.test(detail)
        ? { title: 'This e-mail is already registered.', text: 'Log in instead, or use another e-mail address.' }
        : { title: 'We couldn’t create your account.', text: typeof detail === 'string' ? detail : 'Check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPage bg="photo" mainClass="pub-auth">
      <section className="x-glass a-reg" aria-labelledby="t">
        <aside>
          <div className="intro">
            <span className="ey">For advertisers</span>
            <span className="big">Join our exclusive network</span>
            <span className="lead">Connect with discerning clients in a premium, secure environment designed for independent professionals and agencies.</span>
          </div>
          <ul>
            {BENEFITS.map(([t, d, i]) => (
              <li key={t}><span className="i" aria-hidden="true">{i}</span><span className="t"><b>{t}</b><small>{d}</small></span></li>
            ))}
          </ul>
        </aside>
        <div className="a-card">
          <div className="a-head">
            <h1 id="t">Register as advertiser</h1>
            <p>Create your account, then set up your profile.</p>
          </div>
          {serverErr && <ServerError {...serverErr} />}
          <form noValidate onSubmit={submit}>
            <fieldset className="a-types">
              <legend>I am</legend>
              <div role="radiogroup" className="opts">
                {TYPES.map(([id, label, desc, icon]) => (
                  <button key={id} type="button" role="radio" aria-checked={type === id} className={`a-opt${type === id ? ' on' : ''}`} onClick={() => setType(id)} data-testid={`account-type-${id}`}>
                    <span className="oi">{icon}</span>
                    <span className="ot"><b>{label}</b><small>{desc}</small></span>
                    <span className="rd" />
                  </button>
                ))}
              </div>
            </fieldset>
            <GoogleButton onClick={() => { remember(); startGoogleAuth(); }} testId="google-register-button" style={{ marginTop: 12 }} />
            <OrDivider />
            <GlassField id="ra-email" label="E-mail" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={setEmail}
              error={submitted && !okMail ? (email.trim() ? 'Enter a valid e-mail address, e.g. name@example.com.' : 'Enter your e-mail address.') : ''} testId="email-input" />
            <GlassField id="ra-pw" label="Password" password autoComplete="new-password" placeholder="Create a strong password" value={password} onChange={setPassword}
              hint="At least 8 characters, mixing letters and numbers."
              error={submitted && !okPw ? 'Use at least 8 characters, mixing letters and numbers.' : ''} testId="password-input" />
            <div className="a-terms">
              <label htmlFor="ra-terms">
                <input id="ra-terms" type="checkbox" checked={agree} onChange={() => setAgree((v) => !v)} aria-invalid={submitted && !agree ? 'true' : 'false'} data-testid="terms-checkbox" />
                <span>I confirm I am <strong>18 or older</strong> and agree to the <Link to="/terms" target="_blank">Terms, Privacy &amp; Cookies</Link>.</span>
              </label>
              {submitted && !agree && <span className="af-msg bad">Confirm you are 18 or older and accept the terms to continue.</span>}
            </div>
            <button type="submit" className="x-btn primary" disabled={loading} data-testid="register-button">{loading ? 'Creating account…' : 'Create account'}</button>
          </form>
          <p className="a-foot">Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </section>
    </PublicPage>
  );
}
