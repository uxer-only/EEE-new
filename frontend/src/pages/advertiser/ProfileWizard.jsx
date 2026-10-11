import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProviderProfile, updateProviderProfile, createSubscriptionCheckout } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifyError, notifyProblem } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import { Stepper, ErrorSummary, Arrow, ArrowL, Check, Card } from '@/components/site/Form';
import BasicInfoStep from '@/components/onboarding/BasicInfoStep';
import PhotosStep from '@/components/onboarding/PhotosStep';
import ServicesStep from '@/components/onboarding/ServicesStep';
import RatesAvailabilityStep from '@/components/onboarding/RatesAvailabilityStep';
import PlanPicker, { planTotal } from '@/components/onboarding/PlanPicker';
import { emptyProfile, toPayload, validateBasic, errorItems, errorTitle, COUNTRY_DIAL_CODES } from '@/lib/profileData';

const STEPS = [
  { id: 'basic', label: 'Basic info', mins: 6 },
  { id: 'photos', label: 'Photos & videos', mins: 5 },
  { id: 'services', label: 'Services', mins: 4 },
  { id: 'rates', label: 'Rates & availability', mins: 2 },
  { id: 'activate', label: 'Activate', mins: 1 },
];

/**
 * Independent advertiser onboarding: 5 steps. The profile is created as a draft when step 1 is saved,
 * so photos can be uploaded in step 2 and everything after is saved as you go.
 * Props: initial (normalized data of an existing draft, optional), startStep.
 */
export default function ProfileWizard({ initial = null, startStep = 0, onExit }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(() => initial || { ...emptyProfile('independent'), contact: { phone: '', email: user?.email || '' } });
  const [step, setStep] = useState(startStep);
  const [maxStep, setMaxStep] = useState(startStep);
  const [exists, setExists] = useState(!!initial);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(initial ? 'saved' : 'idle'); // idle | saving | saved | error
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [plan, setPlan] = useState('featured_1m');
  const [vip, setVip] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [paying, setPaying] = useState(false);
  const dirty = useRef(false);

  const update = (patch) => { dirty.current = true; setData((d) => ({ ...d, ...patch })); };

  // live validation once the user tried to continue
  useEffect(() => { if (submitted && step === 0) setErrors(validateBasic(data)); }, [data, submitted, step]);

  const save = async () => {
    setDraft('saving');
    try {
      if (exists) await updateProviderProfile(toPayload(data));
      else { await createProviderProfile(toPayload(data)); setExists(true); }
      dirty.current = false;
      setDraft('saved');
      return true;
    } catch (err) {
      setDraft('error');
      notifyError(err, "We couldn't save your profile.");
      return false;
    }
  };

  // autosave a few seconds after changes once the draft exists
  useEffect(() => {
    if (!exists || !dirty.current) return undefined;
    const t = setTimeout(() => { if (dirty.current) save(); }, 2500);
    return () => clearTimeout(t);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i) => { setStep(i); setMaxStep((m) => Math.max(m, i)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const next = async () => {
    if (step === 0) {
      setSubmitted(true);
      const e = validateBasic(data);
      setErrors(e);
      if (Object.keys(e).length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    }
    setSaving(true);
    const ok = step === 1 && !dirty.current && exists ? true : await save();
    setSaving(false);
    if (ok) go(step + 1);
  };

  const saveExit = async () => {
    let saved = exists;
    if (exists || !Object.keys(validateBasic(data)).length) saved = await save();
    if (saved && onExit) onExit();
    else navigate('/');
  };

  const pay = async () => {
    if (user && user.email_verified === false) {
      notifyProblem('Please confirm your e-mail first.', 'Check your inbox for the confirmation link, then come back to activate.');
      return;
    }
    if (dirty.current) await save();
    setPaying(true);
    try {
      const { data: r } = await createSubscriptionCheckout({
        featured_plan: plan, vip_plan: vip ? plan.replace('featured_', 'vip_') : null, auto_renew: autoRenew, origin_url: window.location.origin,
      });
      if (r?.url) window.location.href = r.url;
      else { notifyProblem("We couldn't start checkout.", 'Please try again in a moment.'); setPaying(false); }
    } catch (err) {
      notifyError(err, "We couldn't start checkout.");
      setPaying(false);
    }
  };

  const cur = STEPS[step];
  const errList = errorItems(errors);

  return (
    <LightPage>
      <div className="adv" data-testid="onboarding">
        <header className="ob-head">
          <div className="tt">
            <span className="ey">Step {step + 1} of {STEPS.length} · {cur.mins === 1 ? 'about 1 minute left' : `about ${cur.mins} minutes left`}</span>
            <h1 className="h">Complete your profile</h1>
          </div>
          <div className="acts">
            {draft === 'saved' && <span className="saved"><Check />Draft saved</span>}
            {draft === 'saving' && <span className="saved">Saving…</span>}
            {draft === 'error' && <span className="saved" style={{ color: '#A3243B' }}>Not saved</span>}
            <button type="button" className="x-btn ghostl" onClick={saveExit} data-testid="save-exit">Save &amp; exit</button>
          </div>
        </header>

        <Stepper steps={STEPS} current={cur.id} maxReached={maxStep} onPick={(id) => { const i = STEPS.findIndex((s) => s.id === id); if (i <= maxStep) go(i); }} />

        <div className="ob-stack">
          {step === 0 && submitted && errList.length > 0 && <ErrorSummary title={errorTitle(errList.length)} items={errList} />}

          {step === 0 && <BasicInfoStep data={data} update={update} errors={submitted ? errors : {}} countryDialCodes={COUNTRY_DIAL_CODES} />}
          {step === 1 && <PhotosStep />}
          {step === 2 && <ServicesStep data={data} update={update} />}
          {step === 3 && <RatesAvailabilityStep data={data} update={update} />}
          {step === 4 && (
            <Card level={1} title="Activate your profile" sub="Your profile is saved. Pick how long it stays visible on Browse." testId="activate-card">
              <PlanPicker plan={plan} setPlan={setPlan} vip={vip} setVip={setVip} autoRenew={autoRenew} setAutoRenew={setAutoRenew} />
            </Card>
          )}

          <div role="group" aria-label="Step navigation" className="ob-nav">
            {step > 0 ? <button type="button" className="x-btn back" onClick={() => go(step - 1)} data-testid="step-back"><ArrowL />Back</button> : <span />}
            <div>
              {step === 0 && <span className="note">Physical characteristics are optional.</span>}
              {step > 0 && step < 4 && <span className="note">Step {step + 1} of {STEPS.length}</span>}
              {step === 4 && <span className="note">Not ready? Your profile stays saved as a draft.</span>}
              {step < 4 ? (
                <button type="button" className="x-btn primary" onClick={next} disabled={saving} data-testid="step-next">{saving ? 'Saving…' : 'Save & continue'}<Arrow /></button>
              ) : (
                <button type="button" className="x-btn primary" onClick={pay} disabled={paying} data-testid="pay-activate">{paying ? 'Opening payment…' : `Pay €${planTotal(plan, vip)} & activate`}<Arrow /></button>
              )}
            </div>
          </div>
        </div>
      </div>
    </LightPage>
  );
}
