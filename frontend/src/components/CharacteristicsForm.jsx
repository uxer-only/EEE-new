/**
 * Form for provider physical characteristics, shown in the Basic Info step.
 * All fields are optional; changes call onChange with the updated object.
 */

const ETHNICITIES = ['European', 'Asian', 'Latin', 'African', 'Middle Eastern', 'Mixed', 'Other'];
const ORIENTATIONS = ['Straight', 'Bi', 'Lesbian', 'Gay', 'Pansexual'];
const EYE_COLORS = ['Blue', 'Green', 'Brown', 'Hazel', 'Grey', 'Other'];
const HAIR_COLORS = ['Blonde', 'Brunette', 'Black', 'Red', 'Grey', 'Other'];
const HAIR_LENGTHS = ['Short', 'Medium', 'Long'];
const BREAST_SIZES = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G+'];
const BREAST_TYPES = ['Natural', 'Implants'];
const PUBIC_HAIR = ['Natural', 'Trimmed', 'Shaved', 'Partial'];
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
      <div className="grid grid-cols-2 gap-2">
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
      {/* Row 1: Nationality (free text) + Ethnicity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <SelectField label="Ethnicity" value={characteristics.ethnicity} options={ETHNICITIES} k="ethnicity" />
      </div>

      {/* Row 2: Orientation + Height + Weight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SelectField label="Orientation" value={characteristics.orientation} options={ORIENTATIONS} k="orientation" />
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

      {/* Row 3: Eye color + Hair color + Hair length */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SelectField label="Eye color" value={characteristics.eye_color} options={EYE_COLORS} k="eye_color" />
        <SelectField label="Hair color" value={characteristics.hair_color} options={HAIR_COLORS} k="hair_color" />
        <SelectField label="Hair length" value={characteristics.hair_length} options={HAIR_LENGTHS} k="hair_length" />
      </div>

      {/* Row 4: Breast size + Breast type + Pubic hair */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SelectField label="Breast size" value={characteristics.breast_size} options={BREAST_SIZES} k="breast_size" />
        <SelectField label="Breast type" value={characteristics.breast_type} options={BREAST_TYPES} k="breast_type" />
        <SelectField label="Pubic hair" value={characteristics.pubic_hair} options={PUBIC_HAIR} k="pubic_hair" />
      </div>

      {/* Row 5: Languages */}
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

      {/* Row 6: Yes/No toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <YesNoField label="Tattoos" value={characteristics.tattoos} k="tattoos" />
        <YesNoField label="Piercings" value={characteristics.piercings} k="piercings" />
        <YesNoField label="Smoker" value={characteristics.smoker} k="smoker" />
      </div>
    </div>
  );
}
