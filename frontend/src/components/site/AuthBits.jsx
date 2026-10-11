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

export function StatusIcon({ tone = 'rose', children }) {
  return <span className={`a-sic ${tone}`} aria-hidden="true">{children}</span>;
}

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
