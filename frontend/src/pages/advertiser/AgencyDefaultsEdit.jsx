import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { saveAgencyProfile } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import { ErrorSummary, ArrowL, Check, Note } from '@/components/site/Form';
import AgencyBasicStep from '@/components/onboarding/AgencyBasicStep';
import ServicesStep from '@/components/onboarding/ServicesStep';
import { AvailabilityCard, RatesCard } from '@/components/onboarding/RatesAvailabilityStep';
import { agencyToForm, formToAgency, validateAgency, errorItems, errorTitle, COUNTRY_DIAL_CODES } from '@/lib/profileData';

const TITLES = { basic: 'Edit Basic info', services: 'Edit default Services', availability: 'Edit default Availability', rates: 'Edit default Rates' };

/** Agency: edit one section of the agency defaults (basic, services, availability, rates). */
export default function AgencyDefaultsEdit({ ag, section }) {
  const navigate = useNavigate();
  const [data, setData] = useState(() => agencyToForm(ag.agency));
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const update = (patch) => { setChanged(true); setData((d) => ({ ...d, ...patch })); };

  useEffect(() => { if (submitted && section === 'basic') setErrors(validateAgency(data)); }, [data, submitted, section]);

  const save = async () => {
    if (section === 'basic') {
      setSubmitted(true);
      const e = validateAgency(data);
      setErrors(e);
      if (Object.keys(e).length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    }
    setSaving(true);
    try {
      await saveAgencyProfile(formToAgency(data));
      toast.success('Agency defaults saved');
      await ag.reload();
      navigate('/dashboard');
    } catch (err) {
      notifyError(err, "We couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const errList = errorItems(errors, { display_name: 'Agency name' });
  return (
    <LightPage>
      <div className="adv" data-testid={`agency-defaults-${section}`}>
        <header className="ob-head ed">
          <Link to="/dashboard" className="back"><ArrowL />Back to dashboard</Link>
          <div className="tt">
            <span className="ey">Agency defaults · {ag.agency?.agency_name}</span>
            <h1 className="h">{TITLES[section]}</h1>
            <span className="sub">{section === 'basic' ? 'Your agency details. Changes are saved for new companion profiles you add.' : 'The starting point for every new companion profile. Existing profiles only change when you sync defaults.'}</span>
          </div>
        </header>
        <div className="ob-stack">
          {section !== 'basic' && ag.profiles.length > 0 && <Note>Saving here does not change existing companion profiles. Use “Sync defaults to all profiles” on the dashboard to copy them over.</Note>}
          {section === 'basic' && submitted && errList.length > 0 && <ErrorSummary title={errorTitle(errList.length)} items={errList} />}
          {section === 'basic' && <AgencyBasicStep data={data} update={update} errors={submitted ? errors : {}} countryDialCodes={COUNTRY_DIAL_CODES} />}
          {section === 'services' && (
            <ServicesStep data={data} update={update} who="their" showCompanionshipType={false}
              sub="Default services for every new companion profile. Tick what your companions offer and whether it’s included in the rate or costs extra. You can still change this per profile." />
          )}
          {section === 'availability' && <AvailabilityCard data={data} update={update} sub="Default availability for every new companion profile. You can still change it per profile." />}
          {section === 'rates' && <RatesCard data={data} update={update} level={1} />}
          <div role="group" aria-label="Save or cancel" className="ob-nav">
            <Link to="/dashboard" className="x-btn back" style={{ padding: '0 22px' }}>Cancel</Link>
            <div>
              <span className="note">{changed ? 'You have unsaved changes' : 'No changes yet'}</span>
              <button type="button" className="x-btn primary" onClick={save} disabled={saving} data-testid="save-changes"><Check size={16} />{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      </div>
    </LightPage>
  );
}
