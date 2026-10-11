import { useState } from 'react';
import { CURRENCY_OPTIONS, currencySymbol, defaultSchedule } from '@/constants/companionData';
import { Card, Switch, Plus, XIcon, Chev } from '@/components/site/Form';

const HOURS = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const DAYS = [['monday', 'Monday'], ['tuesday', 'Tuesday'], ['wednesday', 'Wednesday'], ['thursday', 'Thursday'], ['friday', 'Friday'], ['saturday', 'Saturday'], ['sunday', 'Sunday']];
const placesFor = (who) => [
  ['incall', 'Incall', who === 'her' ? 'Clients visit her' : 'Clients visit you'],
  ['outcall', 'Outcall', who === 'her' ? 'She visits the client' : 'You visit the client'],
  ['both', 'Incall & outcall', 'Both options'],
];
const BASE = [['1hour', '1 hour', 1], ['2hours', '2 hours', 2], ['3hours', '3 hours', 3]];
const TAIL = [['overnight', 'Overnight', 900], ['weekend', 'Weekend', 901]];

const toH = (t) => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) + (m || 0) / 60; };
const filled = (v) => v !== undefined && v !== null && v !== '';

/** Day timeline bar: handles hours that run past midnight (e.g. 18:00 – 02:00). */
function DayBar({ on, start, end }) {
  if (!on) return <div className="dbar" aria-hidden="true" />;
  const s = toH(start); const e = toH(end);
  const seg = (a, b) => ({ left: `${(a / 24) * 100}%`, width: `${(Math.max(0, b - a) / 24) * 100}%` });
  return (
    <div className="dbar" aria-hidden="true">
      {e > s ? <span style={seg(s, e)} /> : <><span style={seg(s, 24)} /><span style={seg(0, e)} /></>}
    </div>
  );
}

function SwitchRow({ id, label, desc, checked, onChange, children, testId }) {
  return (
    <div className="ra-sw">
      <div className="r">
        <span className="tx"><span id={id} className="t">{label}</span>{desc && <span className="d">{desc}</span>}</span>
        <Switch checked={checked} onChange={onChange} labelledBy={id} testId={testId} />
      </div>
      {children}
    </div>
  );
}

/** Availability card (where, booking options, weekly hours). */
export function AvailabilityCard({ data, update, level = 1, who = 'you', sub }) {
  const schedule = data.schedule || defaultSchedule();
  const availType = data.availability_type || 'both';
  const is247 = !!data.available247;
  const setSchedule = (next, extra = {}) => update({ schedule: next, available247: false, ...extra });
  const setDay = (day, patch) => setSchedule({ ...schedule, [day]: { ...(schedule[day] || { available: true, start: '10:00', end: '22:00' }), ...patch } });
  const allMatch = (start, end) => DAYS.every(([d]) => schedule[d]?.available && schedule[d]?.start === start && schedule[d]?.end === end);
  const every1022 = !is247 && allMatch('10:00', '22:00');
  const applyAll = (start, end, extra = {}) => {
    const next = {};
    DAYS.forEach(([d]) => { next[d] = { available: true, start, end }; });
    update({ schedule: next, available247: false, ...extra });
  };
  const copyMonday = () => {
    const m = schedule.monday || { start: '10:00', end: '22:00' };
    const next = { ...schedule };
    DAYS.forEach(([d]) => { if (d !== 'monday' && next[d]?.available) next[d] = { ...next[d], start: m.start, end: m.end }; });
    setSchedule(next);
  };
  return (
    <Card level={level} title="Availability" sub={sub} testId="availability-card">
      <fieldset className="fs">
        <legend>Available for</legend>
        <div className="optcards three">
          {placesFor(who).map(([id, label, desc]) => (
            <label key={id} className={`optcard${availType === id ? ' on' : ''}`} data-testid={`availability-${id}`}>
              <input type="radio" name="avail-for" checked={availType === id} onChange={() => update({ availability_type: id })} />
              <span className="t"><b>{label}</b><small>{desc}</small></span>
            </label>
          ))}
        </div>
      </fieldset>
      <SwitchRow id="adv-l" label="Booking in advance required" checked={!!data.booking_advance} onChange={(v) => update({ booking_advance: v })} testId="booking-advance-toggle" />
      <SwitchRow id="travel-l" label="Available for worldwide travel" checked={!!data.worldwide_travel} onChange={(v) => update({ worldwide_travel: v })} testId="worldwide-travel-toggle" />

      <div className="ob-grp">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h2 className="ra-h">Weekly hours</h2>
          <label className="ra-preset"><input type="checkbox" checked={every1022} onChange={() => (every1022 ? null : applyAll('10:00', '22:00'))} data-testid="preset-daily" /><span>Every day 10–22</span></label>
          <label className="ra-preset"><input type="checkbox" checked={is247} onChange={() => (is247 ? applyAll('10:00', '22:00') : applyAll('00:00', '24:00', { available247: true }))} data-testid="preset-247" /><span>Available 24/7</span></label>
        </div>
        <div className="ra-tbl">
          <div className="ra-day hd" aria-hidden="true"><span /><span>Day</span><span>Hours</span><span className="ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></span></div>
          {DAYS.map(([d, name]) => {
            const s = schedule[d] || { available: false, start: '10:00', end: '22:00' };
            return (
              <div key={d} className={`ra-day${s.available ? ' on' : ''}`} data-testid={`day-row-${d}`}>
                <Switch checked={!!s.available} onChange={(v) => setDay(d, { available: v })} label={`Available on ${name}`} testId={`day-toggle-${d}`} />
                <span className="nm">{name}</span>
                <div className="hrs">
                  {s.available ? (
                    <>
                      <span className="sb tsel"><select aria-label={`${name} from`} value={s.start} onChange={(e) => setDay(d, { start: e.target.value })} data-testid={`day-start-${d}`}>{HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{h}</option>)}</select><Chev /></span>
                      <span aria-hidden="true" className="dash">–</span>
                      <span className="sb tsel"><select aria-label={`${name} until`} value={s.end} onChange={(e) => setDay(d, { end: e.target.value })} data-testid={`day-end-${d}`}>{HOURS.slice(1).map((h) => <option key={h} value={h}>{h}</option>)}</select><Chev /></span>
                    </>
                  ) : <span className="off">Unavailable</span>}
                </div>
                <DayBar on={s.available} start={s.start} end={s.end} />
              </div>
            );
          })}
        </div>
        <button type="button" className="ra-link" onClick={copyMonday} data-testid="copy-monday">Copy Monday’s hours to all active days</button>
      </div>
    </Card>
  );
}

/** Rates card (currency, durations × incall/outcall, extra hours, taxi). */
export function RatesCard({ data, update, level = 2, who = 'you' }) {
  const her = who === 'her';
  const rates = data.rates || { currency: 'EUR', incall: { extras: [] }, outcall: { extras: [] } };
  const availType = data.availability_type || 'both';
  const inOn = availType !== 'outcall';
  const outOn = availType !== 'incall';
  const sym = currencySymbol(rates.currency);
  const col = (k) => rates[k] || {};
  const isNew = ![...BASE, ...TAIL].some(([k]) => filled(col('incall')[k]) || filled(col('outcall')[k]));
  const [hidden, setHidden] = useState(() => {
    const h = {};
    [...BASE.slice(1), ...TAIL].forEach(([k]) => { if (!isNew && !filled(col('incall')[k]) && !filled(col('outcall')[k])) h[k] = true; });
    return h;
  });
  const [newHrs, setNewHrs] = useState('');
  const [addErr, setAddErr] = useState('');
  const setRates = (next) => update({ rates: next });
  const setVal = (kind, key, v) => setRates({ ...rates, [kind]: { ...col(kind), [key]: v } });
  const extrasOf = (kind) => (Array.isArray(col(kind).extras) ? col(kind).extras : []);
  const extraHours = Array.from(new Set([...extrasOf('incall'), ...extrasOf('outcall')].map((x) => Number(x.hours)).filter((h) => h > 0))).sort((a, b) => a - b);
  const extraVal = (kind, h) => extrasOf(kind).find((x) => Number(x.hours) === h)?.price ?? '';
  const setExtra = (kind, h, v) => {
    const list = extrasOf(kind);
    const next = list.some((x) => Number(x.hours) === h) ? list.map((x) => (Number(x.hours) === h ? { ...x, price: v } : x)) : [...list, { hours: h, price: v }];
    setRates({ ...rates, [kind]: { ...col(kind), extras: next } });
  };
  const rows = [
    ...BASE.filter(([k]) => k === '1hour' || !hidden[k]).map(([k, label, sort]) => ({ key: k, label, sort, base: true })),
    ...extraHours.filter((h) => h > 3).map((h) => ({ key: `x${h}`, h, label: `${h} hours`, sort: h })),
    ...TAIL.filter(([k]) => !hidden[k]).map(([k, label, sort]) => ({ key: k, label, sort, base: true })),
  ].sort((a, b) => a.sort - b.sort);

  const removeRow = (r) => {
    if (r.base) {
      setHidden((h) => ({ ...h, [r.key]: true }));
      setRates({ ...rates, incall: { ...col('incall'), [r.key]: '' }, outcall: { ...col('outcall'), [r.key]: '' } });
    } else {
      setRates({
        ...rates,
        incall: { ...col('incall'), extras: extrasOf('incall').filter((x) => Number(x.hours) !== r.h) },
        outcall: { ...col('outcall'), extras: extrasOf('outcall').filter((x) => Number(x.hours) !== r.h) },
      });
    }
  };
  const addHours = () => {
    const n = parseInt(newHrs, 10);
    if (!(n >= 1 && n <= 24)) { setAddErr('Enter a number of hours between 1 and 24.'); return; }
    const baseKey = { 1: '1hour', 2: '2hours', 3: '3hours' }[n];
    if (baseKey) {
      if (n === 1 || !hidden[baseKey]) { setAddErr(`You already have a ${n}-hour rate.`); return; }
      setHidden((h) => ({ ...h, [baseKey]: false }));
    } else {
      if (extraHours.includes(n)) { setAddErr(`You already have a ${n}-hour rate.`); return; }
      setRates({
        ...rates,
        incall: { ...col('incall'), extras: [...extrasOf('incall'), { hours: n, price: '' }] },
        outcall: { ...col('outcall'), extras: [...extrasOf('outcall'), { hours: n, price: '' }] },
      });
    }
    setNewHrs(''); setAddErr('');
  };
  const taxi = col('outcall').taxi;
  const taxiOn = filled(taxi) || !!rates.taxi_on;

  const cell = (kind, r) => {
    const on = kind === 'incall' ? inOn : outOn;
    if (!on) return <span className="off">Not offered</span>;
    const v = r.h ? extraVal(kind, r.h) : (col(kind)[r.key] ?? '');
    return (
      <label className="ib rate">
        <span className="pre">{sym}</span>
        <input type="number" min="0" inputMode="numeric" className="no-spinner" aria-label={`${r.label} ${kind} rate`} value={v}
          onChange={(e) => { const x = e.target.value.replace(/[^0-9]/g, '').slice(0, 6); if (r.h) setExtra(kind, r.h, x); else setVal(kind, r.key, x); }}
          data-testid={`rate-${kind}-${r.key}`} />
      </label>
    );
  };

  return (
    <Card level={level} className="ra-rates" testId="rates-card">
      <div className="ra-rh">
        <div className="ch">
          <h2 style={{ fontSize: 28, letterSpacing: '-.02em' }}>Rates</h2>
          <p>What clients pay per booking. Leave a field empty if {her ? 'she doesn’t' : 'you don’t'} offer it.</p>
        </div>
        <label className="ra-cur">
          <span>Currency</span>
          <span className="sb"><select value={rates.currency || 'EUR'} onChange={(e) => setRates({ ...rates, currency: e.target.value })} data-testid="currency-select">{CURRENCY_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}</select><Chev /></span>
        </label>
      </div>
      <div className="ra-tbl">
        <div className="ra-rate hd" aria-hidden="true"><span>Duration</span><span className={inOn ? '' : 'dim'}>Incall</span><span className={outOn ? '' : 'dim'}>Outcall</span><span /></div>
        {rows.map((r) => (
          <div key={r.key} className={`ra-rate${r.key === '1hour' ? ' first' : ''}`}>
            <span className="lb">{r.label}</span>
            <div className="c in">{cell('incall', r)}</div>
            <div className="c out">{cell('outcall', r)}</div>
            <div className="x">{r.key !== '1hour' && <button type="button" className="xbtn" aria-label={`Remove ${r.label}`} onClick={() => removeRow(r)} data-testid={`rate-remove-${r.key}`}><XIcon size={16} /></button>}</div>
          </div>
        ))}
      </div>
      <div className="fl">
        <label htmlFor="rt-add">Add extra hours</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="ib" style={{ width: 180, height: 48, padding: '0 14px' }}>
            <input id="rt-add" type="number" min="1" max="24" inputMode="numeric" className="no-spinner" placeholder="e.g. 5" value={newHrs} onChange={(e) => { setNewHrs(e.target.value.replace(/[^0-9]/g, '').slice(0, 2)); setAddErr(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addHours(); } }} style={{ fontSize: 15, fontWeight: 600 }} data-testid="add-hours-input" />
            <span className="unit">hours</span>
          </span>
          <button type="button" className="x-btn outl" style={{ height: 48 }} onClick={addHours} data-testid="add-hours-button"><Plus />Add</button>
        </div>
        {addErr && <span className="hm bad">{addErr}</span>}
      </div>
      {outOn && (
        <SwitchRow id="taxi-l" label="Taxi costs charged extra for outcall" desc={`Turn on if clients pay for ${her ? 'her' : 'your'} taxi on top of the outcall rate`}
          checked={taxiOn} onChange={(v) => setRates({ ...rates, taxi_on: v, outcall: { ...col('outcall'), taxi: v ? (taxi || '') : '' } })} testId="taxi-toggle">
          {taxiOn && (
            <div className="fl sub2">
              <label htmlFor="rt-taxi">Taxi cost</label>
              <span className="ib" style={{ width: 180, height: 48, padding: '0 14px', gap: 6 }}>
                <span className="pre" style={{ fontSize: 15 }}>{sym}</span>
                <input id="rt-taxi" type="number" min="0" inputMode="numeric" className="no-spinner" placeholder="0" value={taxi ?? ''} onChange={(e) => setVal('outcall', 'taxi', e.target.value.replace(/[^0-9]/g, '').slice(0, 5))} style={{ fontSize: 15, fontWeight: 600, textAlign: 'right' }} data-testid="taxi-input" />
              </span>
              <span className="hm">Shown next to your outcall rates, e.g. “+ {sym}30 taxi”.</span>
            </div>
          )}
        </SwitchRow>
      )}
    </Card>
  );
}

/** Step 4 — Availability + Rates. */
export const RatesAvailabilityStep = ({ data, update, who, availabilitySub }) => (
  <div className="ob-stack">
    <AvailabilityCard data={data} update={update} who={who} sub={availabilitySub} />
    <RatesCard data={data} update={update} who={who} />
  </div>
);

export default RatesAvailabilityStep;
