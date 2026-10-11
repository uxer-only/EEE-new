/* Light-theme form primitives for advertiser / agency / admin pages. */
import '@/styles/advertiser.css';

export const Chev = () => (
  <svg className="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);
export const Check = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
);
export const Plus = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
export const XIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const Warn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
);
export const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ArrowL = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
);
export const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);

/** Section card. level 1 → h1 (first card of a step), else h2. */
export function Card({ id, title, sub, tag, level = 2, children, testId, className = '', extra }) {
  const H = level === 1 ? 'h1' : 'h2';
  return (
    <section id={id} className={`ob-card ${className}`} aria-labelledby={id ? `${id}-t` : undefined} data-testid={testId}>
      {(title || sub) && (
        <div className="ch">
          <div className="tl">
            {title && <H id={id ? `${id}-t` : undefined}>{title}</H>}
            {tag && <span className="ob-tag">{tag}</span>}
            {extra}
          </div>
          {sub && <p>{sub}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Msg({ id, error, hint }) {
  if (!error && !hint) return null;
  return <span id={id} className={`hm${error ? ' bad' : ''}`}>{error && <Warn />}{error || hint}</span>;
}

/** Text input in a 52px box. `pre`/`unit` render inside the box; `icon` sits on the left. */
export function TextField({ id, label, labelRight, value, onChange, placeholder, type = 'text', icon, pre, unit, maxLength, error, hint, className = '', style, testId, inputProps = {} }) {
  return (
    <div className={`fl ${className}`} style={style}>
      {(label || labelRight) && <div className="lr">{label && <label htmlFor={id}>{label}</label>}{labelRight}</div>}
      <div className={`ib${error ? ' bad' : ''}`}>
        {icon}
        {pre && <span className="pre">{pre}</span>}
        <input
          id={id}
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={type === 'number' ? 'no-spinner' : undefined}
          data-testid={testId}
          {...inputProps}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      <Msg id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({ id, label, value, onChange, children, error, hint, className = '', testId, ariaLabel }) {
  const sel = (
    <span className="sb">
      <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={error ? 'bad' : undefined} aria-label={ariaLabel} data-testid={testId}>
        {children}
      </select>
      <Chev />
    </span>
  );
  if (!label) return sel;
  return (
    <div className={`fl ${className}`}>
      <label htmlFor={id}>{label}</label>
      {sel}
      <Msg id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}

/** Segmented control. options: [{value,label}] or strings. allowNone: click again to clear. */
export function Seg({ legend, options, value, onChange, eq = false, allowNone = true, testId, className = '' }) {
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  const body = (
    <div className={`sgc${eq ? ' eq' : ''}`} data-testid={testId}>
      {opts.map((o) => {
        const on = value === o.value;
        return (
          <button key={String(o.value)} type="button" aria-pressed={on} onClick={() => onChange(on && allowNone ? '' : o.value)} data-testid={testId ? `${testId}-${String(o.value).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
  if (!legend) return body;
  return (
    <fieldset className={`fs ${className}`}>
      <legend>{legend}</legend>
      {body}
    </fieldset>
  );
}

/** Toggle pill (chip). */
export function Pill({ on, onClick, children, testId, showCheck = true }) {
  return (
    <button type="button" className="pill" aria-pressed={!!on} onClick={onClick} data-testid={testId}>
      {on && showCheck && <Check />}
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, labelledBy, label, testId }) {
  return (
    <button type="button" role="switch" className="sw" aria-checked={!!checked} aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label} onClick={() => onChange(!checked)} data-testid={testId}>
      <span className="tr"><span className="kn" /></span>
    </button>
  );
}

/** Step indicator. steps: [{id,label}], current id; onPick(id) makes completed steps clickable. */
export function Stepper({ steps, current, onPick, maxReached }) {
  const idx = steps.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Profile steps" className="ob-steps">
      <ol>
        {steps.map((s, i) => {
          const done = i < idx;
          const now = i === idx;
          const clickable = onPick && !now && (done || (maxReached !== undefined && i <= maxReached));
          return (
            <li key={s.id} className={done ? 'done' : now ? 'now' : ''} aria-current={now ? 'step' : undefined}>
              {clickable ? (
                <button type="button" className="dot" onClick={() => onPick(s.id)} aria-label={`Go to step ${i + 1}: ${s.label}`}>{done ? <Check /> : i + 1}</button>
              ) : (
                <span className="dot">{done ? <Check /> : i + 1}</span>
              )}
              <span className="lab">{s.label}</span>
              {i < steps.length - 1 && <span className="line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Note({ children }) {
  return <div role="note" className="ob-note"><InfoIcon /><span>{children}</span></div>;
}

export function ErrorSummary({ title, items }) {
  if (!items || !items.length) return null;
  return (
    <div role="alert" className="ob-err">
      <Warn />
      <div>
        <b>{title}</b>
        <ul>{items.map((x) => <li key={x.href + x.msg}><a href={x.href}>{x.msg}</a></li>)}</ul>
      </div>
    </div>
  );
}
