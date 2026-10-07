/**
 * "More filters" panel content on /browse.
 * Every filter maps to a field advertisers fill in on their profile, using the
 * same option lists, so a filter can always match a real profile.
 *
 * Exports helpers used by Browse.js:
 *  - EXTRA_FILTER_DEFAULTS  blank values for every extra filter
 *  - extraFilterParams()    filters → query params for GET /providers
 *  - extraFilterChips()     filters → removable chips shown above the results
 */
import { CaretDown } from 'phosphor-react';
import { SERVICE_CATEGORIES } from '@/constants/companionData';
import { NATIONALITIES, ETHNICITIES, BREAST_SIZES, BREAST_TYPES } from '@/components/CharacteristicsForm';

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

const fieldCls = (active) =>
  `w-full h-[52px] rounded-lg text-[16px] font-medium text-[#1B1820] border focus:outline-none focus:border-[#7A2357] focus:shadow-[0_0_0_3px_rgba(122,35,87,0.14)] transition-colors ${
    active ? 'bg-[#FBF6F9] border-[#7A2357]' : 'bg-white border-[#BDB4C5] hover:border-[#8E8597]'
  }`;

const FieldLabel = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-[15px] font-bold text-[#1B1820] mb-2">{children}</label>
);

const Section = ({ title, children, first }) => (
  <section className={first ? 'pt-2 pb-6' : 'py-6 border-t border-[#ECE8EF]'}>
    <h4 className="mb-4 text-[13px] font-extrabold tracking-[0.08em] uppercase text-[#5F5966]">{title}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5">{children}</div>
  </section>
);

const Select = ({ id, label, value, onChange, children, className = '' }) => (
  <div className={className}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <div className="relative">
      <select
        id={id}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldCls(filled(value))} appearance-none pl-3.5 pr-10 cursor-pointer`}
        data-testid={`extra-${id}`}
      >
        {children}
      </select>
      <CaretDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5F5966] pointer-events-none" />
    </div>
  </div>
);

const Range = ({ name, label, pre, unit, minPh, maxPh, filters, set }) => {
  const box = (side, ph) => {
    const key = `${side}_${name}`;
    const v = filters[key] || '';
    return (
      <div className="relative flex-1 min-w-0">
        {pre && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] font-medium text-[#5F5966] pointer-events-none">{pre}</span>}
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={v}
          onChange={(e) => set({ [key]: e.target.value })}
          placeholder={ph}
          aria-label={`${label} ${side === 'min' ? 'minimum' : 'maximum'}`}
          className={`${fieldCls(filled(v))} no-spinner ${pre ? 'pl-8' : 'pl-3.5'} ${unit ? 'pr-11' : 'pr-3.5'} placeholder:text-[#9C95A3]`}
          data-testid={`extra-${key}`}
        />
        {unit && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-[#6E6875] pointer-events-none">{unit}</span>}
      </div>
    );
  };
  return (
    <div role="group" aria-label={label}>
      <span className="block text-[15px] font-bold text-[#1B1820] mb-2">{label}</span>
      <div className="flex items-center gap-2">
        {box('min', minPh)}
        <span aria-hidden="true" className="text-[#5F5966]">–</span>
        {box('max', maxPh)}
      </div>
    </div>
  );
};

const Segmented = ({ name, label, options, value, onChange, className = '' }) => {
  const opts = [{ value: '', label: 'Any' }, ...options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))];
  return (
    <div role="group" aria-label={label} className={className}>
      <span className="block text-[15px] font-bold text-[#1B1820] mb-2">{label}</span>
      <div className="flex gap-1 p-1 bg-[#F2EEF4] rounded-lg" data-testid={`extra-${name}`}>
        {opts.map((o) => {
          const on = (value || '') === o.value;
          return (
            <button
              key={o.value || 'any'}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`flex-1 min-w-0 h-11 px-2 rounded-md text-[15px] font-semibold transition-colors ${
                on
                  ? o.value ? 'bg-[#7A2357] text-white' : 'bg-white text-[#1B1820] shadow-[0_1px_3px_rgba(52,24,60,0.12)]'
                  : 'text-[#5F5966] hover:text-[#1B1820]'
              }`}
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
    <div>
      <Section title="Services & rates" first>
        <Select id="service" label="Service" value={filters.service} onChange={(v) => set({ service: v })} className="sm:col-span-2 lg:col-span-2">
          <option value="">Any service</option>
          {SERVICE_CATEGORIES.map((c) => (
            <optgroup key={c.id} label={c.label}>
              {c.services.map((s) => <option key={s} value={s}>{s}</option>)}
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
        <div role="group" aria-label="Speaks" className="sm:col-span-2 lg:col-span-2">
          <span className="block text-[15px] font-bold text-[#1B1820] mb-2">Speaks</span>
          <div className="flex flex-wrap gap-2" data-testid="extra-languages">
            {LANGUAGES.map((l) => {
              const on = langs.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleLang(l)}
                  className={`h-11 px-4 rounded-full border text-[15px] font-semibold transition-colors ${
                    on ? 'bg-[#FBF6F9] border-[#7A2357] text-[#7A2357]' : 'bg-white border-[#BDB4C5] text-[#5F5966] hover:border-[#7A2357]'
                  }`}
                  data-testid={`extra-lang-${l.toLowerCase()}`}
                >
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
        <Segmented name="breast_size" label="Breast size" options={BREAST_SIZES} value={filters.breast_size} onChange={(v) => set({ breast_size: v })} className="sm:col-span-2 lg:col-span-2" />
      </Section>

      <Section title="Other">
        <Segmented name="tattoos" label="Tattoos" options={YES_NO} value={filters.tattoos} onChange={(v) => set({ tattoos: v })} />
        <Segmented name="piercings" label="Piercings" options={YES_NO} value={filters.piercings} onChange={(v) => set({ piercings: v })} />
        <Segmented name="smoker" label="Smoker" options={YES_NO} value={filters.smoker} onChange={(v) => set({ smoker: v })} />
      </Section>
    </div>
  );
}
