import { useState } from 'react';
import { SERVICE_GROUPS, GROUPED_SERVICES } from '@/constants/companionData';
import { Card, Switch, Plus, XIcon } from '@/components/site/Form';

const COMPANIONSHIP = [
  ['escort', 'Escort', 'Dates and companionship, at your place or theirs.'],
  ['massage', 'Erotic massage', 'Massage-focused sessions.'],
];

const Chevron = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, transition: 'transform .15s', transform: `rotate(${open ? 90 : 0}deg)` }}><path d="m9 6 6 6-6 6" /></svg>
);
export const AccessIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B04585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8" /><path d="M10 8.5v5h5l2.5 5" /><path d="M10 11H6.5" /><path d="M8 13.6A4.5 4.5 0 1 0 14 18" /></svg>
);

/** "Welcoming to clients with disabilities" block (icon top-left, switch far right). */
export function AccessibilityToggle({ checked, onChange, who = 'your' }) {
  return (
    <div className="sv-acc">
      <span className="ic"><AccessIcon /></span>
      <span className="tx">
        <span id="acc-l" className="t">Welcoming to clients with disabilities</span>
        <span className="d">Shows an accessibility badge on {who} profile</span>
      </span>
      <Switch checked={checked} onChange={onChange} labelledBy="acc-l" testId="accepts-disabilities-toggle" />
    </div>
  );
}

/**
 * Services picker. data.services = { [name]: { type: 'inclusive' | 'extra' | null, price } }.
 * data.companionshipType: 'escort' | 'erotic-massage' | 'both'.
 */
export const ServicesStep = ({ data, update, showCompanionshipType = true, showDisabilities = true, title = 'Services', level = 1, who = 'your', note = null, sub }) => {
  const [open, setOpen] = useState({ incl: true, extra: false, custom: true });
  const [draft, setDraft] = useState('');
  const services = data.services || {};
  const typeOf = (name, def) => services[name]?.type || null;
  const isOn = (name) => !!services[name]?.type;
  const setSvc = (name, patch, def) => {
    const cur = services[name] || { type: null, price: '' };
    update({ services: { ...services, [name]: { ...cur, ...patch } } });
  };
  // remembers the Included/Extra choice for unticked rows so ticking keeps it
  const [pending, setPending] = useState({});

  const custom = Object.keys(services).filter((k) => !GROUPED_SERVICES.includes(k) && services[k] && (services[k].type || services[k].custom));
  const groups = [...SERVICE_GROUPS];
  if (custom.length) groups.push({ id: 'custom', title: 'Added by you', defaultType: 'extra', services: custom, custom: true });

  const total = GROUPED_SERVICES.length + custom.length;
  const chosen = [...GROUPED_SERVICES, ...custom].filter(isOn).length;

  const ct = data.companionshipType || '';
  const comp = { escort: ct === 'escort' || ct === 'both', massage: ct === 'erotic-massage' || ct === 'both' };
  const setComp = (id) => {
    const next = { ...comp, [id]: !comp[id] };
    update({ companionshipType: next.escort && next.massage ? 'both' : next.escort ? 'escort' : next.massage ? 'erotic-massage' : '' });
  };

  const addCustom = () => {
    const v = draft.trim().slice(0, 40);
    if (!v) return;
    if (Object.keys(services).some((k) => k.toLowerCase() === v.toLowerCase() && services[k]?.type)) { setDraft(''); return; }
    update({ services: { ...services, [v]: { type: 'extra', price: '', custom: true } } });
    setDraft('');
    setOpen((o) => ({ ...o, custom: true }));
  };
  const removeCustom = (name) => {
    const next = { ...services };
    delete next[name];
    update({ services: next });
  };

  return (
    <Card level={level} title={title} sub={sub || 'Tick what you offer. For each one, say whether it’s included in your rate or costs extra.'} testId="services-card">
      {note}
      {showCompanionshipType && (
        <fieldset className="fs">
          <legend style={{ marginBottom: 12 }}>Type of companionship <span style={{ fontWeight: 500, color: 'var(--x-muted)' }}>· choose one or both</span></legend>
          <div className="optcards two">
            {COMPANIONSHIP.map(([id, label, desc]) => (
              <label key={id} className={`optcard${comp[id] ? ' on' : ''}`} data-testid={`companionship-${id}`}>
                <input type="checkbox" checked={comp[id]} onChange={() => setComp(id)} />
                <span className="t"><b>{label}</b><small>{desc}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {showDisabilities && <AccessibilityToggle checked={!!data.accepts_disabilities} onChange={(v) => update({ accepts_disabilities: v })} who={who} />}

      <div className="ob-grp">
        <div className="sv-head">
          <h2>What {who === 'your' ? 'you offer' : 'she offers'}</h2>
          <span className="cnt" data-testid="services-count">{chosen}/{total}</span>
        </div>
        <p className="sv-sub">Tick the services {who === 'your' ? 'you offer' : 'she offers'}. Unticked services are not shown on {who} profile.</p>

        {groups.map((g) => {
          const n = g.services.filter(isOn).length;
          const isOpen = !!open[g.id];
          return (
            <div key={g.id} className="sv-grp">
              <button type="button" className="gh" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))} data-testid={`service-group-${g.id}`}>
                <Chevron open={isOpen} />
                <span className="tt">{g.title}</span>
                <span className={`gc${n ? ' on' : ''}`}>{n}/{g.services.length}</span>
              </button>
              {isOpen && (
                <>
                  <div className="sv-row hd" aria-hidden="true"><span>Service</span><span>Pricing</span><span>Extra cost</span></div>
                  {g.services.map((name) => {
                    const on = isOn(name);
                    const t = typeOf(name) || pending[name] || g.defaultType;
                    const price = services[name]?.price || '';
                    const pick = (type) => {
                      if (on) setSvc(name, { type, price: type === 'extra' ? price : '' });
                      else setPending((p) => ({ ...p, [name]: type }));
                    };
                    return (
                      <div key={name} className={`sv-row${on ? ' on' : ''}`}>
                        <label className="nm">
                          <input type="checkbox" checked={on} onChange={() => setSvc(name, on ? { type: null, price: '' } : { type: t, price: '' })} data-testid={`service-toggle-${name}`} />
                          <span>{name}</span>
                          {g.custom && <button type="button" className="rmx" aria-label={`Remove ${name}`} onClick={(e) => { e.preventDefault(); removeCustom(name); }}><XIcon size={12} /></button>}
                        </label>
                        <div>
                          <div role="group" aria-label={`${name} pricing`} className="isg">
                            <button type="button" aria-pressed={t === 'inclusive'} onClick={() => pick('inclusive')} data-testid={`pricing-included-${name}`}>Included</button>
                            <button type="button" aria-pressed={t === 'extra'} onClick={() => pick('extra')} data-testid={`pricing-extra-${name}`}>Extra</button>
                          </div>
                        </div>
                        <div className="pr">
                          {t === 'extra' ? (
                            <label className={`ib sm${on && t === 'extra' && !price ? ' warn' : ''}`}>
                              <span className="pre">€</span>
                              <input type="number" min="0" inputMode="numeric" aria-label={`${name} extra price in euro`} value={price} disabled={!on}
                                onChange={(e) => setSvc(name, { price: e.target.value.replace(/[^0-9]/g, '').slice(0, 5) })} className="no-spinner" data-testid={`service-price-${name}`} />
                            </label>
                          ) : (
                            <span className="inrate">In {who} rate</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          );
        })}

        <div className="sv-add">
          <label htmlFor="sv-custom">Missing something? Add {who === 'your' ? 'your' : 'her'} own service</label>
          <div className="r">
            <span className="ib"><input id="sv-custom" type="text" maxLength={40} placeholder="e.g. Dinner date" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} data-testid="custom-service-input" /></span>
            <button type="button" className="x-btn outl" onClick={addCustom} data-testid="custom-service-add"><Plus />Add</button>
          </div>
          <span className="hm" style={{ marginTop: 0 }}>Custom services are checked by our team before they appear on {who} profile.</span>
        </div>
      </div>
    </Card>
  );
};

export default ServicesStep;
