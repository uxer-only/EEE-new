import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createProviderProfile, updateProviderProfile } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import { Stepper, ErrorSummary, Arrow, ArrowL, Check, Note } from '@/components/site/Form';
import BasicInfoStep from '@/components/onboarding/BasicInfoStep';
import PhotosStep from '@/components/onboarding/PhotosStep';
import ServicesStep from '@/components/onboarding/ServicesStep';
import RatesAvailabilityStep from '@/components/onboarding/RatesAvailabilityStep';
import { toPayload, validateBasic, errorItems, errorTitle, companionFromAgency, COUNTRY_DIAL_CODES } from '@/lib/profileData';

const STEPS = [
  { id: 'basic', label: 'Basic info' },
  { id: 'photos', label: 'Photos & videos' },
  { id: 'services', label: 'Services' },
  { id: 'rates', label: 'Rates & availability' },
];
const NOTES = {
  0: 'Location and contact details are pre-filled from your agency defaults. Change anything for this companion.',
  2: 'Services are pre-filled from your agency defaults. Changes here apply only to this companion.',
  3: 'Rates and availability are pre-filled from your agency defaults. Changes here apply only to this companion.',
};

/**
 * Agency: add a companion profile in 4 steps. The profile is created on step 1 "Save & continue",
 * so photos can be uploaded right away; later steps are saved as you go.
 * initial/providerId continue an existing draft.
 */
export default function CompanionWizard({ agency, initial = null, providerId = null, startStep = 0, onDone }) {
  const navigate = useNavigate();
  const [data, setData] = useState(() => initial || companionFromAgency(agency));
  const [pid, setPid] = useState(providerId);
  const [step, setStep] = useState(startStep);
  const [maxStep, setMaxStep] = useState(providerId ? 3 : startStep);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [photoCount, setPhotoCount] = useState(null);
  const dirty = useRef(false);
  const agencyName = agency?.agency_name || 'Your agency';

  const update = (patch) => { dirty.current = true; setData((d) => ({ ...d, ...patch })); };
  useEffect(() => { if (submitted && step === 0) setErrors(validateBasic(data, { who: 'her' })); }, [data, submitted, step]);

  const save = async () => {
    try {
      if (pid) await updateProviderProfile(toPayload(data), pid);
      else {
        const { data: r } = await createProviderProfile({ ...toPayload(data), account_type: 'independent' });
        setPid(r.provider_id);
      }
      dirty.current = false;
      return true;
    } catch (err) {
      notifyError(err, "We couldn't save this profile.");
      return false;
    }
  };

  useEffect(() => {
    if (!pid || !dirty.current) return undefined;
    const t = setTimeout(() => { if (dirty.current) save(); }, 2500);
    return () => clearTimeout(t);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i) => { setStep(i); setMaxStep((m) => Math.max(m, i)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const next = async () => {
    if (step === 0) {
      setSubmitted(true);
      const e = validateBasic(data, { who: 'her' });
      setErrors(e);
      if (Object.keys(e).length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    }
    setSaving(true);
    const ok = step === 1 && pid && !dirty.current ? true : await save();
    setSaving(false);
    if (!ok) return;
    if (step < STEPS.length - 1) go(step + 1);
    else {
      toast.success(`${data.display_name}’s profile is saved.`);
      if (onDone) onDone();
      navigate('/dashboard');
    }
  };

  const errList = errorItems(errors);
  const needPhoto = step === 1 && photoCount === 0;
  const last = step === STEPS.length - 1;

  return (
    <LightPage>
      <div className="adv" data-testid="companion-wizard">
        <header className="ob-head ed">
          <Link to="/dashboard" className="back"><ArrowL />Back to dashboard</Link>
          <div className="tt">
            <span className="ey">Step {step + 1} of {STEPS.length} · {agencyName}</span>
            <h1 className="h">{initial ? `Complete ${data.display_name || 'this'} profile` : 'Add a companion profile'}</h1>
          </div>
        </header>

        <Stepper steps={STEPS} current={STEPS[step].id} maxReached={maxStep} onPick={(id) => { const i = STEPS.findIndex((s) => s.id === id); if (i <= maxStep && (i === 0 || pid)) go(i); }} />

        <div className="ob-stack">
          {NOTES[step] && <Note>{NOTES[step]}</Note>}
          {step === 0 && submitted && errList.length > 0 && <ErrorSummary title={errorTitle(errList.length)} items={errList} />}
          {step === 0 && <BasicInfoStep data={data} update={update} who="her" errors={submitted ? errors : {}} countryDialCodes={COUNTRY_DIAL_CODES} />}
          {step === 1 && pid && <PhotosStep providerId={pid} who="her" onChange={(list) => setPhotoCount(list.filter((m) => m.media_type !== 'video').length)} />}
          {step === 2 && <ServicesStep data={data} update={update} who="her" sub="Tick what she offers. For each one, say whether it’s included in her rate or costs extra." />}
          {step === 3 && <RatesAvailabilityStep data={data} update={update} who="her" />}

          <div role="group" aria-label="Step navigation" className="ob-nav">
            {step > 0
              ? <button type="button" className="x-btn back" onClick={() => go(step - 1)} data-testid="step-back"><ArrowL />Back</button>
              : <Link to="/dashboard" className="x-btn back" style={{ padding: '0 22px' }}>Cancel</Link>}
            <div>
              {step === 0 && <span className="note">Physical characteristics are optional.</span>}
              {step === 1 && <span className="note">{needPhoto ? 'Add at least 1 photo to continue.' : 'Uploads are saved straight away.'}</span>}
              {step > 1 && <span className="note">Step {step + 1} of {STEPS.length}</span>}
              <button type="button" className="x-btn primary" onClick={next} disabled={saving || needPhoto} data-testid="step-next">
                {last && <Check size={16} />}
                {saving ? 'Saving…' : last ? 'Save profile' : 'Save & continue'}
                {!last && <Arrow />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </LightPage>
  );
}
