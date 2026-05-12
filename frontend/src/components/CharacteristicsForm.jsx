/**
 * Form for provider physical characteristics, shown in the Basic Info step.
 * All fields are optional; changes call onChange with the updated object.
 *
 * Layout (max 2 fields per row to keep things readable):
 *   1. Nationality
 *   2. Ethnicity
 *   3. Orientation
 *   4. Height / Weight        (paired)
 *   5. Breast size / Breast type (paired)
 *   6. Languages (chip group, full row)
 *   7. Tattoos
 *   8. Piercings
 *   9. Smoker
 */

const ETHNICITIES = ['European', 'Asian', 'Latin', 'African', 'Middle Eastern', 'Mixed', 'Other'];
const ORIENTATIONS = ['Straight', 'Bi', 'Lesbian', 'Gay', 'Pansexual'];
const BREAST_SIZES = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G+'];
const BREAST_TYPES = ['Natural', 'Implants'];
const LANGUAGES = ['English', 'French', 'German', 'Russian'];
const MAX_LANGUAGES = 4;

const NATIONALITIES = [
  // Europe
  'Belgian', 'Dutch', 'Luxembourgish', 'French', 'German', 'British', 'Irish',
  'Spanish', 'Portuguese', 'Italian', 'Swiss', 'Austrian',
  'Danish', 'Swedish', 'Norwegian', 'Finnish', 'Icelandic',
  'Polish', 'Czech', 'Slovak', 'Hungarian', 'Romanian', 'Bulgarian',
  'Greek', 'Croatian', 'Serbian', 'Slovenian', 'Albanian',
  'Russian', 'Ukrainian', 'Belarusian', 'Lithuanian', 'Latvian', 'Estonian',
  // Americas
  'American', 'Canadian', 'Mexican', 'Brazilian', 'Argentinian', 'Colombian',
  'Venezuelan', 'Chilean', 'Peruvian', 'Cuban', 'Dominican',
  // Asia
  'Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Filipino',
  'Indonesian', 'Malaysian', 'Indian', 'Pakistani', 'Kazakh', 'Uzbek',
  // Middle East
  'Turkish', 'Israeli', 'Lebanese', 'Iranian', 'Syrian',
  // Africa
  'Egyptian', 'Moroccan', 'Tunisian', 'Algerian', 'South African', 'Nigerian',
  'Ethiopian', 'Kenyan', 'Ghanaian',
  // Oceania
  'Australian', 'New Zealander',
  // Catch-all
  'Other'
];

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' }
];

const SelectField = ({ label, value, options, onChange, testId }) => (
  <div>
    <label className="input-label">{label}</label>
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="input-premium w-full"
      data-testid={testId}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  </div>
);

const YesNoField = ({ label, value, onChange, testIdBase }) => (
  <div>
    <label className="input-label">{label}</label>
    <div className="grid grid-cols-2 gap-2 max-w-xs">
      {YES_NO.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? '' : opt.value)}
          className={`py-2 border text-sm uppercase tracking-wider transition-all ${
            value === opt.value
              ? 'border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C]'
              : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C]'
          }`}
          data-testid={`${testIdBase}-${opt.value}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

export default function CharacteristicsForm({ characteristics, onChange }) {
  const update = (key, value) => onChange({ ...characteristics, [key]: value });

  const toggleLanguage = (lang) => {
    const current = characteristics.languages || [];
    if (current.includes(lang)) {
      update('languages', current.filter((l) => l !== lang));
    } else if (current.length < MAX_LANGUAGES) {
      update('languages', [...current, lang]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Nationality */}
      <SelectField
        label="Nationality"
        value={characteristics.nationality}
        options={NATIONALITIES}
        onChange={(v) => update('nationality', v)}
        testId="char-nationality"
      />

      {/* Ethnicity */}
      <SelectField
        label="Ethnicity"
        value={characteristics.ethnicity}
        options={ETHNICITIES}
        onChange={(v) => update('ethnicity', v)}
        testId="char-ethnicity"
      />

      {/* Orientation */}
      <SelectField
        label="Orientation"
        value={characteristics.orientation}
        options={ORIENTATIONS}
        onChange={(v) => update('orientation', v)}
        testId="char-orientation"
      />

      {/* Height + Weight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="input-label">Height (cm)</label>
          <input
            type="number"
            value={characteristics.height || ''}
            onChange={(e) => update('height', e.target.value)}
            className="input-premium w-full"
            placeholder="e.g. 170"
            min="100"
            max="230"
            data-testid="char-height"
          />
        </div>
        <div>
          <label className="input-label">Weight (kg)</label>
          <input
            type="number"
            value={characteristics.weight || ''}
            onChange={(e) => update('weight', e.target.value)}
            className="input-premium w-full"
            placeholder="e.g. 58"
            min="35"
            max="200"
            data-testid="char-weight"
          />
        </div>
      </div>

      {/* Breast size + Breast type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SelectField
          label="Breast size"
          value={characteristics.breast_size}
          options={BREAST_SIZES}
          onChange={(v) => update('breast_size', v)}
          testId="char-breast_size"
        />
        <SelectField
          label="Breast type"
          value={characteristics.breast_type}
          options={BREAST_TYPES}
          onChange={(v) => update('breast_type', v)}
          testId="char-breast_type"
        />
      </div>

      {/* Languages */}
      <div>
        <div className="flex items-end justify-between mb-2">
          <label className="input-label !mb-0">Languages</label>
          <span className="text-xs text-[#71717A]">
            {(characteristics.languages || []).length}/{MAX_LANGUAGES} selected
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {LANGUAGES.map((lang) => {
            const selected = (characteristics.languages || []).includes(lang);
            const disabled =
              !selected && (characteristics.languages || []).length >= MAX_LANGUAGES;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                disabled={disabled}
                className={`py-2.5 px-3 border text-sm uppercase tracking-wider transition-all ${
                  selected
                    ? 'border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C]'
                    : disabled
                      ? 'border-[#27272A] text-[#52525B] cursor-not-allowed'
                      : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C]'
                }`}
                data-testid={`char-lang-${lang.toLowerCase()}`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tattoos */}
      <YesNoField
        label="Tattoos"
        value={characteristics.tattoos}
        onChange={(v) => update('tattoos', v)}
        testIdBase="char-tattoos"
      />

      {/* Piercings */}
      <YesNoField
        label="Piercings"
        value={characteristics.piercings}
        onChange={(v) => update('piercings', v)}
        testIdBase="char-piercings"
      />

      {/* Smoker */}
      <YesNoField
        label="Smoker"
        value={characteristics.smoker}
        onChange={(v) => update('smoker', v)}
        testIdBase="char-smoker"
      />
    </div>
  );
}
