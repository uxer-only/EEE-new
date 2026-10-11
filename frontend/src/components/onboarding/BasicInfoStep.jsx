import { useEffect, useRef, useState } from 'react';
import CharacteristicsForm from '@/components/CharacteristicsForm';
import { splitPhone, joinPhone, DIAL_CODE_OPTIONS } from '@/constants/companionData';
import { Card, TextField, SelectField, Seg, Pill, Msg, Plus, XIcon } from '@/components/site/Form';

export const COUNTRIES = [
  'Belgium', 'Netherlands', 'Luxembourg', 'France', 'Germany', 'United Kingdom',
  'Spain', 'Italy', 'Portugal', 'Switzerland', 'Austria', 'Ireland', 'Denmark',
  'Sweden', 'Norway', 'Finland', 'Poland', 'Czech Republic', 'Greece', 'Croatia',
  'Hungary', 'Romania', 'Bulgaria', 'Slovenia', 'Slovakia', 'Estonia', 'Latvia',
  'Lithuania', 'Cyprus', 'Malta', 'Monaco', 'Andorra', 'United States', 'Canada',
  'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Mexico',
  'United Arab Emirates', 'Singapore', 'Japan', 'South Korea', 'Thailand', 'Other',
];

export const LANGUAGE_PRESETS = ['English', 'Dutch', 'French', 'German', 'Russian'];
const MORE_LANGUAGES = [
  ['Italian', 'Italiano'], ['Spanish', 'Español'], ['Portuguese', 'Português'], ['Polish', 'Polski'],
  ['Romanian', 'Română'], ['Ukrainian', 'Українська'], ['Czech', 'Čeština'], ['Hungarian', 'Magyar'],
  ['Bulgarian', 'Български'], ['Greek', 'Ελληνικά'], ['Turkish', 'Türkçe'], ['Arabic', 'العربية'],
  ['Swedish', 'Svenska'], ['Danish', 'Dansk'], ['Norwegian', 'Norsk'], ['Finnish', 'Suomi'],
  ['Croatian', 'Hrvatski'], ['Serbian', 'Српски'], ['Slovak', 'Slovenčina'], ['Lithuanian', 'Lietuvių'],
  ['Latvian', 'Latviešu'], ['Estonian', 'Eesti'], ['Albanian', 'Shqip'], ['Chinese', '中文'],
  ['Japanese', '日本語'], ['Korean', '한국어'], ['Thai', 'ไทย'], ['Vietnamese', 'Tiếng Việt'],
  ['Hindi', 'हिन्दी'], ['Persian', 'فارسی'], ['Hebrew', 'עברית'], ['Filipino', 'Filipino'],
];

const MESSAGING_APPS = [
  { key: 'hasWhatsapp', label: 'WhatsApp' },
  { key: 'hasTelegram', label: 'Telegram', id: 'telegramId', idLabel: 'Telegram username', prefix: '@', ph: 'mila.brussels', help: 'Find it in Telegram › Settings › Username' },
  { key: 'hasSignal', label: 'Signal' },
  { key: 'hasSms', label: 'SMS' },
  { key: 'hasViber', label: 'Viber' },
  { key: 'hasLine', label: 'Line', id: 'lineId', idLabel: 'Line ID', ph: 'your-line-id', help: 'Find it in Line › Settings › Profile' },
  { key: 'hasWechat', label: 'WeChat', id: 'wechatId', idLabel: 'WeChat ID', ph: 'your-wechat-id', help: 'Find it in WeChat › Me' },
];

const PinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B04585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
);

/** "Add language" popover with search; extra languages appear as removable chips. */
export function LanguagePicker({ languages, onChange, testId = 'basic-lang' }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const toggle = (l) => onChange(languages.includes(l) ? languages.filter((x) => x !== l) : [...languages, l]);
  const extra = languages.filter((l) => !LANGUAGE_PRESETS.includes(l));
  const ql = q.trim().toLowerCase();
  const opts = MORE_LANGUAGES.filter(([l, n]) => !ql || l.toLowerCase().includes(ql) || n.toLowerCase().includes(ql));
  const canAddCustom = ql && !MORE_LANGUAGES.some(([l]) => l.toLowerCase() === ql) && !LANGUAGE_PRESETS.some((l) => l.toLowerCase() === ql);
  return (
    <fieldset className="fs">
      <legend className="split"><span>Languages you speak</span><span className="cnt wine" style={{ fontSize: 13, fontWeight: 600, color: 'var(--x-cta)' }}>{languages.length} selected</span></legend>
      <div className="pills">
        {LANGUAGE_PRESETS.map((l) => <Pill key={l} on={languages.includes(l)} onClick={() => toggle(l)} testId={`${testId}-${l.toLowerCase()}`}>{l}</Pill>)}
        {extra.map((l) => (
          <span key={l} className="pill" aria-pressed="true" style={{ cursor: 'default' }}>
            {l}
            <button type="button" className="rm" aria-label={`Remove ${l}`} onClick={() => toggle(l)}><XIcon size={12} /></button>
          </span>
        ))}
        <span className="lpop-wrap" ref={ref}>
          <button type="button" className="pill add" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)} data-testid="add-language-button"><Plus />Add language</button>
          {open && (
            <div role="dialog" aria-label="Add languages" className="lpop">
              <div className="srch">
                <label className="ib"><SearchIcon /><input type="search" aria-label="Search languages" placeholder="Search languages" value={q} onChange={(e) => setQ(e.target.value)} autoFocus data-testid="add-language-input" /></label>
              </div>
              <div className="list">
                {opts.length > 0 && <span className="lt">{ql ? 'Matching languages' : 'More languages'}</span>}
                {opts.map(([l, n]) => (
                  <label key={l}><input type="checkbox" checked={languages.includes(l)} onChange={() => toggle(l)} /><span>{l}</span><small>{n}</small></label>
                ))}
                {canAddCustom && (
                  <button type="button" className="pill add" style={{ margin: '8px' }} onClick={() => { toggle(q.trim().replace(/^\w/, (c) => c.toUpperCase())); setQ(''); }} data-testid="add-language-confirm"><Plus />Add “{q.trim()}”</button>
                )}
                {!opts.length && !canAddCustom && <span className="none">No languages match “{q}”.</span>}
              </div>
              <div className="ft"><span>{languages.length} selected</span><button type="button" className="x-btn primary sm" onClick={() => setOpen(false)}>Done</button></div>
            </div>
          )}
        </span>
      </div>
    </fieldset>
  );
}

/** Contact details: phone with country code, e-mail and messaging apps. */
export function ContactFields({ contact = {}, country, countryDialCodes = {}, onChange, errors = {} }) {
  const set = (patch) => onChange({ ...contact, ...patch });
  const fallback = countryDialCodes[country] || '';
  const { dial, number } = splitPhone(contact.phone, fallback);
  const withIds = MESSAGING_APPS.filter((a) => a.id && contact[a.key]);
  return (
    <>
      <div className="ob-grp ob-half">
        <div className="fl">
          <label htmlFor="ct-phone">Mobile phone</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="sb code">
              <select aria-label="Country code" value={dial} onChange={(e) => set({ phone: joinPhone(e.target.value, number) })} data-testid="phone-dial-select">
                {!dial && <option value="">Code</option>}
                {DIAL_CODE_OPTIONS.map((o) => <option key={`${o.iso}${o.dial}`} value={o.dial}>{o.iso} {o.dial}</option>)}
              </select>
              <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </span>
            <span className={`ib${errors.phone ? ' bad' : ''}`} style={{ flexGrow: 1, minWidth: 0 }}>
              <input id="ct-phone" type="tel" placeholder="470 12 34 56" value={number} onChange={(e) => set({ phone: joinPhone(dial, e.target.value) })} aria-invalid={errors.phone ? 'true' : 'false'} aria-describedby="ct-phone-msg" data-testid="phone-input" />
            </span>
          </div>
          <Msg id="ct-phone-msg" error={errors.phone} />
        </div>
        <TextField id="ct-mail" label="E-mail" type="email" icon={<MailIcon />} placeholder="you@example.com" value={contact.email} onChange={(v) => set({ email: v })} error={errors.email} testId="email-input" />
      </div>
      <fieldset className="fs">
        <legend style={{ marginBottom: 4 }}>Clients can also reach you on</legend>
        <span style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--x-muted)' }}>Shown as buttons on your profile. WhatsApp, Signal, SMS and Viber use the number above; Telegram, Line and WeChat need your ID.</span>
        <div className="pills">
          {MESSAGING_APPS.map((a) => <Pill key={a.key} on={!!contact[a.key]} onClick={() => set({ [a.key]: !contact[a.key] })} testId={`contact-${a.label.toLowerCase()}`}>{a.label}</Pill>)}
        </div>
        {withIds.length > 0 && (
          <div className="idbox">
            {withIds.map((a) => {
              const missing = !!errors[a.id];
              const val = (contact[a.id] || '').replace(/^@/, '');
              return (
                <label key={a.id} className="fl">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="lb">{a.idLabel}</span><span className="req">Required</span></span>
                  <span className={`ib${missing ? ' bad' : ''}`} style={{ gap: 6 }}>
                    {a.prefix && <span className="pre">{a.prefix}</span>}
                    <input type="text" value={val} onChange={(e) => set({ [a.id]: e.target.value.replace(/^@/, '') })} placeholder={a.ph} data-testid={`${a.id.replace('Id', '')}-id-input`} />
                  </span>
                  <span className={`hm${missing ? ' bad' : ''}`}>{missing ? `Enter your ${a.idLabel} or turn ${a.label} off.` : a.help}</span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
    </>
  );
}

/**
 * Step 1 — Basic information, contact and physical characteristics.
 * Props: data (profile data), update(patch) merges top-level keys,
 *  hideLocationContact (agency companion: location/contact come from agency defaults),
 *  errors: { display_name, age, city, country, phone, email, telegramId, ... }
 */
export default function BasicInfoStep({ data, update, hideLocationContact = false, countryDialCodes = {}, errors = {}, nameLabel = 'Display name' }) {
  const c = data.characteristics || {};
  const setChar = (patch) => update({ characteristics: { ...c, ...patch } });
  const location = data.location || { city: '', country: '' };

  const setCountry = (country) => {
    const newDial = countryDialCodes[country] || '';
    const oldDial = countryDialCodes[location.country] || '';
    const { number } = splitPhone(data.contact?.phone, oldDial);
    update({
      location: { ...location, country },
      contact: { ...(data.contact || {}), phone: newDial ? joinPhone(newDial, number) : (data.contact?.phone || '') },
    });
  };

  return (
    <div className="ob-stack">
      <Card id="sec-about" level={1} title="Basic information" sub="This is what clients see first. You can change it any time." testId="basic-info-card">
        <div className="ob-grp">
          <TextField
            id="bi-name" label={nameLabel} className="ob-half" value={data.display_name} maxLength={30}
            onChange={(v) => update({ display_name: v })} placeholder="e.g. Mila"
            unit={<span style={{ fontSize: 13, fontWeight: 600 }}>{(data.display_name || '').length}/30</span>}
            error={errors.display_name} hint="No real name needed." testId="display-name-input"
          />
          <TextField
            id="bi-age" label="Age" type="number" style={{ width: 180 }} value={data.age}
            onChange={(v) => update({ age: v.replace(/[^0-9]/g, '').slice(0, 2) })}
            unit="years" error={errors.age} hint="18 or older." testId="age-input" inputProps={{ min: 18, max: 99, inputMode: 'numeric' }}
          />
          <Seg legend="Gender" options={[{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }, { value: 'trans', label: 'Trans' }]} value={data.gender} onChange={(v) => update({ gender: v })} testId="gender-input" />
          <Seg legend="Orientation" options={['Straight', 'Bi', 'Lesbian', 'Gay']} value={c.orientation} onChange={(v) => setChar({ orientation: v })} testId="orientation-input" />
        </div>

        {!hideLocationContact && (
          <div className="ob-grp ob-half">
            <TextField id="bi-city" label="City" icon={<PinIcon />} value={location.city} onChange={(v) => update({ location: { ...location, city: v } })} placeholder="Start typing your city" error={errors.city} hint="Clients only see your city, never your address." testId="city-input" />
            <SelectField id="bi-country" label="Country" value={location.country} onChange={setCountry} error={errors.country} testId="country-input">
              <option value="">Select country</option>
              {COUNTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </SelectField>
          </div>
        )}

        <div className="fl">
          <div className="lr"><label htmlFor="bi-about">Describe yourself</label><span className="cnt">{(data.bio || '').length}/1500</span></div>
          <span className="sub">Shown as “My Essence” on your profile. Tell clients what makes you unique.</span>
          <textarea id="bi-about" className="ta" rows={6} maxLength={1500} value={data.bio || ''} onChange={(e) => update({ bio: e.target.value.slice(0, 1500) })} placeholder="Warm, curious and easy to talk to…" data-testid="essence-input" />
        </div>

        <LanguagePicker languages={Array.isArray(c.languages) ? c.languages : []} onChange={(languages) => setChar({ languages })} />
      </Card>

      {!hideLocationContact && (
        <Card id="sec-contact" title="Contact information" sub="How clients reach you to make an enquiry." testId="contact-info-card">
          <ContactFields contact={data.contact || {}} country={location.country} countryDialCodes={countryDialCodes} onChange={(contact) => update({ contact })} errors={errors} />
        </Card>
      )}

      <Card id="sec-physical" title="Physical characteristics" tag="Optional" sub="Fill in only what you want on your profile. These details power the search filters." testId="physical-characteristics-card">
        <CharacteristicsForm characteristics={c} onChange={(next) => update({ characteristics: next })} />
      </Card>
    </div>
  );
}
