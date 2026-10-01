/**
 * Extra filters grid shown inside the "More filters" panel on /browse.
 * Slim, focused set: nationality, ethnicity, orientation, breast size, breast type.
 */
import { CaretDown } from 'phosphor-react';

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
    <label className="block text-sm text-[#52525B] mb-2">{label}</label>
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ borderRadius: '10px' }}
        className="w-full appearance-none bg-white border border-[#dbdadd] text-[15px] text-[#141416] pl-4 pr-10 py-3 focus:border-[#832161] focus:ring-0 focus:outline-none transition-colors cursor-pointer"
        data-testid={testId}
      >
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <CaretDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#52525B] pointer-events-none"
      />
    </div>
  </div>
);

export default function ExtraFilters({ filters, setFilters }) {
  const set = (key, value) => setFilters({ ...filters, [key]: value });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
      <Select label="Nationality" value={filters.nationality} options={NATIONALITIES} onChange={(v) => set('nationality', v)} testId="extra-nationality" />
      <Select label="Ethnicity" value={filters.ethnicity} options={ETHNICITIES} onChange={(v) => set('ethnicity', v)} testId="extra-ethnicity" />
      <Select label="Orientation" value={filters.orientation} options={ORIENTATIONS} onChange={(v) => set('orientation', v)} testId="extra-orientation" />
      <Select label="Breast size" value={filters.breast_size} options={BREAST_SIZES} onChange={(v) => set('breast_size', v)} testId="extra-breast_size" />
      <Select label="Breast type" value={filters.breast_type} options={BREAST_TYPES} onChange={(v) => set('breast_type', v)} testId="extra-breast_type" />
    </div>
  );
}
