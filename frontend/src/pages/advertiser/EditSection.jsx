import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { updateProviderProfile } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import { ErrorSummary, ArrowL, Check, Note } from '@/components/site/Form';
import BasicInfoStep from '@/components/onboarding/BasicInfoStep';
import PhotosStep from '@/components/onboarding/PhotosStep';
import ServicesStep from '@/components/onboarding/ServicesStep';
import RatesAvailabilityStep from '@/components/onboarding/RatesAvailabilityStep';
import { toPayload, validateBasic, errorItems, errorTitle, COUNTRY_DIAL_CODES } from '@/lib/profileData';

const TITLES = { basic: 'Edit Basic info', photos: 'Edit Photos & videos', services: 'Edit Services', rates: 'Edit Rates & availability' };

/**
 * One section of a profile in edit mode (Basic info, Photos & videos, Services, Rates & availability).
 * adv = useAdvertiser() result, providerId for agency companions, backHref, eyebrow, who ('your' | 'her'),
 * agencyCompanion: hides contact/location (they come from the agency defaults).
 */
export default function EditSection({ adv, section, providerId = null, backHref = '/dashboard', backLabel = 'Back to dashboard', eyebrow = 'Manage profile', who = 'your', agencyCompanion = false, note = null, name = null }) {
  const her = who === 'her';
  const navigate = useNavigate();
  const [data, setData] = useState(adv.data);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const top = useRef(null);
  const update = (patch) => { setChanged(true); setData((d) => ({ ...d, ...patch })); };
  const withContact = !agencyCompanion;

  useEffect(() => { if (submitted && section === 'basic') setErrors(validateBasic(data, { withContact, who: her ? 'her' : 'you' })); }, [data, submitted, section, withContact, her]);

  const save = async () => {
    if (section === 'photos') { navigate(backHref); return; }
    if (section === 'basic') {
      setSubmitted(true);
      const e = validateBasic(data, { withContact, who: her ? 'her' : 'you' });
      setErrors(e);
      if (Object.keys(e).length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    }
    setSaving(true);
    try {
      await updateProviderProfile(toPayload(data), providerId);
      toast.success('Changes saved');
      await adv.reload();
      navigate(backHref);
    } catch (err) {
      notifyError(err, "We couldn't save your changes.");
    } finally {
      setSaving(false);
    }
  };

  const errList = errorItems(errors);
  return (
    <LightPage>
      <div className="adv" ref={top} data-testid={`edit-${section}`}>
        <header className="ob-head ed">
          <Link to={backHref} className="back"><ArrowL />{backLabel}</Link>
          <div className="tt">
            <span className="ey">{eyebrow}</span>
            <h1 className="h">{TITLES[section]}</h1>
            <span className="sub">{section === 'photos' ? 'New photos and videos are checked by our team before they appear on the profile.' : (name ? `Update this section of ${name}’s profile. Changes are visible on her profile as soon as you save.` : `Update this section of ${who} profile. Changes are visible on ${who} profile as soon as you save.`)}</span>
          </div>
        </header>
        <div className="ob-stack">
          {note}
          {section === 'basic' && submitted && errList.length > 0 && <ErrorSummary title={errorTitle(errList.length)} items={errList} />}
          {section === 'basic' && <BasicInfoStep data={data} update={update} errors={submitted ? errors : {}} countryDialCodes={COUNTRY_DIAL_CODES} hideLocationContact={agencyCompanion} who={her ? 'her' : 'you'} />}
          {section === 'photos' && <PhotosStep providerId={providerId} who={who} onChange={() => setChanged(true)} />}
          {section === 'services' && <ServicesStep data={data} update={update} who={who} sub={her ? 'Tick what she offers. For each one, say whether it’s included in her rate or costs extra.' : undefined} />}
          {section === 'rates' && <RatesAvailabilityStep data={data} update={update} who={her ? 'her' : 'you'} />}
          <div role="group" aria-label="Save or cancel" className="ob-nav">
            <Link to={backHref} className="x-btn back" style={{ padding: '0 22px' }}>Cancel</Link>
            <div>
              <span className="note">{section === 'photos' ? 'Uploads and changes are saved straight away.' : changed ? 'You have unsaved changes' : 'No changes yet'}</span>
              <button type="button" className="x-btn primary" onClick={save} disabled={saving} data-testid="save-changes"><Check size={16} />{saving ? 'Saving…' : section === 'photos' ? 'Done' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      </div>
    </LightPage>
  );
}

export { Note };
