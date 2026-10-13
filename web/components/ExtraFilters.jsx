'use client';

/**
 * "More filters" panel content on /browse.
 * Every filter maps to a field advertisers fill in on their profile, using the
 * same option lists, so a filter can always match a real profile.
 *
 * Exports helpers used by the Browse page:
 *  - EXTRA_FILTER_DEFAULTS  blank values for every extra filter
 *  - extraFilterParams()    filters → query params for GET /providers
 *  - extraFilterChips()     filters → removable chips shown above the results
 */
import { SERVICE_CATEGORIES, NATIONALITIES, ETHNICITIES, BREAST_SIZES, BREAST_TYPES } from '@/lib/filterOptions';

const ORIENTATIONS = ['Straight', 'Bi', 'Lesbian', 'Gay'];
const LANGUAGES = ['English', 'Dutch', 'French', 'German', 'Russian'];
const YES_NO = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];

export const EXTRA_FILTER_DEFAULTS = {
  service: '',
  min_rate: '', max_rate: '',
  min_age: '', max_age: '',
  nationality: '', ethnicity: '', orientation: '',
  languages: [],
  min_height: '', max_height: '',
  min_weight: '', max_weight: '',
  breast_type: '', breast_size: '',
  tattoos: '', piercings: '', smoker: ''
};

const SELECTS = { service: 'Service', nationality: 'Nationality', ethnicity: 'Ethnicity', orientation: 'Orientation' };
const RANGES = {
  rate: { label: '1 hour', pre: '€', unit: '' },
  age: { label: 'Age', pre: '', unit: ' yrs' },
  height: { label: 'Height', pre: '', unit: ' cm' },
  weight: { label: 'Weight', pre: '', unit: ' kg' }
};
const SEGMENTS = { breast_type: 'Breast type', breast_size: 'Breast size', tattoos: 'Tattoos', piercings: 'Piercings', smoker: 'Smoker' };

const filled = (v) => v !== undefined && v !== null && String(v).trim().length > 0;

export function extraFilterParams(filters) {
  const params = {};
  Object.keys(EXTRA_FILTER_DEFAULTS).forEach((k) => {
    const v = filters[k];
    if (k === 'languages') {
      if (Array.isArray(v) && v.length) params.languages = v.join(',');
    } else if (filled(v)) {
      params[k] = String(v).trim();
    }
  });
  return params;
}

export function extraFilterChips(filters) {
  const chips = [];
  Object.entries(SELECTS).forEach(([k, label]) => {
    if (filled(filters[k])) chips.push({ key: k, label: `${label}: ${filters[k]}`, clear: { [k]: '' } });
  });
  Object.entries(RANGES).forEach(([k, r]) => {
    const lo = filters[`min_${k}`];
    const hi = filters[`max_${k}`];
    if (!filled(lo) && !filled(hi)) return;
    const fmt = (x) => `${r.pre}${x}${r.unit}`;
    const txt = filled(lo) && filled(hi) ? `${r.pre}${lo}–${hi}${r.unit}` : filled(lo) ? `from ${fmt(lo)}` : `up to ${fmt(hi)}`;
    chips.push({ key: k, label: `${r.label}: ${txt}`, clear: { [`min_${k}`]: '', [`max_${k}`]: '' } });
  });
  if (Array.isArray(filters.languages) && filters.languages.length) {
    chips.push({ key: 'languages', label: `Speaks: ${filters.languages.join(', ')}`, clear: { languages: [] } });
  }
  Object.entries(SEGMENTS).forEach(([k, label]) => {
    const v = filters[k];
    if (!filled(v)) return;
    const shown = v === 'yes' ? 'Yes' : v === 'no' ? 'No' : v;
    chips.push({ key: k, label: `${label}: ${shown}`, clear: { [k]: '' } });
  });
  return chips;
}

const Chevron = () => (
  <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
);

const Section = ({ title, children }) => (
  <section className="ef-sec">
    <h3>{title}</h3>
    <div className="ef-grid">{children}</div>
  </section>
);

const Select = ({ id, label, value, onChange, children, wide }) => (
  <label className={`ef-field${wide ? ' wide' : ''}`}>
    <span className="ef-lbl">{label}</span>
    <span className="ef-box">
      <select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`ef-in sel${filled(value) ? ' on' : ''}`}
        data-testid={`extra-${id}`}
      >
        {children}
      </select>
      <Chevron />
    </span>
  </label>
);

const Range = ({ name, label, pre, unit, minPh, maxPh, filters, set }) => {
  const box = (side, ph) => {
    const key = `${side}_${name}`;
    const v = filters[key] || '';
    return (
      <span className="ef-box grow">
        {pre && <span className="pre">{pre}</span>}
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={v}
          onChange={(e) => set({ [key]: e.target.value })}
          placeholder={ph}
          aria-label={`${label} ${side === 'min' ? 'minimum' : 'maximum'}`}
          className={`ef-in no-spinner${filled(v) ? ' on' : ''}${pre ? ' haspre' : ''}${unit ? ' hasunit' : ''}`}
          data-testid={`extra-${key}`}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
    );
  };
  return (
    <div role="group" aria-label={label} className="ef-field">
      <span className="ef-lbl">{label}</span>
      <div className="ef-range">
        {box('min', minPh)}
        <span aria-hidden="true" className="dash">–</span>
        {box('max', maxPh)}
      </div>
    </div>
  );
};

const Segmented = ({ name, label, options, value, onChange, wide }) => {
  const opts = [{ value: '', label: 'Any' }, ...options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))];
  return (
    <div role="group" aria-label={label} className={`ef-field${wide ? ' wide' : ''}`}>
      <span className="ef-lbl">{label}</span>
      <div className="ef-seg" data-testid={`extra-${name}`}>
        {opts.map((o) => {
          const on = (value || '') === o.value;
          return (
            <button
              key={o.value || 'any'}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={on ? (o.value ? 'on val' : 'on any') : ''}
              data-testid={`extra-${name}-${(o.value || 'any').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function ExtraFilters({ filters, setFilters }) {
  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const langs = Array.isArray(filters.languages) ? filters.languages : [];
  const toggleLang = (l) => set({ languages: langs.includes(l) ? langs.filter((x) => x !== l) : [...langs, l] });

  return (
    <div className="ef">
      <Section title="Services & rates">
        <Select id="service" label="Service" value={filters.service} onChange={(v) => set({ service: v })} wide>
          <option value="">Any service</option>
          {SERVICE_CATEGORIES.map((c) => (
            <optgroup key={c.id} label={c.label}>
              {c.services.map((sv) => <option key={sv} value={sv}>{sv}</option>)}
            </optgroup>
          ))}
        </Select>
        <Range name="rate" label="Rate for 1 hour" pre="€" unit="" minPh="100" maxPh="500" filters={filters} set={set} />
      </Section>

      <Section title="About">
        <Range name="age" label="Age" pre="" unit="yrs" minPh="18" maxPh="60" filters={filters} set={set} />
        <Select id="nationality" label="Nationality" value={filters.nationality} onChange={(v) => set({ nationality: v })}>
          <option value="">Any</option>
          {NATIONALITIES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
        <Select id="ethnicity" label="Ethnicity" value={filters.ethnicity} onChange={(v) => set({ ethnicity: v })}>
          <option value="">Any</option>
          {ETHNICITIES.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
        <Select id="orientation" label="Orientation" value={filters.orientation} onChange={(v) => set({ orientation: v })}>
          <option value="">Any</option>
          {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
        <div role="group" aria-label="Speaks" className="ef-field wide">
          <span className="ef-lbl">Speaks</span>
          <div className="ef-pills" data-testid="extra-languages">
            {LANGUAGES.map((l) => {
              const on = langs.includes(l);
              return (
                <button key={l} type="button" aria-pressed={on} onClick={() => toggleLang(l)} className={on ? 'on' : ''} data-testid={`extra-lang-${l.toLowerCase()}`}>
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Appearance">
        <Range name="height" label="Height" pre="" unit="cm" minPh="150" maxPh="185" filters={filters} set={set} />
        <Range name="weight" label="Weight" pre="" unit="kg" minPh="45" maxPh="75" filters={filters} set={set} />
        <Segmented name="breast_type" label="Breast type" options={BREAST_TYPES} value={filters.breast_type} onChange={(v) => set({ breast_type: v })} />
        <Segmented name="breast_size" label="Breast size" options={BREAST_SIZES} value={filters.breast_size} onChange={(v) => set({ breast_size: v })} wide />
      </Section>

      <Section title="Other">
        <Segmented name="tattoos" label="Tattoos" options={YES_NO} value={filters.tattoos} onChange={(v) => set({ tattoos: v })} />
        <Segmented name="piercings" label="Piercings" options={YES_NO} value={filters.piercings} onChange={(v) => set({ piercings: v })} />
        <Segmented name="smoker" label="Smoker" options={YES_NO} value={filters.smoker} onChange={(v) => set({ smoker: v })} />
      </Section>
    </div>
  );
}
