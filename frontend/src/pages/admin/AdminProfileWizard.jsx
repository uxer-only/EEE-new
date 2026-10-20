import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { createProviderProfile, updateProviderProfile, getAdminProviderDetail, publishProvider } from '@/services/api';
import { notifyError } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import { Stepper, ErrorSummary, Arrow, ArrowL, Check, Note, Card } from '@/components/site/Form';
import BasicInfoStep from '@/components/onboarding/BasicInfoStep';
import PhotosStep from '@/components/onboarding/PhotosStep';
import ServicesStep from '@/components/onboarding/ServicesStep';
import RatesAvailabilityStep from '@/components/onboarding/RatesAvailabilityStep';
import { FEATURED_OPTIONS } from '@/components/onboarding/PlanPicker';
import { fmtDay } from '@/components/admin/AdminParts';
import { emptyProfile, normalizeProfile, toPayload, validateBasic, errorItems, errorTitle, COUNTRY_DIAL_CODES } from '@/lib/profileData';
import '@/styles/advertiser.css';
import '@/styles/dashboard.css';
import '@/styles/admin.css';

const STEPS = [
  { id: 'basic', label: 'Basic info' },
  { id: 'photos', label: 'Photos & videos' },
  { id: 'services', label: 'Services' },
  { id: 'rates', label: 'Rates & availability' },
  { id: 'publish', label: 'Publish' },
];
const NOTES = {
  0: 'You are adding this profile yourself: no account, payment or verification is needed. The contact details you enter are shown to visitors.',
  1: 'Photos and videos you upload are approved straight away. The first photo is the cover.',
};

/**
 * Admin: add a profile yourself (or edit one), without checkout. Steps as for advertisers, then "Publish":
 * the profile is verified, everything approved and put online for the chosen period, free of charge.
 * /admin/profiles/new adds one; /admin/profiles/:providerId edits one.
 */
export default function AdminProfileWizard() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(providerId ? null : emptyProfile('independent'));
  const [info, setInfo] = useState(null); // admin view of an existing profile (plan, live)
  const [pid, setPid] = useState(providerId || null);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(providerId ? STEPS.length - 1 : 0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [photoCount, setPhotoCount] = useState(null);
  const [plan, setPlan] = useState('featured_3m');
  const [vip, setVip] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    if (!providerId) return;
    getAdminProviderDetail(providerId)
      .then(({ data: p }) => { setInfo(p); setData(normalizeProfile(p)); })
      .catch((e) => notifyError(e, "We couldn't load this profile."));
  }, [providerId]);

  const update = (patch) => { dirty.current = true; setData((d) => ({ ...d, ...patch })); };
  useEffect(() => { if (data && submitted && step === 0) setErrors(validateBasic(data, { who: 'her' })); }, [data, submitted, step]);

  const save = async () => {
    try {
      if (pid) await updateProviderProfile(toPayload(data), pid);
      else {
        const { data: r } = await createProviderProfile({ ...toPayload(data), account_type: 'independent' });
        setPid(r.provider_id);
        window.history.replaceState(null, '', `/admin/profiles/${r.provider_id}`);
      }
      dirty.current = false;
      return true;
    } catch (err) {
      notifyError(err, "We couldn't save this profile.");
      return false;
    }
  };

  // Autosave while typing once the profile exists.
  useEffect(() => {
    if (!pid || !dirty.current) return undefined;
    const t = setTimeout(() => { if (dirty.current) save(); }, 2500);
    return () => clearTimeout(t);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i) => { setStep(i); setMaxStep((m) => Math.max(m, i)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const checkBasic = () => {
    setSubmitted(true);
    const e = validateBasic(data, { who: 'her' });
    setErrors(e);
    if (Object.keys(e).length) { go(0); return false; }
    return true;
  };

  const next = async () => {
    if (step === 0 && !checkBasic()) return;
    setSaving(true);
    const ok = (step === 1 || step === 4) && pid && !dirty.current ? true : await save();
    setSaving(false);
    if (ok) go(step + 1);
  };

  const publish = async () => {
    if (!checkBasic()) return;
    setSaving(true);
    try {
      if (dirty.current && !(await save())) return;
      const fo = FEATURED_OPTIONS.find((o) => o.id === plan);
      await publishProvider(pid, { featured_plan: plan, vip_plan: vip ? fo.vip : null });
      toast.success(`${data.display_name || 'The profile'} is online.`);
      navigate(`/admin/providers/${pid}`);
    } catch (e) {
      notifyError(e, "We couldn't publish this profile.");
    } finally {
      setSaving(false);
    }
  };

  const back = pid ? `/admin/providers/${pid}` : '/admin/independents';
  if (!data) return <LightPage admin={providerId ? 'independents' : 'profiles'}><div style={{ minHeight: '40vh' }} aria-busy="true" /></LightPage>;

  const errList = errorItems(errors);
  const needPhoto = step === 1 && photoCount === 0;
  const last = step === STEPS.length - 1;
  const liveUntil = info?.featured_active ? info.featured_until : null;
  const fo = FEATURED_OPTIONS.find((o) => o.id === plan);
  const until = (o) => {
    const base = liveUntil && new Date(liveUntil) > new Date() ? new Date(liveUntil) : new Date();
    base.setDate(base.getDate() + o.days);
    return fmtDay(base.toISOString());
  };

  return (
    <LightPage admin={providerId ? 'independents' : 'profiles'}>
      <div className="adv" data-testid="admin-profile-wizard">
        <header className="ob-head ed">
          <Link to={back} className="back"><ArrowL />{pid ? 'Back to profile' : 'Back to independents'}</Link>
          <div className="tt">
            <span className="ey">Step {step + 1} of {STEPS.length} · Added by you</span>
            <h1 className="h">{providerId ? `Edit ${data.display_name || 'profile'}` : 'Add a profile'}</h1>
          </div>
        </header>

        <Stepper steps={STEPS} current={STEPS[step].id} maxReached={maxStep} onPick={(id) => { const i = STEPS.findIndex((s) => s.id === id); if (i <= maxStep && (i === 0 || pid)) go(i); }} />

        <div className="ob-stack">
          {NOTES[step] && <Note>{NOTES[step]}</Note>}
          {step === 0 && submitted && errList.length > 0 && <ErrorSummary title={errorTitle(errList.length)} items={errList} />}
          {step === 0 && <BasicInfoStep data={data} update={update} who="her" errors={submitted ? errors : {}} countryDialCodes={COUNTRY_DIAL_CODES} />}
          {step === 1 && pid && <PhotosStep providerId={pid} who="her" reviewed={false} onChange={(list) => setPhotoCount(list.filter((m) => m.media_type !== 'video').length)} />}
          {step === 2 && <ServicesStep data={data} update={update} who="her" sub="Tick what she offers. For each one, say whether it’s included in her rate or costs extra." />}
          {step === 3 && <RatesAvailabilityStep data={data} update={update} who="her" />}
          {step === 4 && (
            <Card id="pub" title="Publish the profile" sub={liveUntil
              ? `This profile is online until ${fmtDay(liveUntil)}. Publishing again adds the days you choose on top. No payment is needed.`
              : 'Choose how long the profile stays online. It goes live straight away, marked as verified. No payment is needed.'}>
              <fieldset className="pl-fs">
                <legend><span className="t">Online for</span></legend>
                <div role="radiogroup" aria-label="Online for" className="pl-box">
                  {FEATURED_OPTIONS.map((o) => (
                    <label key={o.id} className={`pl-row${plan === o.id ? ' on' : ''}`} data-testid={`pub-${o.id}`}>
                      <input type="radio" name="pub-plan" checked={plan === o.id} onChange={() => setPlan(o.id)} />
                      <span className="d">{o.label}</span>
                      <span className="pd">until {until(o)}</span>
                      <span className="sv" />
                      <span className="pr"><span className="amt">Free</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="adm-pubvip">
                <input type="checkbox" checked={vip} onChange={(e) => setVip(e.target.checked)} data-testid="pub-vip" />
                <span><b>Also VIP for {fo?.label}</b><small>VIP puts the profile at the very top of Browse.</small></span>
              </label>
            </Card>
          )}

          <div role="group" aria-label="Step navigation" className="ob-nav">
            {step > 0
              ? <button type="button" className="x-btn back" onClick={() => go(step - 1)} data-testid="step-back"><ArrowL />Back</button>
              : <Link to={back} className="x-btn back" style={{ padding: '0 22px' }}>Cancel</Link>}
            <div>
              {step === 0 && <span className="note">Physical characteristics are optional.</span>}
              {step === 1 && <span className="note">{needPhoto ? 'Add at least 1 photo to continue.' : 'Uploads are saved straight away.'}</span>}
              {step > 1 && !last && <span className="note">Changes are saved as you go.</span>}
              {last && <span className="note">Not ready yet? Leave this page: the profile is saved and stays offline.</span>}
              {last
                ? <button type="button" className="x-btn primary" onClick={publish} disabled={saving} data-testid="publish-profile"><Check size={16} />{saving ? 'Publishing…' : liveUntil ? 'Add days and publish' : 'Publish profile'}</button>
                : <button type="button" className="x-btn primary" onClick={next} disabled={saving || needPhoto} data-testid="step-next">{saving ? 'Saving…' : 'Save & continue'}<Arrow /></button>}
            </div>
          </div>
        </div>
      </div>
    </LightPage>
  );
}
