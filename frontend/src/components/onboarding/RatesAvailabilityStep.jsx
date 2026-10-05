import { useState } from 'react';
import { Trash, Plus, CaretDown, Check } from 'phosphor-react';
import { CURRENCY_OPTIONS, currencySymbol, defaultSchedule } from '@/constants/companionData';

const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday'
};

const CARD = 'bg-white border border-[#ECE8EF] rounded-2xl p-6 md:p-8 shadow-[0_6px_20px_rgba(52,24,60,0.06)]';

const toHours = (t) => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
};

/**
 * Step 4 — Rates & availability. Two cards (Availability, Rates).
 * Props: data (profileData), update (patch) => merges top-level keys into parent state.
 */
export const RatesAvailabilityStep = ({ data, update }) => {
  const [newHours, setNewHours] = useState('');

  const schedule = data.schedule || defaultSchedule();
  const days = Object.keys(schedule);
  const availType = data.availability_type || 'both';
  const kinds = availType === 'incall' || availType === 'outcall' ? [availType] : ['incall', 'outcall'];
  const rates = data.rates || { currency: 'EUR', incall: { extras: [] }, outcall: { extras: [] } };
  const sym = currencySymbol(rates.currency);

  /* ---------------- Availability helpers ---------------- */
  const setSchedule = (next, extra = {}) => update({ schedule: next, available247: false, ...extra });

  const toggleDay = (day) => {
    const s = schedule[day] || { available: false, start: '10:00', end: '22:00' };
    setSchedule({ ...schedule, [day]: { ...s, available: !s.available } });
  };
  const setDayTime = (day, field, value) => {
    const s = schedule[day] || { available: true, start: '10:00', end: '22:00' };
    setSchedule({ ...schedule, [day]: { ...s, [field]: value } });
  };

  const allDaysMatch = (start, end) =>
    days.length > 0 && days.every((d) => schedule[d]?.available && schedule[d]?.start === start && schedule[d]?.end === end);
  const is247 = !!data.available247;
  const everyDay1022 = !is247 && allDaysMatch('10:00', '22:00');

  const applyEveryDay1022 = () => {
    const next = {};
    days.forEach((d) => { next[d] = { available: true, start: '10:00', end: '22:00' }; });
    setSchedule(next);
  };
  const toggle247 = () => {
    const next = {};
    if (is247) {
      days.forEach((d) => { next[d] = { available: true, start: '10:00', end: '22:00' }; });
      update({ available247: false, schedule: next });
    } else {
      days.forEach((d) => { next[d] = { available: true, start: '00:00', end: '24:00' }; });
      update({ available247: true, schedule: next });
    }
  };
  const copyMonday = () => {
    const mon = schedule.monday;
    if (!mon) return;
    const next = {};
    days.forEach((d) => {
      next[d] = schedule[d]?.available ? { ...schedule[d], start: mon.start, end: mon.end } : schedule[d];
    });
    setSchedule(next);
  };

  /* ---------------- Rates helpers ---------------- */
  const setRates = (next) => update({ rates: next });
  const setCurrency = (c) => setRates({ ...rates, currency: c });
  const fixedVal = (kind, key) => rates?.[kind]?.[key] ?? '';
  const setFixed = (kind, key, value) => setRates({ ...rates, [kind]: { ...(rates[kind] || {}), [key]: value } });

  const extraHours = (() => {
    const s = new Set();
    kinds.forEach((k) => (rates[k]?.extras || []).forEach((e) => {
      if (e.hours !== '' && e.hours != null) s.add(Number(e.hours));
    }));
    return [...s].sort((a, b) => a - b);
  })();
  const extraPrice = (kind, hours) => {
    const e = (rates[kind]?.extras || []).find((x) => Number(x.hours) === Number(hours));
    return e ? (e.price ?? '') : '';
  };
  const setExtraPrice = (kind, hours, price) => {
    const col = rates[kind] || {};
    const extras = [...(col.extras || [])];
    const i = extras.findIndex((x) => Number(x.hours) === Number(hours));
    if (i >= 0) extras[i] = { ...extras[i], price };
    else extras.push({ hours: Number(hours), price });
    setRates({ ...rates, [kind]: { ...col, extras } });
  };
  const addExtraHour = () => {
    const h = Number(newHours);
    if (!h || h < 1) return;
    const next = { ...rates };
    kinds.forEach((k) => {
      const col = next[k] || {};
      const extras = [...(col.extras || [])];
      if (!extras.some((x) => Number(x.hours) === h)) extras.push({ hours: h, price: '' });
      next[k] = { ...col, extras };
    });
    setRates(next);
    setNewHours('');
  };
  const removeExtraHour = (hours) => {
    const next = { ...rates };
    ['incall', 'outcall'].forEach((k) => {
      if (next[k]?.extras) next[k] = { ...next[k], extras: next[k].extras.filter((x) => Number(x.hours) !== Number(hours)) };
    });
    setRates(next);
  };

  const taxiEnabled = !!(rates.outcall?.taxiEnabled ?? (rates.outcall?.taxi !== '' && rates.outcall?.taxi != null));
  const toggleTaxi = () => {
    if (taxiEnabled) setRates({ ...rates, outcall: { ...(rates.outcall || {}), taxiEnabled: false, taxi: '' } });
    else setRates({ ...rates, outcall: { ...(rates.outcall || {}), taxiEnabled: true } });
  };

  /* ---------------- UI atoms ---------------- */
  const checkbox = (on) => (
    <span className={`flex-shrink-0 w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-colors ${on ? 'bg-[#7A2357] border-[#7A2357]' : 'bg-white border-[#898989]'}`}>
      {on && <Check size={13} weight="bold" className="text-white" />}
    </span>
  );
  const radio = (on) => (
    <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${on ? 'border-[#7A2357]' : 'border-[#C9C3CE]'}`}>
      {on && <span className="w-2.5 h-2.5 rounded-full bg-[#7A2357]" />}
    </span>
  );
  const bigToggle = (on, onClick, testid) => (
    <button type="button" role="switch" aria-checked={on} onClick={onClick}
      className={`flex-shrink-0 w-12 h-7 rounded-full p-0.5 transition-colors ${on ? 'bg-[#7A2357]' : 'bg-[#D8D2DC]'}`} data-testid={testid}>
      <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
  const dayToggle = (on, onClick, testid) => (
    <button type="button" role="switch" aria-checked={on} onClick={onClick}
      className={`flex-shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-[#7A2357]' : 'bg-[#D8D2DC]'}`} data-testid={testid}>
      <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
  const timeSelect = (value, onChange, testid) => (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full rounded-lg border border-[#898989] bg-white pl-3 pr-8 py-2 text-sm text-[#1B1820] focus:border-[#7A2357] focus:outline-none cursor-pointer"
        data-testid={testid}>
        {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <CaretDown size={12} weight="bold" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E8597] pointer-events-none" />
    </div>
  );
  const moneyInput = (value, onChange, testid) => (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8E8597]">{sym}</span>
      <input type="text" inputMode="numeric" value={value || ''}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        className="w-full rounded-lg border border-[#898989] bg-white pl-7 pr-3 py-2 text-sm text-[#1B1820] text-right focus:border-[#7A2357] focus:outline-none"
        placeholder="—" data-testid={testid} />
    </div>
  );

  const timelineBar = (sched) => {
    const on = !!sched?.available;
    const s = toHours(sched?.start);
    const e = toHours(sched?.end);
    const left = Math.max(0, Math.min(100, (s / 24) * 100));
    const width = Math.max(0, Math.min(100, ((e - s) / 24) * 100));
    return (
      <div className="relative h-2 rounded-full bg-[#E4DCE6] w-full">
        {on && width > 0 && (
          <div className="absolute top-0 h-2 rounded-full bg-[#7A2357]" style={{ left: `${left}%`, width: `${width}%` }} />
        )}
      </div>
    );
  };

  const gridCols = `minmax(0,1.3fr) ${kinds.map(() => 'minmax(0,1fr)').join(' ')} 36px`;

  const rateRows = [
    { key: '1hour', label: '1 hour' },
    { key: '2hours', label: '2 hours' },
    { key: '3hours', label: '3 hours' },
    ...extraHours.map((h) => ({ key: `extra-${h}`, label: `${h} hours`, hours: h, removable: true })),
    { key: 'overnight', label: 'Overnight' },
  ];
  const cellValue = (row, kind) => (row.hours != null ? extraPrice(kind, row.hours) : fixedVal(kind, row.key));
  const setCell = (row, kind, v) => (row.hours != null ? setExtraPrice(kind, row.hours, v) : setFixed(kind, row.key, v));

  return (
    <div className="flex flex-col gap-6">
      {/* ======================= AVAILABILITY ======================= */}
      <div id="availability-section" className={`${CARD} scroll-mt-24`}>
        <div className="mb-6">
          <h3 className="text-[24px] md:text-[28px] font-bold text-[#1B1820] mb-1">Availability</h3>
          <p className="text-sm text-[#5F5966]">Where you meet clients and when they can book you.</p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Available for */}
          <div>
            <p className="text-[13px] font-semibold text-[#1B1820] mb-3">Available for</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: 'incall', title: 'Incall', sub: 'Clients visit you' },
                { value: 'outcall', title: 'Outcall', sub: 'You visit the client' },
                { value: 'both', title: 'Incall & outcall', sub: 'Both options' },
              ].map((opt) => {
                const on = availType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ availability_type: opt.value })}
                    className={`flex items-start gap-3 text-left rounded-xl border p-4 transition-colors ${on ? 'border-[#7A2357] bg-[#7A2357]/5' : 'border-[#DFDAE4] bg-white hover:border-[#7A2357]'}`}
                    data-testid={`availability-type-${opt.value}`}
                  >
                    {radio(on)}
                    <span>
                      <span className="block font-semibold text-[#1B1820]">{opt.title}</span>
                      <span className="block text-sm text-[#5F5966]">{opt.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Booking in advance */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-[#EBE0EA] px-5 py-4">
            <div>
              <div className="font-semibold text-[#1B1820]">Booking in advance required</div>
              <div className="text-sm text-[#5F5966]">Clients see &ldquo;Book ahead&rdquo; instead of &ldquo;Available now&rdquo;.</div>
            </div>
            {bigToggle(!!data.booking_advance, () => update({ booking_advance: !data.booking_advance }), 'booking-advance-toggle')}
          </div>

          {/* Weekly hours */}
          <div>
            <h4 className="text-lg font-bold text-[#1B1820] mb-3">Weekly hours</h4>
            <div className="flex flex-col gap-2 mb-4">
              <button type="button" onClick={applyEveryDay1022} className="flex items-center gap-3 text-left" data-testid="every-day-1022-checkbox">
                {checkbox(everyDay1022)}
                <span className="text-[15px] text-[#1B1820]">Every day 10&ndash;22</span>
              </button>
              <button type="button" onClick={toggle247} className="flex items-center gap-3 text-left" data-testid="available-247-checkbox">
                {checkbox(is247)}
                <span className="text-[15px] text-[#1B1820]">Available 24/7</span>
              </button>
            </div>

            <div className="rounded-xl border border-[#ECE8EF] overflow-hidden">
              {/* Header */}
              <div className="hidden sm:grid items-center gap-4 px-4 py-2.5 bg-[#F7F5F9] text-[11px] font-semibold uppercase tracking-wider text-[#8E8597]"
                style={{ gridTemplateColumns: '150px 210px 1fr' }}>
                <span>Day</span>
                <span>Hours</span>
                <div className="flex justify-between">
                  <span>00</span><span>06</span><span>12</span><span>18</span><span>24</span>
                </div>
              </div>

              {days.map((day) => {
                const sched = schedule[day] || { available: false, start: '10:00', end: '22:00' };
                return (
                  <div key={day} className="border-t border-[#F1ECF1] px-4 py-3">
                    {/* Desktop */}
                    <div className="hidden sm:grid items-center gap-4" style={{ gridTemplateColumns: '150px 210px 1fr' }}>
                      <div className="flex items-center gap-3">
                        {dayToggle(sched.available, () => toggleDay(day), `schedule-day-toggle-${day}`)}
                        <span className="text-[15px] text-[#1B1820]">{DAY_LABELS[day]}</span>
                      </div>
                      {sched.available ? (
                        <div className="flex items-center gap-2">
                          <div className="w-[88px]">{timeSelect(sched.start, (v) => setDayTime(day, 'start', v), `schedule-start-${day}`)}</div>
                          <span className="text-[#8E8597]">&ndash;</span>
                          <div className="w-[88px]">{timeSelect(sched.end, (v) => setDayTime(day, 'end', v), `schedule-end-${day}`)}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-[#8E8597]">Unavailable</span>
                      )}
                      {timelineBar(sched)}
                    </div>

                    {/* Mobile */}
                    <div className="sm:hidden flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        {dayToggle(sched.available, () => toggleDay(day), `schedule-day-toggle-m-${day}`)}
                        <span className="text-[15px] text-[#1B1820]">{DAY_LABELS[day]}</span>
                      </div>
                      {sched.available ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">{timeSelect(sched.start, (v) => setDayTime(day, 'start', v), `schedule-start-m-${day}`)}</div>
                          <span className="text-[#8E8597]">&ndash;</span>
                          <div className="flex-1">{timeSelect(sched.end, (v) => setDayTime(day, 'end', v), `schedule-end-m-${day}`)}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-[#8E8597]">Unavailable</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button type="button" onClick={copyMonday}
              className="mt-4 text-sm font-semibold text-[#7A2357] hover:text-[#A3243B] underline underline-offset-2 transition-colors"
              data-testid="copy-monday-button">
              Copy Monday&apos;s hours to all active days
            </button>
          </div>
        </div>
      </div>

      {/* ======================= RATES ======================= */}
      <div id="rates-section" className={`${CARD} scroll-mt-24`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-[24px] md:text-[28px] font-bold text-[#1B1820] mb-1">Rates</h3>
            <p className="text-sm text-[#5F5966]">What clients pay per booking. Leave a field empty if you don&apos;t offer it.</p>
          </div>
          <div className="sm:w-52">
            <label className="block text-[13px] font-semibold text-[#1B1820] mb-1">Currency</label>
            <div className="relative">
              <select value={rates.currency || 'EUR'} onChange={(e) => setCurrency(e.target.value)}
                className="appearance-none w-full rounded-lg border border-[#898989] bg-white pl-3 pr-9 py-2 text-sm text-[#1B1820] focus:border-[#7A2357] focus:outline-none cursor-pointer"
                data-testid="rates-currency-select">
                {CURRENCY_OPTIONS.map((opt) => <option key={opt.code} value={opt.code}>{opt.label}</option>)}
              </select>
              <CaretDown size={14} weight="bold" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E8597] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Rates table */}
        <div className="rounded-xl border border-[#ECE8EF] overflow-hidden">
          {/* Header (desktop) */}
          <div className="hidden sm:grid items-center gap-4 px-4 py-2.5 bg-[#F7F5F9] text-[11px] font-semibold uppercase tracking-wider text-[#8E8597]"
            style={{ gridTemplateColumns: gridCols }}>
            <span>Duration</span>
            {kinds.map((k) => <span key={k} className="capitalize">{k}</span>)}
            <span />
          </div>

          {rateRows.map((row) => (
            <div key={row.key} className="border-t border-[#F1ECF1] px-4 py-3">
              {/* Desktop */}
              <div className="hidden sm:grid items-center gap-4" style={{ gridTemplateColumns: gridCols }}>
                <span className="text-[15px] text-[#1B1820]">{row.label}</span>
                {kinds.map((kind) => (
                  <div key={kind}>{moneyInput(cellValue(row, kind), (v) => setCell(row, kind, v), `rate-${kind}-${row.key}`)}</div>
                ))}
                <div className="flex justify-center">
                  {row.removable && (
                    <button type="button" onClick={() => removeExtraHour(row.hours)}
                      className="text-[#8E8597] hover:text-[#A3243B] transition-colors" aria-label={`Remove ${row.label}`}
                      data-testid={`rate-extra-remove-${row.hours}`}>
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile */}
              <div className="sm:hidden flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-medium text-[#1B1820]">{row.label}</span>
                  {row.removable && (
                    <button type="button" onClick={() => removeExtraHour(row.hours)}
                      className="text-[#8E8597] hover:text-[#A3243B] transition-colors" aria-label={`Remove ${row.label}`}
                      data-testid={`rate-extra-remove-m-${row.hours}`}>
                      <Trash size={16} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {kinds.map((kind) => (
                    <div key={kind}>
                      <label className="block text-xs text-[#8E8597] mb-1 capitalize">{kind}</label>
                      {moneyInput(cellValue(row, kind), (v) => setCell(row, kind, v), `rate-${kind}-m-${row.key}`)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add extra hours */}
        <div className="mt-6">
          <label className="block text-[13px] font-semibold text-[#1B1820] mb-2">Add extra hours</label>
          <div className="flex gap-3">
            <div className="relative w-40">
              <input type="text" inputMode="numeric" value={newHours}
                onChange={(e) => setNewHours(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtraHour(); } }}
                className="w-full rounded-lg border border-[#898989] bg-white pl-3 pr-14 py-2.5 text-sm text-[#1B1820] focus:border-[#7A2357] focus:outline-none"
                placeholder="e.g. 5" data-testid="extra-hour-input" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8E8597]">hours</span>
            </div>
            <button type="button" onClick={addExtraHour}
              className="flex items-center gap-2 px-5 rounded-lg border border-[#7A2357] text-[#7A2357] font-semibold hover:bg-[#7A2357]/5 transition-colors"
              data-testid="add-extra-hour-button">
              <Plus size={16} weight="bold" /> Add
            </button>
          </div>
        </div>

        {/* Taxi (outcall) */}
        {kinds.includes('outcall') && (
          <div className="mt-6 rounded-xl bg-[#EBE0EA] px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-[#1B1820]">Taxi costs charged extra for outcall</div>
                <div className="text-sm text-[#5F5966]">Turn on if clients pay for your taxi on top of the outcall rate.</div>
              </div>
              {bigToggle(taxiEnabled, toggleTaxi, 'taxi-toggle')}
            </div>
            {taxiEnabled && (
              <div className="mt-4">
                <label className="block text-[13px] font-semibold text-[#1B1820] mb-1">Taxi cost</label>
                <div className="w-full sm:w-56">
                  {moneyInput(rates.outcall?.taxi ?? '', (v) => setFixed('outcall', 'taxi', v), 'taxi-cost-input')}
                </div>
                <p className="text-xs text-[#8E8597] mt-2">Shown next to your outcall rates, e.g. &ldquo;+ {sym}30 taxi&rdquo;.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RatesAvailabilityStep;
