/**
 * Extra filters panel shown on /browse.
 * Slim, focused set: service type, nationality, ethnicity, orientation,
 * breast size and breast type.
 */

const ETHNICITIES = ['European', 'Asian', 'Latin', 'African', 'Middle Eastern', 'Mixed', 'Other'];
const ORIENTATIONS = ['Straight', 'Bi', 'Lesbian', 'Gay', 'Pansexual'];
const BREAST_SIZES = ['A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G+'];
const BREAST_TYPES = ['Natural', 'Implants'];
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

export default function ExtraFilters({ filters, setFilters }) {
  const set = (key, value) => setFilters({ ...filters, [key]: value });

  return (
    <div className="space-y-8">
      <div className="space-y-6 max-w-md">
        {/* Service type */}
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
        <Select label="Nationality" value={filters.nationality} options={NATIONALITIES} onChange={(v) => set('nationality', v)} testId="extra-nationality" />
        <Select label="Ethnicity" value={filters.ethnicity} options={ETHNICITIES} onChange={(v) => set('ethnicity', v)} testId="extra-ethnicity" />
        <Select label="Orientation" value={filters.orientation} options={ORIENTATIONS} onChange={(v) => set('orientation', v)} testId="extra-orientation" />
        <Select label="Breast size" value={filters.breast_size} options={BREAST_SIZES} onChange={(v) => set('breast_size', v)} testId="extra-breast_size" />
        <Select label="Breast type" value={filters.breast_type} options={BREAST_TYPES} onChange={(v) => set('breast_type', v)} testId="extra-breast_type" />
      </div>
    </div>
  );
}
