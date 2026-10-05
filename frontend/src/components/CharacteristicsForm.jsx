/**
 * Physical characteristics form (Basic Info step). All fields optional.
 */
import { CaretDown } from 'phosphor-react';

const ETHNICITIES = ['European', 'Asian', 'Latin', 'African', 'Middle Eastern', 'Mixed', 'Other'];
const BREAST_SIZES = ['A', 'B', 'C', 'D', 'DD+'];
const BREAST_TYPES = ['Natural', 'Enhanced'];

const NATIONALITIES = [
  'Albanian', 'Algerian', 'American', 'Argentinian', 'Australian', 'Austrian',
  'Belarusian', 'Belgian', 'Brazilian', 'British', 'Bulgarian',
  'Canadian', 'Chilean', 'Chinese', 'Colombian', 'Croatian', 'Cuban', 'Czech',
  'Danish', 'Dominican', 'Dutch',
  'Egyptian', 'Estonian', 'Ethiopian',
  'Filipino', 'Finnish', 'French',
  'German', 'Ghanaian', 'Greek',
  'Hungarian',
  'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Irish', 'Israeli', 'Italian',
  'Japanese',
  'Kazakh', 'Kenyan', 'Korean',
  'Latvian', 'Lebanese', 'Lithuanian', 'Luxembourgish',
  'Malaysian', 'Mexican', 'Moroccan',
  'New Zealander', 'Nigerian', 'Norwegian',
  'Pakistani', 'Peruvian', 'Polish', 'Portuguese',
  'Romanian', 'Russian',
  'Serbian', 'Slovak', 'Slovenian', 'South African', 'Spanish', 'Swedish', 'Swiss', 'Syrian',
  'Thai', 'Tunisian', 'Turkish',
  'Ukrainian', 'Uzbek',
  'Venezuelan', 'Vietnamese',
  'Other'
];

const inputCls =
  'w-full bg-white border border-[#898989] rounded-lg px-4 py-3 text-[15px] text-[#1B1820] placeholder:text-[#BDB4C5] focus:border-[#7A2357] focus:ring-0 focus:outline-none focus:shadow-[0_0_0_3px_rgba(122,35,87,0.14)] transition-all';

const Label = ({ children }) => (
  <label className="block text-[13px] font-semibold text-[#1B1820] mb-1">{children}</label>
);

// Pills: unselected = white bordered, selected = wine light
const PillGroup = ({ options, value, onChange, testId }) => (
  <div className="flex flex-wrap gap-2" data-testid={testId}>
    {options.map((o) => {
      const active = value === o;
      return (
        <button
          key={o}
          type="button"
          onClick={() => onChange(active ? '' : o)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            active ? 'bg-[#7A2357]/5 border-[#7A2357] text-[#7A2357]' : 'bg-white border-[#898989] text-[#5F5966] hover:border-[#7A2357]'
          }`}
          data-testid={`${testId}-${o.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        >
          {o}
        </button>
      );
    })}
  </div>
);

// Segmented control on a light track
const Segmented = ({ options, value, onChange, testId, variant = 'light' }) => (
  <div className="inline-flex bg-[#EBE0EA] rounded-lg p-1 gap-1" data-testid={testId}>
    {options.map((o) => {
      const active = value === o;
      const activeCls = variant === 'wine' ? 'bg-[#7A2357] text-white' : 'bg-white text-[#1B1820] shadow-sm';
      return (
        <button
          key={o}
          type="button"
          onClick={() => onChange(active ? '' : o)}
          className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active ? activeCls : 'text-[#5F5966] hover:text-[#1B1820]'
          }`}
          data-testid={`${testId}-${o.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
        >
          {o}
        </button>
      );
    })}
  </div>
);

const YesNo = ({ label, value, onChange, testIdBase }) => (
  <div>
    <Label>{label}</Label>
    <Segmented options={['Yes', 'No']} value={value === 'yes' ? 'Yes' : value === 'no' ? 'No' : ''} onChange={(v) => onChange(v === 'Yes' ? 'yes' : v === 'No' ? 'no' : '')} testId={testIdBase} variant="wine" />
  </div>
);

export default function CharacteristicsForm({ characteristics, onChange }) {
  const c = characteristics || {};
  const update = (key, value) => onChange({ ...c, [key]: value });

  return (
    <div className="space-y-4">
      {/* Nationality */}
      <div className="w-full sm:max-w-[380px]">
        <Label>Nationality</Label>
        <div className="relative">
          <select
            value={c.nationality || ''}
            onChange={(e) => update('nationality', e.target.value)}
            className={`${inputCls} appearance-none pr-10 cursor-pointer`}
            data-testid="char-nationality"
          >
            <option value="">Select nationality</option>
            {NATIONALITIES.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <CaretDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5F5966] pointer-events-none" />
        </div>
      </div>

      {/* Height / Weight */}
      <div className="space-y-4">
        <div className="w-full sm:max-w-[380px]">
          <Label>Height</Label>
          <div className="relative">
            <input type="number" value={c.height || ''} onChange={(e) => update('height', e.target.value)} className={`${inputCls} pr-12 no-spinner`} placeholder="170" min="100" max="230" data-testid="char-height" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#BDB4C5]">cm</span>
          </div>
        </div>
        <div className="w-full sm:max-w-[380px]">
          <Label>Weight</Label>
          <div className="relative">
            <input type="number" value={c.weight || ''} onChange={(e) => update('weight', e.target.value)} className={`${inputCls} pr-12 no-spinner`} placeholder="58" min="35" max="200" data-testid="char-weight" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#BDB4C5]">kg</span>
          </div>
        </div>
      </div>

      {/* Ethnicity */}
      <div>
        <Label>Ethnicity</Label>
        <PillGroup options={ETHNICITIES} value={c.ethnicity} onChange={(v) => update('ethnicity', v)} testId="char-ethnicity" />
      </div>

      {/* Breast size */}
      <div>
        <Label>Breast size</Label>
        <Segmented options={BREAST_SIZES} value={c.breast_size} onChange={(v) => update('breast_size', v)} testId="char-breast_size" variant="wine" />
      </div>

      {/* Breast type */}
      <div>
        <Label>Breast type</Label>
        <Segmented options={BREAST_TYPES} value={c.breast_type} onChange={(v) => update('breast_type', v)} testId="char-breast_type" variant="wine" />
      </div>

      {/* Tattoos / Piercings / Smoker */}
      <YesNo label="Tattoos" value={c.tattoos} onChange={(v) => update('tattoos', v)} testIdBase="char-tattoos" />
      <YesNo label="Piercings" value={c.piercings} onChange={(v) => update('piercings', v)} testIdBase="char-piercings" />
      <YesNo label="Smoker" value={c.smoker} onChange={(v) => update('smoker', v)} testIdBase="char-smoker" />
    </div>
  );
}
