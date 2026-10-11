import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveAgencyProfile } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifyError } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import { Stepper, ErrorSummary, Arrow, ArrowL, Check } from '@/components/site/Form';
import AgencyBasicStep from '@/components/onboarding/AgencyBasicStep';
import ServicesStep from '@/components/onboarding/ServicesStep';
import RatesAvailabilityStep from '@/components/onboarding/RatesAvailabilityStep';
import { agencyToForm, formToAgency, validateAgency, errorItems, errorTitle, COUNTRY_DIAL_CODES } from '@/lib/profileData';

const STEPS = [
  { id: 'basic', label: 'Basic info' },
  { id: 'services', label: 'Services' },
  { id: 'rates', label: 'Rates & availability' },
];
const NAMES = { display_name: 'Agency name' };

/**
 * Agency setup (3 steps). Everything entered here becomes the default for every new companion profile.
 * The agency is saved on step 1 "Save & continue"; after that changes are saved as you go.
 */
export default function AgencySetup({ initial = null, onDone }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(() => {
    const d = agencyToForm(initial || {});
    if (!initial) d.contact = { ...d.contact, email: user?.email || '' };
    if (!initial && user?.name && user.name !== 'New Agency') d.display_name = user.name;
    return d;
  });
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [exists, setExists] = useState(!!initial?.onboarded);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(initial?.onboarded ? 'saved' : 'idle');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const dirty = useRef(false);

  const update = (patch) => { dirty.current = true; setData((d) => ({ ...d, ...patch })); };
  useEffect(() => { if (submitted && step === 0) setErrors(validateAgency(data)); }, [data, submitted, step]);

  const save = async () => {
    setDraft('saving');
    try {
      await saveAgencyProfile(formToAgency(data));
      setExists(true);
      dirty.current = false;
      setDraft('saved');
      return true;
    } catch (err) {
      setDraft('error');
      notifyError(err, "We couldn't save your agency.");
      return false;
    }
  };

  useEffect(() => {
    if (!exists || !dirty.current) return undefined;
    const t = setTimeout(() => { if (dirty.current) save(); }, 2500);
    return () => clearTimeout(t);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i) => { setStep(i); setMaxStep((m) => Math.max(m, i)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const next = async () => {
    if (step === 0) {
      setSubmitted(true);
      const e = validateAgency(data);
      setErrors(e);
      if (Object.keys(e).length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    }
    setSaving(true);
    const ok = await save();
    setSaving(false);
    if (!ok) return;
    if (step < STEPS.length - 1) go(step + 1);
    else if (onDone) onDone();
  };

  const saveExit = async () => {
    let saved = exists;
    if (exists || !Object.keys(validateAgency(data)).length) saved = await save();
    if (saved && onDone) onDone();
    else navigate('/');
  };

  const errList = errorItems(errors, NAMES);
  const last = step === STEPS.length - 1;

  return (
    <LightPage>
      <div className="adv" data-testid="agency-setup">
        <header className="ob-head">
          <div className="tt">
            <span className="ey">Step {step + 1} of {STEPS.length} · Agency setup</span>
            <h1 className="h">Set up your agency</h1>
            <span className="sub">These details become the defaults for every companion profile you add.</span>
          </div>
          <div className="acts">
            {draft === 'saved' && <span className="saved"><Check />Draft saved</span>}
            {draft === 'saving' && <span className="saved">Saving…</span>}
            {draft === 'error' && <span className="saved" style={{ color: '#A3243B' }}>Not saved</span>}
            <button type="button" className="x-btn ghostl" onClick={saveExit} data-testid="save-exit">Save &amp; exit</button>
          </div>
        </header>

        <Stepper steps={STEPS} current={STEPS[step].id} maxReached={maxStep} onPick={(id) => { const i = STEPS.findIndex((s) => s.id === id); if (i <= maxStep) go(i); }} />

        <div className="ob-stack">
          {step === 0 && submitted && errList.length > 0 && <ErrorSummary title={errorTitle(errList.length)} items={errList} />}
          {step === 0 && <AgencyBasicStep data={data} update={update} errors={submitted ? errors : {}} countryDialCodes={COUNTRY_DIAL_CODES} />}
          {step === 1 && (
            <ServicesStep
              data={data} update={update} who="their" showCompanionshipType={false}
              sub="Default services for every new companion profile. Tick what your companions offer and whether it’s included in the rate or costs extra. You can still change this per profile."
            />
          )}
          {step === 2 && <RatesAvailabilityStep data={data} update={update} availabilitySub="Default availability and rates for every new companion profile. You can still change them per profile." />}

          <div role="group" aria-label="Step navigation" className="ob-nav">
            {step > 0 ? <button type="button" className="x-btn back" onClick={() => go(step - 1)} data-testid="step-back"><ArrowL />Back</button> : <span />}
            <div>
              {step > 0 && <span className="note">Step {step + 1} of {STEPS.length}</span>}
              <button type="button" className="x-btn primary" onClick={next} disabled={saving} data-testid="step-next">
                {saving ? 'Saving…' : last ? 'Save & go to dashboard' : 'Save & continue'}<Arrow />
              </button>
            </div>
          </div>
        </div>
      </div>
    </LightPage>
  );
}
