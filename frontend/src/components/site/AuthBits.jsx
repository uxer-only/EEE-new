import { useState } from 'react';
import '@/styles/auth.css';

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

const Warn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
);
const EyeOpen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeShut = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
);

/** Glass input with label, inline error / hint and optional show-password toggle. */
export function GlassField({ id, label, labelExtra, type = 'text', value, onChange, placeholder, autoComplete, error, hint, password = false, testId }) {
  const [show, setShow] = useState(false);
  const msg = error || hint;
  return (
    <div className="af">
      <div className="af-lr"><label htmlFor={id}>{label}</label>{labelExtra}</div>
      <div className={`af-box${error ? ' bad' : ''}`}>
        <input
          id={id}
          type={password ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={msg ? `${id}-msg` : undefined}
          data-testid={testId}
        />
        {password && (
          <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} aria-controls={id} data-testid={testId ? `${testId}-toggle` : undefined}>
            {show ? <EyeShut /> : <EyeOpen />}
          </button>
        )}
      </div>
      {msg && <span id={`${id}-msg`} className={`af-msg${error ? ' bad' : ''}`}>{error && <Warn />}{msg}</span>}
    </div>
  );
}

export function ServerError({ title, text }) {
  return (
    <div role="alert" className="a-alert"><Warn /><span><strong>{title}</strong> {text}</span></div>
  );
}

export function GoogleButton({ onClick, testId, style }) {
  return (
    <button type="button" className="a-google" onClick={onClick} data-testid={testId} style={style}>
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
      Continue with Google
    </button>
  );
}

export function OrDivider() {
  return <div role="separator" className="a-or"><span /><em>or</em><span /></div>;
}

/** Big round status icon used on result screens. tone: rose | green | red */
export function StatusIcon({ tone = 'rose', children }) {
  return <span className={`a-sic ${tone}`} aria-hidden="true">{children}</span>;
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export const startGoogleAuth = () => {
  const redirectUrl = window.location.origin + '/dashboard';
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};
