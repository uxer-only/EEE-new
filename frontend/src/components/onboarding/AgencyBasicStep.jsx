import { Card, TextField, SelectField } from '@/components/site/Form';
import { splitPhone, joinPhone } from '@/constants/companionData';
import { COUNTRIES, ContactFields } from './BasicInfoStep';

const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);

/**
 * Agency basic info: name, city, country, description + contact details.
 * Uses the profile-shaped data from agencyToForm (display_name = agency name, bio = description).
 */
export default function AgencyBasicStep({ data, update, errors = {}, countryDialCodes = {} }) {
  const location = data.location || { city: '', country: '' };
  const setCountry = (country) => {
    const newDial = countryDialCodes[country] || '';
    const oldDial = countryDialCodes[location.country] || '';
    const { number } = splitPhone(data.contact?.phone, oldDial);
    update({
      location: { ...location, country },
      contact: { ...(data.contact || {}), phone: newDial ? joinPhone(newDial, number) : (data.contact?.phone || '') },
    });
  };
  return (
    <div className="ob-stack">
      <Card id="sec-about" level={1} title="Basic information" sub="Your agency details. You can change them any time." testId="agency-basic-card">
        <div className="ob-grp ob-half">
          <TextField
            id="bi-name" label="Agency name" value={data.display_name} maxLength={60}
            onChange={(v) => update({ display_name: v.slice(0, 60) })} placeholder="e.g. Rose Noire"
            unit={<span style={{ fontSize: 13, fontWeight: 600 }}>{(data.display_name || '').length}/60</span>}
            error={errors.display_name} testId="agency-name-input"
          />
          <TextField id="bi-city" label="City" icon={<PinIcon />} value={location.city} onChange={(v) => update({ location: { ...location, city: v } })} placeholder="Start typing your city" error={errors.city} hint="Clients only see your city, never your address." testId="agency-city-input" />
          <SelectField id="bi-country" label="Country" value={location.country} onChange={setCountry} error={errors.country} testId="agency-country-input">
            <option value="">Select country</option>
            {COUNTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
          </SelectField>
        </div>
        <div className="fl">
          <div className="lr"><label htmlFor="bi-about">Agency description</label><span className="cnt">{(data.bio || '').length} / 1500</span></div>
          <textarea id="bi-about" className="ta" rows={6} maxLength={1500} value={data.bio || ''} onChange={(e) => update({ bio: e.target.value.slice(0, 1500) })} placeholder="A small, discreet agency with hand-picked companions…" data-testid="agency-description-input" />
        </div>
      </Card>
      <Card id="sec-contact" title="Contact information" sub="How clients reach you to make an enquiry." testId="agency-contact-card">
        <ContactFields contact={data.contact || {}} country={location.country} countryDialCodes={countryDialCodes} onChange={(contact) => update({ contact })} errors={errors} />
      </Card>
    </div>
  );
}
