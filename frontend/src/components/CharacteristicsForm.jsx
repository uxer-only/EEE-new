/**
 * Physical characteristics form (Basic Info step). All fields optional.
 */
import { SelectField, TextField, Seg, Pill } from '@/components/site/Form';

export const ETHNICITIES = ['European', 'Asian', 'Latin', 'African', 'Middle Eastern', 'Mixed', 'Other'];
export const BREAST_SIZES = ['A', 'B', 'C', 'D', 'DD+'];
export const BREAST_TYPES = ['Natural', 'Enhanced'];

export const NATIONALITIES = [
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

const yn = (v) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '');
const toYn = (v) => (v === 'Yes' ? 'yes' : v === 'No' ? 'no' : '');

export default function CharacteristicsForm({ characteristics, onChange }) {
  const c = characteristics || {};
  const update = (key, value) => onChange({ ...c, [key]: value });
  return (
    <>
      <div className="ob-grp ob-half">
        <SelectField id="char-nat" label="Nationality" value={c.nationality || ''} onChange={(v) => update('nationality', v)} testId="char-nationality">
          <option value="">Select nationality</option>
          {NATIONALITIES.map((o) => <option key={o} value={o}>{o}</option>)}
        </SelectField>
        <div className="ob-hw">
          <TextField id="char-height" label="Height" type="number" unit="cm" placeholder="170" value={c.height || ''} onChange={(v) => update('height', v.replace(/[^0-9]/g, '').slice(0, 3))} testId="char-height" inputProps={{ min: 120, max: 230, inputMode: 'numeric' }} />
          <TextField id="char-weight" label="Weight" type="number" unit="kg" placeholder="58" value={c.weight || ''} onChange={(v) => update('weight', v.replace(/[^0-9]/g, '').slice(0, 3))} testId="char-weight" inputProps={{ min: 35, max: 200, inputMode: 'numeric' }} />
        </div>
      </div>
      <fieldset className="fs">
        <legend>Ethnicity</legend>
        <div className="pills" data-testid="char-ethnicity">
          {ETHNICITIES.map((o) => <Pill key={o} on={c.ethnicity === o} showCheck={false} onClick={() => update('ethnicity', c.ethnicity === o ? '' : o)} testId={`char-ethnicity-${o.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{o}</Pill>)}
        </div>
      </fieldset>
      <div className="ob-grp">
        <Seg legend="Breast size" eq options={BREAST_SIZES} value={c.breast_size} onChange={(v) => update('breast_size', v)} testId="char-breast_size" />
        <Seg legend="Breast type" eq options={BREAST_TYPES} value={c.breast_type} onChange={(v) => update('breast_type', v)} testId="char-breast_type" />
      </div>
      <div className="ob-grp">
        <Seg legend="Tattoos" options={['Yes', 'No']} value={yn(c.tattoos)} onChange={(v) => update('tattoos', toYn(v))} testId="char-tattoos" />
        <Seg legend="Piercings" options={['Yes', 'No']} value={yn(c.piercings)} onChange={(v) => update('piercings', toYn(v))} testId="char-piercings" />
        <Seg legend="Smoker" options={['Yes', 'No']} value={yn(c.smoker)} onChange={(v) => update('smoker', toYn(v))} testId="char-smoker" />
      </div>
    </>
  );
}
