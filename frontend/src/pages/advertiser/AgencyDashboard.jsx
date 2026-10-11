import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setProfilePlan, createBulkCheckout, syncAgencyDefaults, deleteAgencyProfile, deleteProviderProfile } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifyError, notifyProblem } from '@/lib/notify';
import { LightPage } from '@/components/site/Shell';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import VerificationModal from '@/components/VerificationModal';
import { SectionCard, ServicesBody, AvailabilityBody, RatesBody, DangerZone, Dialog, Ico } from '@/components/advertiser/DashboardParts';
import { agencyToForm, summarize } from '@/lib/profileData';
import { currencySymbol } from '@/constants/companionData';
import '@/styles/advertiser.css';
import '@/styles/dashboard.css';

// Agency graded prices (mirror of backend AGENCY_PLANS). The grade follows the ACTIVE profiles:
// live now + queued in this checkout. t0 = 1–2 (standard), t1 = 3–6 (agency), t2 = 7+ (volume).
export const AGENCY_PLANS = [
  { key: 'agency_7d', label: '7 days', vip: 'agency_vip_7d', price: { t0: 30, t1: 25, t2: 20 }, vipPrice: { t0: 10, t1: 10, t2: 8 } },
  { key: 'agency_15d', label: '15 days', vip: 'agency_vip_15d', price: { t0: 50, t1: 45, t2: 35 }, vipPrice: { t0: 15, t1: 15, t2: 12 } },
  { key: 'agency_1m', label: '1 month', vip: 'agency_vip_1m', price: { t0: 90, t1: 80, t2: 65 }, vipPrice: { t0: 25, t1: 25, t2: 20 } },
  { key: 'agency_3m', label: '3 months', vip: 'agency_vip_3m', price: { t0: 240, t1: 220, t2: 180 }, vipPrice: { t0: 60, t1: 60, t2: 48 } },
];
const PLAN = Object.fromEntries(AGENCY_PLANS.map((p) => [p.key, p]));
const tierFor = (n) => (n >= 7 ? 't2' : n >= 3 ? 't1' : 't0');
const tierNote = (n) => {
  const lbl = `${n} active profile${n === 1 ? '' : 's'}`;
  if (n >= 7) return `${lbl} · volume price applies`;
  if (n >= 3) return `${lbl} · agency price applies · ${7 - n} more for volume price`;
  return `${lbl} · standard price · ${3 - n} more for agency price`;
};
const cost = (pp, tier) => {
  const f = pp?.featured_plan && PLAN[pp.featured_plan];
  if (!f) return 0;
  return f.price[tier] + (pp.vip_plan ? f.vipPrice[tier] : 0);
};
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dm = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${d.getDate()} ${MON[d.getMonth()]}`; };

const I = {
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.6 3 5.2" /></svg>,
  chat: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  user: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
  ok: <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5 4 5.5v6c0 5 3.4 9.4 8 10.5 4.6-1.1 8-5.5 8-10.5v-6l-8-3z" fill="#2F7A55" /><path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  wait: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B26B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2.5 4 5.5v6c0 5 3.4 9.4 8 10.5 4.6-1.1 8-5.5 8-10.5v-6l-8-3z" /><path d="M12 8.5V12l2 1.5" /></svg>,
  pen: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" /></svg>,
  bin: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  crown: <svg width="16" height="16" viewBox="0 0 24 24" fill="#B04585" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" /></svg>,
  sel: <svg className="schev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>,
  sync: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" /></svg>,
};

/** Status of one companion row: [kind, label]. kind = live | renew | expired | ready | draft. */
function statusOf(p) {
  const days = (n) => `${n} day${n === 1 ? '' : 's'} left`;
  if (p.featured_active) return ['live', `Live · ${days(Math.max(0, Math.round(p.featured_days_left || 0)))}`];
  if (p.in_grace) return ['renew', `Renew · ${days(Math.max(1, Math.ceil(p.grace_days_left || 0)))}`];
  if (p.featured_until) return ['expired', `Expired ${dm(p.featured_until)}`];
  if (p.plan_selectable) return ['ready', 'Ready to go live'];
  return ['draft', `Draft · ${p.completed_steps || 0} of ${p.total_steps || 5} steps`];
}

function CompanionRow({ p, tier, onPlan, onVerify, onDelete }) {
  const [open, setOpen] = useState(false);
  const [kind, status] = statusOf(p);
  const pp = p.pending_plan || {};
  const canPick = !p.featured_active && p.plan_selectable;
  const has = canPick && !!pp.featured_plan;
  const plan = PLAN[pp.featured_plan];
  const meta = [p.age, p.city].filter(Boolean).join(' · ');
  const unread = p.unread_enquiries || 0;
  const pendingVer = !p.verified;
  return (
    <div className={`acr${has ? ' sel' : ''}`} data-mopen={open ? 'true' : 'false'} data-testid={`agency-profile-row-${p.provider_id}`}>
      <span className="who">
        <span className="th" aria-hidden="true">{p.photo ? <img src={p.photo} alt="" /> : I.user}</span>
        <span className="nm">
          <span className="n1"><b>{p.display_name}</b>{unread > 0 && <Link to={`/messages`} className="unr" aria-label={`${unread} unread message${unread === 1 ? '' : 's'}`} title={`${unread} unread`}>{unread}</Link>}</span>
          <span className="mt">{meta}</span>
        </span>
      </span>
      <span className="desc">{p.bio || 'New profile — description not added yet.'}</span>
      <div className="plan">
        {canPick && (
          <>
            <span className="sbx">
              <select aria-label={`Plan for ${p.display_name}`} className={has ? 'on' : ''} value={pp.featured_plan || ''} onChange={(e) => onPlan(p, e.target.value || null, !!pp.vip_plan)} data-testid={`plan-select-${p.provider_id}`}>
                <option value="">No plan</option>
                {AGENCY_PLANS.map((o) => <option key={o.key} value={o.key}>{`Featured · ${o.label} · €${o.price[tier]}`}</option>)}
              </select>
              {I.sel}
            </span>
            {has && (
              <label className="vip">
                <input type="checkbox" checked={!!pp.vip_plan} onChange={(e) => onPlan(p, pp.featured_plan, e.target.checked)} data-testid={`vip-${p.provider_id}`} />
                {I.crown}<span>VIP +€{plan ? plan.vipPrice[tier] : 0}</span>
              </label>
            )}
          </>
        )}
        {p.featured_active && (
          <span className="act"><b>{/^featured/i.test(p.active_plan_label || '') ? p.active_plan_label : `Featured · ${p.active_plan_label || 'active'}`}</b><span>Until {dm(p.featured_until)} · auto-renew {p.auto_renew ? 'on' : 'off'}</span></span>
        )}
        {!p.featured_active && !p.plan_selectable && <span className="blk">Complete the profile to choose a plan</span>}
      </div>
      <span className="st"><span className={`pill ${kind}`} data-testid={`status-${p.provider_id}`}><i aria-hidden="true" />{status}</span></span>
      <span className="acts">
        <button type="button" className="ico ver" aria-label={pendingVer ? `${p.display_name}: ${p.verification_status === 'submitted' ? 'verification pending' : 'start verification'}` : `${p.display_name} is verified`} title={pendingVer ? (p.verification_status === 'submitted' ? 'Verification pending' : 'Start verification') : 'Verified'} onClick={() => onVerify(p)} data-testid={`verify-${p.provider_id}`}>
          {pendingVer ? I.wait : I.ok}
        </button>
        <Link className="ico" to={`/dashboard/companion/${p.provider_id}`} aria-label={`Edit ${p.display_name}`} title="Edit" data-testid={`edit-${p.provider_id}`}>{I.pen}</Link>
        <button type="button" className="ico del" aria-label={`Delete ${p.display_name}`} title="Delete" onClick={() => onDelete(p)} data-testid={`delete-${p.provider_id}`}>{I.bin}</button>
      </span>
      <button type="button" className="mchev" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Show'} details for ${p.display_name}`} onClick={() => setOpen((o) => !o)}>{Ico.chev}</button>
    </div>
  );
}

/** Agency dashboard: companion roster with per-profile plans, one checkout, and the agency defaults. */
export default function AgencyDashboard({ ag }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { agency, profiles, setProfiles, reload } = ag;
  const [paying, setPaying] = useState(false);
  const [verifyFor, setVerifyFor] = useState(null);
  const [verInfo, setVerInfo] = useState(null);
  const [delFor, setDelFor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [askSync, setAskSync] = useState(false);
  const [openDef, setOpenDef] = useState({});
  const [defOpenM, setDefOpenM] = useState(false);

  const d = useMemo(() => agencyToForm(agency), [agency]);
  const sum = summarize(d);
  const liveN = profiles.filter((p) => p.featured_active).length;
  const queued = profiles.filter((p) => !p.featured_active && p.plan_selectable && p.pending_plan?.featured_plan);
  const tier = tierFor(liveN + queued.length);
  const total = queued.reduce((s, p) => s + cost(p.pending_plan, tier), 0);
  const unread = profiles.reduce((s, p) => s + (p.unread_enquiries || 0), 0);

  const onPlan = async (p, featured, vipOn) => {
    const vip = featured && vipOn ? PLAN[featured]?.vip || null : null;
    const pending = featured ? { featured_plan: featured, vip_plan: vip } : null;
    setProfiles((list) => list.map((x) => (x.provider_id === p.provider_id ? { ...x, pending_plan: pending } : x)));
    try { await setProfilePlan(p.provider_id, { featured_plan: featured, vip_plan: vip }); }
    catch (err) { notifyError(err, "We couldn't update this plan."); reload(); }
  };

  const pay = async () => {
    if (!queued.length) return;
    if (user && user.email_verified === false) {
      notifyProblem('Please confirm your e-mail first.', 'Check your inbox for the confirmation link. You can resend it from the banner at the top.');
      return;
    }
    setPaying(true);
    try {
      const { data } = await createBulkCheckout({ origin_url: window.location.origin });
      if (data?.url) window.location.href = data.url;
      else { notifyProblem("We couldn't start checkout.", 'Please try again in a moment.'); setPaying(false); }
    } catch (err) { notifyError(err, "We couldn't start checkout."); setPaying(false); }
  };

  const onVerify = (p) => {
    if (!p.verified && p.verification_status !== 'submitted') setVerifyFor(p);
    else setVerInfo(p);
  };

  const removeCompanion = async () => {
    setBusy(true);
    try {
      await deleteProviderProfile(delFor.provider_id);
      setProfiles((list) => list.filter((x) => x.provider_id !== delFor.provider_id));
      toast.success(`${delFor.display_name}’s profile was removed.`);
      setDelFor(null);
    } catch (err) { notifyError(err, "We couldn't delete this profile."); }
    finally { setBusy(false); }
  };

  const sync = async () => {
    setBusy(true);
    try {
      const { data } = await syncAgencyDefaults();
      toast.success(data.updated > 0 ? `Defaults applied to ${data.updated} profile${data.updated === 1 ? '' : 's'}` : 'All profiles already match your defaults');
      setAskSync(false);
      reload();
    } catch (err) { notifyError(err, "We couldn't sync your defaults."); }
    finally { setBusy(false); }
  };

  const removeAgency = async () => {
    try { await deleteAgencyProfile(); toast.success('Your agency was deleted.'); await logout(); navigate('/'); }
    catch (err) { notifyError(err, "We couldn't delete your agency."); }
  };

  const sym = currencySymbol(d.rates?.currency);
  const hasSvc = sum.services > 0;
  const hasRates = sum.fromRate != null;
  const hasAvail = !!agency.default_availability?.schedule || !!agency.default_availability?.available247;
  const typeLbl = { incall: 'incall', outcall: 'outcall', both: 'incall & outcall' }[d.availability_type] || 'incall & outcall';
  const ct = d.contact || {};
  const info = [['Agency name', d.display_name], ['Location', [d.location?.city, d.location?.country].filter(Boolean).join(', ')], ['Phone', ct.phone], ['E-mail', ct.email]].filter(([, v]) => v);
  const toggle = (i) => setOpenDef((o) => ({ ...o, [i]: !o[i] }));

  return (
    <LightPage>
      <div className="adv agd" data-testid="agency-dashboard">
        <EmailVerificationBanner user={user} />
        <header className="dhead" data-testid="agency-header">
          <div className="tt">
            <span className="ey">Agency dashboard</span>
            <h1>{d.display_name || user?.name}</h1>
            <span className="lead">Add a profile for each companion, choose a plan, then pay for all at once.</span>
          </div>
        </header>

        <div className="dgrid">
          <div className="stats2">
            <div className="stat" data-testid="stat-total"><span className="i">{I.users}</span><span><b>{profiles.length}</b><span>Companion profiles</span></span></div>
            <Link className="stat" to="/messages" data-testid="stat-enquiries"><span className="i">{I.chat}</span><span><b>{unread}</b><span>Unread enquiries</span></span></Link>
          </div>

          <section aria-labelledby="cp-title" className="dsec cps" data-testid="companion-profiles-card">
            <div className="row-h">
              <h2 id="cp-title">Companion profiles</h2>
              <Link to="/dashboard/companion/new" className="x-btn primary sm" data-testid="add-profile-btn">{I.plus}Add profile</Link>
            </div>
            {profiles.length > 0 && (
              <>
                <div className="acr-list" data-testid="agency-profiles-table">
                  <div className="acr hd" aria-hidden="true"><span>Profile</span><span>Description</span><span>Plan</span><span>Status</span><span className="r">Actions</span></div>
                  {profiles.map((p) => <CompanionRow key={p.provider_id} p={p} tier={tier} onPlan={onPlan} onVerify={onVerify} onDelete={setDelFor} />)}
                </div>
                <div className="cart" data-testid="cart">
                  <span className="cl">
                    <b>{queued.length ? `${queued.length} plan${queued.length === 1 ? '' : 's'} selected` : 'No plans selected'}</b>
                    <span>{queued.length ? queued.map((p) => `${p.display_name} €${cost(p.pending_plan, tier)}`).join(' · ') : 'Pick a plan for one or more profiles above.'}</span>
                    <span className="tn">{tierNote(liveN + queued.length)}</span>
                  </span>
                  <span className="cr">
                    <span className="tot"><span>Total</span><b>€{total}</b></span>
                    <button type="button" className="x-btn primary" aria-disabled={queued.length ? 'false' : 'true'} disabled={paying || !queued.length} onClick={pay} data-testid="pay-btn">{paying ? 'Opening payment…' : 'Activate here'}</button>
                  </span>
                </div>
              </>
            )}
          </section>

          <div className="row-h adrow" data-adopen={defOpenM ? 'true' : 'false'}>
            <span className="adt" onClick={() => setDefOpenM((o) => !o)} role="presentation">
              <h2>Agency defaults</h2>
              <span>The starting point for every new companion profile.</span>
            </span>
            {profiles.length > 0 && <button type="button" className="x-btn ghostc sm" onClick={() => setAskSync(true)} data-testid="sync-defaults">{I.sync}Sync defaults to all profiles</button>}
            <button type="button" className="adchev" aria-expanded={defOpenM} aria-label={defOpenM ? 'Hide agency defaults' : 'Show agency defaults'} onClick={() => setDefOpenM((o) => !o)}>{Ico.chev}</button>
          </div>

          <div className={`adsecs${defOpenM ? ' mopen' : ''}`}>
            <SectionCard num={1} title="Basic info" meta="Agency name, location, phone and description" editHref="/dashboard/defaults/basic" editLabel="Edit default Basic info" open={!!openDef[0]} onToggle={() => toggle(0)} testId="def-basic">
              <dl className="g2 dkv">{info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
              <div className="ess"><span className="ey">Agency description</span><p>{d.bio || 'Add a short description of your agency.'}</p></div>
            </SectionCard>
            <SectionCard num={2} title="Services" meta={hasSvc ? 'Default services for every new companion profile' : 'No default services yet'} editHref="/dashboard/defaults/services" editLabel="Edit default Services" open={!!openDef[1]} onToggle={() => toggle(1)} testId="def-services">
              <ServicesBody data={d} ratePhrase="the rate" />
            </SectionCard>
            <SectionCard num={3} title="Availability" meta={hasAvail ? `${d.available247 ? '24/7' : `${sum.activeDays} of 7 days`} · ${typeLbl}` : 'No default availability yet'} editHref="/dashboard/defaults/availability" editLabel="Edit default Availability" open={!!openDef[2]} onToggle={() => toggle(2)} testId="def-availability">
              <AvailabilityBody data={d} />
            </SectionCard>
            <SectionCard num={4} title="Rates" meta={hasRates ? `From ${sym}${sum.fromRate} / hour` : 'No default rates yet'} editHref="/dashboard/defaults/rates" editLabel="Edit default Rates" open={!!openDef[3]} onToggle={() => toggle(3)} testId="def-rates">
              <RatesBody data={d} foot=" · each companion can change her own rates" />
            </SectionCard>
          </div>

          <DangerZone
            onRemove={removeAgency} label="Delete agency profile" button="Delete agency profile"
            confirmTitle="Delete agency permanently?" confirmLabel="Delete permanently"
            text="This permanently deletes your agency, all companion profiles, photos and subscriptions. This can’t be undone."
          />
        </div>
      </div>

      <VerificationModal open={!!verifyFor} providerId={verifyFor?.provider_id} onClose={() => setVerifyFor(null)} onSubmitted={reload} />
      {verInfo && (
        <Dialog title={verInfo.verified ? `${verInfo.display_name} is verified` : 'Verification pending'} onClose={() => setVerInfo(null)}
          footer={<button type="button" className="x-btn primary" onClick={() => setVerInfo(null)}>OK</button>}>
          <p className="dtext">{verInfo.verified ? `${verInfo.display_name}’s ID was checked. Her profile shows the Verified badge.` : `We’re checking ${verInfo.display_name}’s ID documents, usually within 24 hours.`}</p>
        </Dialog>
      )}
      {delFor && (
        <Dialog title={`Delete ${delFor.display_name}?`} danger onClose={() => setDelFor(null)}
          footer={<><button type="button" className="x-btn white" onClick={() => setDelFor(null)}>Cancel</button><button type="button" className="x-btn dangerb" disabled={busy} onClick={removeCompanion} data-testid="confirm-delete">{busy ? 'Deleting…' : 'Delete permanently'}</button></>}>
          <p className="dtext">This permanently deletes {delFor.display_name}’s profile, photos and verification documents. Your agency and other companion profiles are not affected. This can’t be undone.</p>
        </Dialog>
      )}
      {askSync && (
        <Dialog title="Sync defaults to all profiles?" onClose={() => setAskSync(false)}
          footer={<><button type="button" className="x-btn white" onClick={() => setAskSync(false)}>Cancel</button><button type="button" className="x-btn primary" disabled={busy} onClick={sync} data-testid="confirm-sync">{busy ? 'Syncing…' : 'Sync to all profiles'}</button></>}>
          <p className="dtext">This copies your default services, availability and rates to every companion profile and overwrites what’s there. Names, photos and descriptions are not changed.</p>
        </Dialog>
      )}
    </LightPage>
  );
}
