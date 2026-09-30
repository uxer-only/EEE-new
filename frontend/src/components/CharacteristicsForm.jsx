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
              ? 'border-[#832161] text-[#832161]'
              : 'border-[#898989] text-[#898989] hover:border-[#832161]'
          }`}
          data-testid={`${testIdBase}-${opt.value}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const ButtonSelectField = ({ label, value, options, onChange, testId }) => (
  <div>
    <label className="input-label">{label}</label>
    <div className="flex flex-wrap gap-2" data-testid={testId}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? '' : o)}
          className={`py-2 px-3 border text-sm uppercase tracking-wider transition-all ${
            value === o
              ? 'border-[#832161] text-[#832161]'
              : 'border-[#898989] text-[#898989] hover:border-[#832161]'
          }`}
          data-testid={`${testId}-${o.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {o}
        </button>
      ))}
    </div>
  </div>
);

export default function CharacteristicsForm({ characteristics, onChange }) {
  const update = (key, value) => onChange({ ...characteristics, [key]: value });

  return (
    <div className="flex flex-col gap-4">
      {/* Nationality */}
      <SelectField
        label="Nationality"
        value={characteristics.nationality}
        options={NATIONALITIES}
        onChange={(v) => update('nationality', v)}
        testId="char-nationality"
      />

      {/* Ethnicity */}
      <ButtonSelectField
        label="Ethnicity"
        value={characteristics.ethnicity}
        options={ETHNICITIES}
        onChange={(v) => update('ethnicity', v)}
        testId="char-ethnicity"
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
            className="w-5 h-5 rounded border-[#52525B] bg-transparent checked:bg-[#832161] checked:border-[#832161]"
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
