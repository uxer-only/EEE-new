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

      {/* Height */}
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

      {/* Weight */}
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

      {/* Breast size */}
      <div>
        <label className="input-label">Breast size</label>
        <input
          type="text"
          value={characteristics.breast_size || ''}
          onChange={(e) => update('breast_size', e.target.value)}
          className="input-premium w-full"
          placeholder="e.g. C"
          data-testid="char-breast_size"
        />
      </div>

      {/* Breast type — Implants checkbox */}
      <div>
        <label className="input-label">Breast type</label>
        <label className="flex items-center gap-3 cursor-pointer py-3 select-none">
          <input
            type="checkbox"
            checked={characteristics.breast_type === 'Implants'}
            onChange={(e) =>
              update('breast_type', e.target.checked ? 'Implants' : '')
            }
            className="w-5 h-5 rounded border-[#52525B] bg-transparent checked:bg-[#C6A87C] checked:border-[#C6A87C]"
            data-testid="char-breast_type-implants"
          />
          <span className="text-[#A1A1AA]">Implants</span>
        </label>
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
