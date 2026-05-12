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

const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' }
];

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

  const SelectField = ({ label, value, options, k }) => (
    <div>
      <label className="input-label">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => update(k, e.target.value)}
        className="input-premium w-full"
        data-testid={`char-${k}`}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );

  const YesNoField = ({ label, value, k }) => (
    <div>
      <label className="input-label">{label}</label>
      <div className="grid grid-cols-2 gap-2 max-w-xs">
        {YES_NO.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => update(k, value === opt.value ? '' : opt.value)}
            className={`py-2 border text-sm uppercase tracking-wider transition-all ${
              value === opt.value
                ? 'border-[#C6A87C] bg-[#C6A87C]/10 text-[#C6A87C]'
                : 'border-[#3F3F46] text-[#A1A1AA] hover:border-[#C6A87C]'
            }`}
            data-testid={`char-${k}-${opt.value}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Nationality */}
      <div>
        <label className="input-label">Nationality</label>
        <input
          type="text"
          value={characteristics.nationality || ''}
          onChange={(e) => update('nationality', e.target.value)}
          className="input-premium w-full"
          placeholder="e.g. French"
          data-testid="char-nationality"
        />
      </div>

      {/* Ethnicity */}
      <SelectField label="Ethnicity" value={characteristics.ethnicity} options={ETHNICITIES} k="ethnicity" />

      {/* Orientation */}
      <SelectField label="Orientation" value={characteristics.orientation} options={ORIENTATIONS} k="orientation" />

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
        <SelectField label="Breast size" value={characteristics.breast_size} options={BREAST_SIZES} k="breast_size" />
        <SelectField label="Breast type" value={characteristics.breast_type} options={BREAST_TYPES} k="breast_type" />
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
      <YesNoField label="Tattoos" value={characteristics.tattoos} k="tattoos" />

      {/* Piercings */}
      <YesNoField label="Piercings" value={characteristics.piercings} k="piercings" />

      {/* Smoker */}
      <YesNoField label="Smoker" value={characteristics.smoker} k="smoker" />
    </div>
  );
}
