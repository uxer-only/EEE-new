/**
 * Extra filters panel shown on /browse — categorical, multi-select, range,
 * and yes/no filters mapped 1:1 to the provider physical characteristics
 * captured in CharacteristicsForm.
 *
 * Design: compact section dividers, identical select / pill styling to the
 * provider dashboard for visual consistency.
 */

const ETHNICITIES = ['European', 'Asian', 'Latin', 'African', 'Middle Eastern', 'Mixed', 'Other'];
const ORIENTATIONS = ['Straight', 'Bi', 'Lesbian', 'Gay', 'Pansexual'];
const BREAST_SIZES = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G+'];
const BREAST_TYPES = ['Natural', 'Implants'];
const PUBIC_HAIR = ['Natural', 'Trimmed', 'Shaved', 'Partial'];
const LANGUAGES = ['English', 'French', 'German', 'Russian'];
const NATIONALITIES = [
  'Belgian', 'Dutch', 'Luxembourgish', 'French', 'German', 'British', 'Irish',
  'Spanish', 'Portuguese', 'Italian', 'Swiss', 'Austrian',
  'Danish', 'Swedish', 'Norwegian', 'Finnish', 'Icelandic',
  'Polish', 'Czech', 'Slovak', 'Hungarian', 'Romanian', 'Bulgarian',
  'Greek', 'Croatian', 'Serbian', 'Slovenian', 'Albanian',
  'Russian', 'Ukrainian', 'Belarusian', 'Lithuanian', 'Latvian', 'Estonian',
  'American', 'Canadian', 'Mexican', 'Brazilian', 'Argentinian', 'Colombian',
  'Venezuelan', 'Chilean', 'Peruvian', 'Cuban', 'Dominican',
  'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Filipino',
  'Indonesian', 'Malaysian', 'Indian', 'Pakistani', 'Kazakh', 'Uzbek',
  'Turkish', 'Israeli', 'Lebanese', 'Iranian', 'Syrian',
  'Egyptian', 'Moroccan', 'Tunisian', 'Algerian', 'South African', 'Nigerian',
  'Ethiopian', 'Kenyan', 'Ghanaian',
  'Australian', 'New Zealander',
  'Other'
];
const YES_NO = ['yes', 'no'];

const Section = ({ title, children }) => (
  <div>
    <p className="text-[#C6A87C] text-xs uppercase tracking-[0.2em] mb-4">{title}</p>
    {children}
  </div>
);

const Select = ({ label, value, options, onChange, testId }) => (
  <div>
    <label className="input-label">{label}</label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="input-premium w-full"
      data-testid={testId}
    >
      <option value="">Any</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  </div>
);

const PillToggle = ({ label, value, onClick, active, testId, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`py-2 px-3 border text-xs uppercase tracking-wider transition-all ${
      active
        ? 'border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C]'
        : disabled
          ? 'border-[#27272A] text-[#52525B] cursor-not-allowed'
          : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C]'
    }`}
    data-testid={testId}
  >
    {label}
  </button>
);

const YesNo = ({ label, value, onChange, k }) => (
  <div>
    <label className="input-label">{label}</label>
    <div className="grid grid-cols-2 gap-2">
      {YES_NO.map((v) => (
        <PillToggle
          key={v}
          label={v}
          active={value === v}
          onClick={() => onChange(value === v ? '' : v)}
          testId={`extra-${k}-${v}`}
        />
      ))}
    </div>
  </div>
);

export default function ExtraFilters({ filters, setFilters, onClear }) {
  const set = (key, value) => setFilters({ ...filters, [key]: value });

  const toggleLang = (lang) => {
    const current = filters.languages || [];
    if (current.includes(lang)) {
      set('languages', current.filter((l) => l !== lang));
    } else {
      set('languages', [...current, lang]);
    }
  };

  return (
    <div className="space-y-8">
      {/* Pricing */}
      <Section title="Pricing & service">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="input-label">Service type</label>
            <input
              type="text"
              value={filters.service || ''}
              onChange={(e) => set('service', e.target.value)}
              className="input-premium w-full"
              placeholder="e.g., Dinner Date"
              data-testid="service-filter-input"
            />
          </div>
          <div>
            <label className="input-label">Min rate (€/hr)</label>
            <input
              type="number"
              value={filters.min_rate || ''}
              onChange={(e) => set('min_rate', e.target.value)}
              className="input-premium w-full"
              placeholder="0"
              data-testid="min-rate-input"
            />
          </div>
          <div>
            <label className="input-label">Max rate (€/hr)</label>
            <input
              type="number"
              value={filters.max_rate || ''}
              onChange={(e) => set('max_rate', e.target.value)}
              className="input-premium w-full"
              placeholder="10000"
              data-testid="max-rate-input"
            />
          </div>
        </div>
      </Section>

      <div className="border-t border-[#27272A]" />

      {/* Background */}
      <Section title="Background">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Select label="Nationality" value={filters.nationality} options={NATIONALITIES} onChange={(v) => set('nationality', v)} testId="extra-nationality" />
          <Select label="Ethnicity" value={filters.ethnicity} options={ETHNICITIES} onChange={(v) => set('ethnicity', v)} testId="extra-ethnicity" />
          <Select label="Orientation" value={filters.orientation} options={ORIENTATIONS} onChange={(v) => set('orientation', v)} testId="extra-orientation" />
        </div>
        <div className="mt-6">
          <p className="input-label">Languages spoken</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {LANGUAGES.map((lang) => (
              <PillToggle
                key={lang}
                label={lang}
                active={(filters.languages || []).includes(lang)}
                onClick={() => toggleLang(lang)}
                testId={`extra-lang-${lang.toLowerCase()}`}
              />
            ))}
          </div>
        </div>
      </Section>

      <div className="border-t border-[#27272A]" />

      {/* Physical */}
      <Section title="Physical">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Select label="Breast size" value={filters.breast_size} options={BREAST_SIZES} onChange={(v) => set('breast_size', v)} testId="extra-breast_size" />
          <Select label="Breast type" value={filters.breast_type} options={BREAST_TYPES} onChange={(v) => set('breast_type', v)} testId="extra-breast_type" />
          <Select label="Pubic hair" value={filters.pubic_hair} options={PUBIC_HAIR} onChange={(v) => set('pubic_hair', v)} testId="extra-pubic_hair" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
          <div>
            <label className="input-label">Min height (cm)</label>
            <input
              type="number"
              value={filters.min_height || ''}
              onChange={(e) => set('min_height', e.target.value)}
              className="input-premium w-full"
              placeholder="150"
              data-testid="extra-min-height"
            />
          </div>
          <div>
            <label className="input-label">Max height (cm)</label>
            <input
              type="number"
              value={filters.max_height || ''}
              onChange={(e) => set('max_height', e.target.value)}
              className="input-premium w-full"
              placeholder="190"
              data-testid="extra-max-height"
            />
          </div>
          <div>
            <label className="input-label">Min weight (kg)</label>
            <input
              type="number"
              value={filters.min_weight || ''}
              onChange={(e) => set('min_weight', e.target.value)}
              className="input-premium w-full"
              placeholder="45"
              data-testid="extra-min-weight"
            />
          </div>
          <div>
            <label className="input-label">Max weight (kg)</label>
            <input
              type="number"
              value={filters.max_weight || ''}
              onChange={(e) => set('max_weight', e.target.value)}
              className="input-premium w-full"
              placeholder="80"
              data-testid="extra-max-weight"
            />
          </div>
        </div>
      </Section>

      <div className="border-t border-[#27272A]" />

      {/* Lifestyle */}
      <Section title="Lifestyle">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <YesNo label="Smoker" value={filters.smoker} onChange={(v) => set('smoker', v)} k="smoker" />
        </div>
      </Section>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onClear}
          className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] hover:text-[#C6A87C] transition-colors"
          data-testid="extra-filters-clear"
        >
          Clear all filters
        </button>
      </div>
    </div>
  );
}
