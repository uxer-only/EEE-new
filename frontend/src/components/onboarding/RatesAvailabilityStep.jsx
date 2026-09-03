import { Plus, Trash } from 'phosphor-react';
import { CURRENCY_OPTIONS, currencySymbol } from '@/constants/companionData';

/**
 * Availability + Rates — identical UI to the independent provider flow.
 * Props:
 *  - data: { rates, schedule, availability_type, available247, booking_advance }
 *  - update: (patch) => void   // merges top-level keys into parent state
 */
export const RatesAvailabilityStep = ({ data, update }) => {
  const schedule = data.schedule || {};
  const rates = data.rates || {};

  return (
    <div className="space-y-10">
      {/* Availability */}
      <div id="availability-section" className="flex flex-col gap-4 scroll-mt-24">
        <div>
          <h3 className="text-2xl font-bold text-[#832161] mb-1">Availability</h3>
          <p className="text-[#000000] text-sm">Set your availability for each day</p>
        </div>

        <div>
          <label className="input-label">Available for</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'incall', label: 'Incall' },
              { value: 'outcall', label: 'Outcall' },
              { value: 'both', label: 'Incall & outcall' }
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ availability_type: opt.value })}
                className={`py-3 px-4 border text-sm uppercase tracking-wider transition-all ${
                  data.availability_type === opt.value
                    ? 'border-[#832161] text-[#832161]'
                    : 'border-[#898989] text-[#898989] hover:border-[#832161]'
                }`}
                data-testid={`availability-type-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-0">
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={data.available247 || false}
              onChange={(e) => {
                const is247 = e.target.checked;
                const updatedSchedule = {};
                Object.keys(schedule).forEach((day) => {
                  updatedSchedule[day] = { available: !is247, start: '10:00', end: '22:00' };
                });
                update({ available247: is247, schedule: updatedSchedule });
              }}
              className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#832161] checked:border-[#832161]"
            />
            <span className="text-[#000000]">Available 24/7</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer py-1 border-b border-[#dbdadd]">
            <input
              type="checkbox"
              checked={data.booking_advance || false}
              onChange={(e) => update({ booking_advance: e.target.checked })}
              className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#832161] checked:border-[#832161]"
              data-testid="booking-advance-checkbox"
            />
            <span className="text-[#000000]">Booking in advance necessary</span>
          </label>
        </div>

        <div className="space-y-4">
          {Object.entries(schedule).map(([day, sched]) => (
            <div key={day} className="flex items-center gap-4 py-3 border-b border-[#dbdadd]">
              <label className="flex items-center gap-3 cursor-pointer w-32">
                <input
                  type="checkbox"
                  checked={sched.available}
                  onChange={(e) => update({ schedule: { ...schedule, [day]: { ...sched, available: e.target.checked } } })}
                  className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#832161] checked:border-[#832161]"
                />
                <span className="text-[#000000] capitalize">{day}</span>
              </label>
              {sched.available && (
                <>
                  <input
                    type="time"
                    value={sched.start}
                    onChange={(e) => update({ schedule: { ...schedule, [day]: { ...sched, start: e.target.value } } })}
                    className="input-premium px-3 py-2"
                  />
                  <span className="text-[#000000]">to</span>
                  <input
                    type="time"
                    value={sched.end}
                    onChange={(e) => update({ schedule: { ...schedule, [day]: { ...sched, end: e.target.value } } })}
                    className="input-premium px-3 py-2"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#dbdadd]"></div>

      {/* Rates */}
      <div id="rates-section" className="flex flex-col gap-4 scroll-mt-24">
        <div>
          <h3 className="text-2xl font-bold text-[#832161] mb-1">Rates</h3>
        </div>

        <div>
          <label className="input-label" htmlFor="rates-currency-select">Select currency</label>
          <select
            id="rates-currency-select"
            value={rates.currency || 'EUR'}
            onChange={(e) => update({ rates: { ...rates, currency: e.target.value } })}
            className="input-premium w-full md:w-72"
            data-testid="rates-currency-select"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className={`grid grid-cols-1 gap-8 ${data.availability_type === 'both' ? 'md:grid-cols-2' : ''}`}>
          {['incall', 'outcall']
            .filter((kind) => data.availability_type === 'both' || data.availability_type === kind)
            .map((kind) => {
              const col = rates[kind] || { '1hour': '', '2hours': '', '3hours': '', overnight: '', extras: [] };
              const setCol = (next) => update({ rates: { ...rates, [kind]: next } });
              const setKey = (key, value) => setCol({ ...col, [key]: value });
              const setExtra = (idx, patch) => {
                const extras = [...(col.extras || [])];
                extras[idx] = { ...extras[idx], ...patch };
                setCol({ ...col, extras });
              };
              const removeExtra = (idx) => {
                const extras = (col.extras || []).filter((_, i) => i !== idx);
                setCol({ ...col, extras });
              };
              const addExtra = () => {
                const used = new Set([1, 2, 3, ...(col.extras || []).map((e) => Number(e.hours))]);
                let next = 4;
                while (used.has(next)) next += 1;
                setCol({ ...col, extras: [...(col.extras || []), { hours: next, price: '' }] });
              };

              return (
                <div key={kind} className="flex flex-col gap-4">
                  <h4 className="text-[#832161] uppercase tracking-[0.2em] text-sm">{kind === 'incall' ? 'Incall' : 'Outcall'}</h4>

                  {[
                    { key: '1hour', label: '1 hour' },
                    { key: '2hours', label: '2 hours' },
                    { key: '3hours', label: '3 hours' },
                    { key: 'overnight', label: 'Overnight' }
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="input-label">{label}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000] text-sm">{currencySymbol(rates.currency)}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={col[key]}
                          onChange={(e) => setKey(key, e.target.value.replace(/[^0-9]/g, ''))}
                          className="input-premium w-full !pl-14"
                          placeholder="0"
                          data-testid={`rate-${kind}-${key}`}
                        />
                      </div>
                    </div>
                  ))}

                  {(col.extras || []).map((extra, idx) => (
                    <div key={`extra-${idx}`} className="flex items-end gap-2">
                      <div className="w-20">
                        <label className="input-label">Hours</label>
                        <input
                          type="number"
                          min="4"
                          max="48"
                          value={extra.hours || ''}
                          onChange={(e) => setExtra(idx, { hours: e.target.value.replace(/[^0-9]/g, '') })}
                          className="input-premium w-full text-center"
                          data-testid={`rate-${kind}-extra-hours-${idx}`}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="input-label">Price</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000] text-sm">{currencySymbol(rates.currency)}</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={extra.price || ''}
                            onChange={(e) => setExtra(idx, { price: e.target.value.replace(/[^0-9]/g, '') })}
                            className="input-premium w-full !pl-14"
                            placeholder="0"
                            data-testid={`rate-${kind}-extra-price-${idx}`}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExtra(idx)}
                        className="h-[50px] px-3 border border-[#dbdadd] text-[#000000] hover:border-red-500 hover:text-red-500 transition-colors"
                        data-testid={`rate-${kind}-extra-remove-${idx}`}
                        aria-label="Remove duration"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addExtra}
                    className="w-full py-3 border border-dashed border-[#dbdadd] text-[#000000] hover:border-[#832161] hover:text-[#DA4167] transition-colors flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                    data-testid={`rate-${kind}-add-hour`}
                  >
                    <Plus size={16} />
                    Add hour
                  </button>

                  {kind === 'outcall' && (
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={col.taxiEnabled ?? (col.taxi !== '' && col.taxi !== undefined && col.taxi !== null)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setKey('taxiEnabled', true);
                            } else {
                              setCol({ ...col, taxiEnabled: false, taxi: '' });
                            }
                          }}
                          className="w-5 h-5 rounded border-[#dbdadd] bg-white checked:bg-[#DA4167] checked:border-[#DA4167]"
                          data-testid={`rate-${kind}-taxi-toggle`}
                        />
                        <span className="text-[#000000] text-sm">Taxi not included</span>
                      </label>
                      {(col.taxiEnabled ?? (col.taxi !== '' && col.taxi !== undefined && col.taxi !== null)) && (
                        <div className="relative mt-1">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#000000] text-sm">{currencySymbol(rates.currency)}</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={col.taxi ?? ''}
                            onChange={(e) => setKey('taxi', e.target.value.replace(/[^0-9]/g, ''))}
                            className="input-premium w-full !pl-14"
                            placeholder="0"
                            data-testid={`rate-${kind}-taxi`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default RatesAvailabilityStep;
