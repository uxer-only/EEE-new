import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { notifyError, notifyProblem } from '../lib/notify';
import {
  Plus, PencilSimple, Trash, Crown, ChatCircle, Users,
  ShieldCheck, Gear, ArrowsClockwise, User, CaretDown
} from 'phosphor-react';
import {
  getAgencyProfiles, getAgencyProfile, deleteProviderProfile, setProfilePlan, createBulkCheckout, syncAgencyDefaults, deleteAgencyProfile
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import SiteHeader from '@/components/SiteHeader';
import AgencyOnboarding from '@/pages/AgencyOnboarding';
import VerificationModal from '@/components/VerificationModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { currencySymbol } from '@/constants/companionData';

const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const CARD = 'bg-white border border-[#ECE8EF] rounded-2xl shadow-[0_6px_20px_rgba(52,24,60,0.06)]';
const EDIT_BTN = 'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E2DEE8] bg-white text-sm font-semibold text-[#1B1820] hover:border-[#7A2357] hover:text-[#7A2357] transition-colors';
const GHOST_BTN = 'inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#E2DEE8] bg-white text-[#1B1820] hover:border-[#7A2357] hover:text-[#7A2357] transition-colors';
const WINE_BTN = 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7A2357] text-white text-sm font-semibold hover:bg-[#631c47] transition-colors whitespace-nowrap';

// Agency volume-tiered plans (mirrors backend AGENCY_PLANS). t1 = 3–6 selected profiles, t2 = 7+ (discounted).
const AGENCY_PLANS = [
  { key: 'agency_7d',  label: '7 days',   vip: 'agency_vip_7d',  price: { t1: 25, t2: 20 } },
  { key: 'agency_15d', label: '15 days',  vip: 'agency_vip_15d', price: { t1: 45, t2: 35 } },
  { key: 'agency_1m',  label: '1 month',  vip: 'agency_vip_1m',  price: { t1: 80, t2: 65 } },
  { key: 'agency_3m',  label: '3 months', vip: 'agency_vip_3m',  price: { t1: 220, t2: 180 } },
];
const AGENCY_PLAN_MAP = Object.fromEntries(AGENCY_PLANS.map((p) => [p.key, p]));
const VIP_PRICE = {
  agency_vip_7d:  { t1: 10, t2: 8 },
  agency_vip_15d: { t1: 15, t2: 12 },
  agency_vip_1m:  { t1: 25, t2: 20 },
  agency_vip_3m:  { t1: 60, t2: 48 },
};
const AGENCY_TIER_THRESHOLD = 7;
const tierFor = (selectedCount) => (selectedCount >= AGENCY_TIER_THRESHOLD ? 't2' : 't1');

const planCost = (pp, tier) => {
  if (!pp || !pp.featured_plan) return 0;
  const f = AGENCY_PLAN_MAP[pp.featured_plan];
  const base = f ? (f.price[tier] || 0) : 0;
  const vip = pp.vip_plan && VIP_PRICE[pp.vip_plan] ? (VIP_PRICE[pp.vip_plan][tier] || 0) : 0;
  return base + vip;
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); } catch { return ''; }
};

const Avatar = ({ photo }) => (
  photo ? (
    <img src={photo} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
  ) : (
    <div className="w-14 h-14 rounded-xl bg-[#EFEAF2] flex items-center justify-center flex-shrink-0"><User size={24} className="text-[#B9AEC4]" /></div>
  )
);

const StatusPill = ({ profile: p }) => {
  const base = 'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap';
  if (p.featured_active) {
    return <span className={`${base} bg-[#E6F4EA] text-[#15803D]`} data-testid={`status-${p.provider_id}`}><span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Live · {Math.max(0, Math.round(p.featured_days_left))} days left</span>;
  }
  if (p.in_grace) {
    return <span className={`${base} bg-[#FDF3E3] text-[#B45309]`} data-testid={`status-${p.provider_id}`}><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Renew · {Math.ceil(p.grace_days_left)} days left</span>;
  }
  if (p.pending_plan && p.pending_plan.featured_plan) {
    return <span className={`${base} bg-[#F7E9F1] text-[#7A2357]`} data-testid={`status-${p.provider_id}`}><span className="w-1.5 h-1.5 rounded-full bg-[#7A2357]" /> Ready to go live</span>;
  }
  if (p.featured_until) {
    return <span className={`${base} bg-[#FBE9ED] text-[#A3243B]`} data-testid={`status-${p.provider_id}`}><span className="w-1.5 h-1.5 rounded-full bg-[#A3243B]" /> Expired {fmtDate(p.featured_until)}</span>;
  }
  const steps = (p.completed_steps != null && p.completed_steps < (p.total_steps || 5)) ? ` · ${p.completed_steps} of ${p.total_steps} steps` : '';
  return <span className={`${base} bg-[#F0EEF3] text-[#6B6673]`} data-testid={`status-${p.provider_id}`}><span className="w-1.5 h-1.5 rounded-full bg-[#9A93A3]" /> Draft{steps}</span>;
};

export default function AgencyDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [agency, setAgency] = useState(null);       // null=loading, {onboarded}
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editStep, setEditStep] = useState(1);
  const [verifyFor, setVerifyFor] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [deletingAgency, setDeletingAgency] = useState(false);
  const [confirmAgencyDelete, setConfirmAgencyDelete] = useState(false);

  const handleDeleteAgency = async () => {
    setDeletingAgency(true);
    try {
      await deleteAgencyProfile();
      toast.success('Agency profile deleted');
      logout();
    } catch (e) {
      notifyError(e, "We couldn't delete your agency profile.");
      setDeletingAgency(false);
    }
  };

  const loadRoster = async () => {
    const { data } = await getAgencyProfiles();
    setProfiles(data.profiles || []);
  };

  const load = async () => {
    try {
      const { data: ag } = await getAgencyProfile();
      setAgency(ag);
      if (ag.onboarded) await loadRoster();
    } catch (e) {
      notifyError(e, "We couldn't load your agency dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (profile) => {
    if (!window.confirm(`Delete "${profile.display_name}"? This permanently removes the profile and cannot be undone.`)) return;
    setDeletingId(profile.provider_id);
    try {
      await deleteProviderProfile(profile.provider_id);
      setProfiles((prev) => prev.filter((p) => p.provider_id !== profile.provider_id));
      toast.success('Profile removed');
    } catch (e) {
      notifyError(e, "We couldn't delete this profile.");
    } finally {
      setDeletingId(null);
    }
  };

  const changePlan = async (profile, featured_plan, vip_on) => {
    const vip_plan = featured_plan && vip_on ? (AGENCY_PLAN_MAP[featured_plan]?.vip || null) : null;
    const pending = featured_plan ? { featured_plan, vip_plan } : null;
    // optimistic
    setProfiles((prev) => prev.map((p) => p.provider_id === profile.provider_id ? { ...p, pending_plan: pending } : p));
    try {
      await setProfilePlan(profile.provider_id, { featured_plan: featured_plan || null, vip_plan });
    } catch (e) {
      notifyError(e, "We couldn't update this plan.");
      loadRoster();
    }
  };

  const handleFinishPay = async () => {
    if (user && user.email_verified === false) {
      notifyProblem('Please confirm your email first.', 'Check your inbox for the confirmation link — you can resend it from the banner at the top of your dashboard.');
      return;
    }
    setPaying(true);
    try {
      const { data } = await createBulkCheckout({ origin_url: window.location.origin });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        notifyProblem("We couldn't start checkout.", 'Please try again in a moment.');
        setPaying(false);
      }
    } catch (e) {
      notifyError(e, "We couldn't start checkout.");
      setPaying(false);
    }
  };

  const handleSyncDefaults = async () => {
    if (!window.confirm('Push your agency default services, rates and availability to ALL profiles?\n\nThis overwrites those sections on every profile. Individual photos, names and bios are not affected.')) return;
    setSyncing(true);
    try {
      const { data } = await syncAgencyDefaults();
      toast.success(data.updated > 0
        ? `Defaults applied to ${data.updated} profile${data.updated === 1 ? '' : 's'}`
        : 'All profiles already match your defaults');
      loadRoster();
    } catch (e) {
      notifyError(e, "We couldn't sync your defaults.");
    } finally {
      setSyncing(false);
    }
  };

  if (loading || agency === null) {
    return (
      <div className="min-h-screen bg-[#F0EFF4] dashboard-light flex items-center justify-center">
        <div className="shimmer w-14 h-14 rounded-full" />
      </div>
    );
  }

  // Onboarding gate — show the agency setup wizard first
  if (!agency.onboarded) {
    return <AgencyOnboarding onDone={() => { setLoading(true); load(); }} />;
  }

  // Editing agency defaults (re-uses the wizard, prefilled)
  if (editing) {
    return <AgencyOnboarding initial={agency} initialStep={editStep} onDone={() => { setEditing(false); setLoading(true); load(); }} />;
  }

  const openEdit = (stepNo) => { setEditStep(stepNo); setEditing(true); };

  const activeCount = profiles.filter((p) => p.featured_active || p.in_grace).length;
  const liveCount = profiles.filter((p) => p.featured_active).length;
  const totalUnread = profiles.reduce((s, p) => s + (p.unread_enquiries || 0), 0);
  const queued = profiles.filter((p) => p.pending_plan && p.pending_plan.featured_plan);
  const tier = tierFor(queued.length);
  const payableTotal = queued.reduce((s, p) => s + planCost(p.pending_plan, tier), 0);

  // ----- Agency master-profile defaults (from the setup wizard) -----
  const svc = agency.default_services || {};
  const svcEntries = Object.entries(svc).filter(([, v]) => v && v.type);
  const inclusiveSvc = svcEntries.filter(([, v]) => v.type === 'inclusive');
  const extraSvc = svcEntries.filter(([, v]) => v.type === 'extra');
  const rates = agency.default_rates || {};
  const sym = currencySymbol(rates.currency);
  const hasAnyRate = ['incall', 'outcall'].some((k) => {
    const col = rates[k] || {};
    return col['1hour'] || col['2hours'] || col['3hours'] || col.overnight ||
      (Array.isArray(col.extras) && col.extras.some((e) => e.price));
  });
  const avail = agency.default_availability || {};
  const schedule = avail.schedule || {};
  const scheduleDays = Object.entries(schedule);
  const availableDays = scheduleDays.filter(([, s]) => s?.available).length;

  const stats = [
    { Icon: Users, bg: 'bg-[#F3E6EF]', fg: 'text-[#7A2357]', value: profiles.length, label: 'Companion profiles', testid: 'stat-total' },
    { Icon: Crown, bg: 'bg-[#E6F4EA]', fg: 'text-[#15803D]', value: activeCount, label: 'Live on Browse', testid: 'stat-live' },
    { Icon: ChatCircle, bg: 'bg-[#FBEAEF]', fg: 'text-[#A3243B]', value: totalUnread, label: 'Unread enquiries', testid: 'stat-enquiries' },
  ];

  const locationStr = agency.location?.city ? `${agency.location.city}${agency.location.country ? `, ${agency.location.country}` : ''}` : '—';

  return (
    <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
      <SiteHeader />
      <div className="pt-32 pb-40 section-padding">
        <div className="max-w-5xl mx-auto flex flex-col">
          <EmailVerificationBanner user={user} />

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8" data-testid="agency-header">
            <div>
              <p className="text-[#7A2357] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Agency Dashboard</p>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1B1820] mb-2">{agency.agency_name || user?.name}</h2>
              <p className="text-[#8E8597] text-sm">Add a profile for each companion, choose a plan, then pay for all at once.</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => openEdit(1)} className={GHOST_BTN} data-testid="agency-settings-btn">
                <Gear size={18} /> Agency settings
              </button>
            </div>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {stats.map(({ Icon, bg, fg, value, label, testid }) => (
              <div key={testid} className={`${CARD} p-5 flex items-center gap-4`} data-testid={testid}>
                <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}><Icon size={20} weight="fill" className={fg} /></div>
                <div>
                  <p className="text-2xl font-bold text-[#1B1820] leading-none">{value}</p>
                  <p className="text-sm text-[#8E8597] mt-1.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Companion profiles */}
          <div className={`${CARD} p-6 md:p-8 mb-10`} data-testid="companion-profiles-card">
            <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 ${profiles.length === 0 ? '' : 'mb-6'}`}>
              <div>
                <h3 className="text-xl font-bold text-[#1B1820]" data-testid="companion-profiles-heading">Companion profiles</h3>
                <p className="text-sm text-[#8E8597] mt-1">{profiles.length === 0 ? 'No profiles yet' : `${profiles.length} profile${profiles.length === 1 ? '' : 's'} · ${liveCount} live · choose a plan per profile and pay for all at once`}</p>
              </div>
              <button onClick={() => navigate('/dashboard/profile/new')} className={WINE_BTN} data-testid="add-profile-btn">
                <Plus size={18} weight="bold" /> Add profile
              </button>
            </div>

            {profiles.length > 0 && (
              <div data-testid="agency-profiles-table">
                {/* Column header */}
                <div className="hidden md:grid md:grid-cols-[2.5fr_3fr_3fr_2.5fr_1fr] gap-4 bg-[#F4F1F7] rounded-lg px-5 py-3 mb-3">
                  <div className="text-[11px] uppercase tracking-wider text-[#8E8597] font-semibold">Profile</div>
                  <div className="text-[11px] uppercase tracking-wider text-[#8E8597] font-semibold">Description</div>
                  <div className="text-[11px] uppercase tracking-wider text-[#8E8597] font-semibold">Plan</div>
                  <div className="text-[11px] uppercase tracking-wider text-[#8E8597] font-semibold">Status</div>
                  <div className="text-[11px] uppercase tracking-wider text-[#8E8597] font-semibold text-right">Actions</div>
                </div>

                {/* Rows */}
                <div className="flex flex-col gap-3">
                  {profiles.map((p) => {
                    const pp = p.pending_plan || {};
                    const selected = !!pp.featured_plan;
                    const showDropdown = !p.featured_active && p.plan_selectable;
                    return (
                      <div
                        key={p.provider_id}
                        className={`rounded-xl bg-white px-4 md:px-5 py-4 transition-colors ${selected ? 'border border-l-4 border-[#7A2357]' : 'border border-[#ECE8EF]'}`}
                        data-testid={`agency-profile-row-${p.provider_id}`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-[2.5fr_3fr_3fr_2.5fr_1fr] gap-4 items-start">
                          {/* Profile */}
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar photo={p.photo} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-[#1B1820] truncate">{p.display_name}</p>
                                {p.unread_enquiries > 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#A3243B] text-white rounded-full flex-shrink-0">{p.unread_enquiries}</span>}
                              </div>
                              <p className="text-sm text-[#8E8597]">{[p.age, p.city].filter(Boolean).join(' · ') || '—'}</p>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="md:pt-0.5">
                            <p className="text-sm text-[#5F5966] line-clamp-2">{p.bio || <span className="italic text-[#A79FB0]">New profile — description not added yet.</span>}</p>
                          </div>

                          {/* Plan */}
                          <div>
                            {p.featured_active ? (
                              <div>
                                <p className="text-sm font-semibold text-[#1B1820]">{p.active_plan_label || 'Featured'}</p>
                                <p className="text-xs text-[#8E8597] mt-0.5">Until {fmtDate(p.featured_until)} · auto-renew {p.auto_renew ? 'on' : 'off'}</p>
                              </div>
                            ) : showDropdown ? (
                              <div className="flex flex-col gap-2">
                                <div className="relative">
                                  <select
                                    value={pp.featured_plan || ''}
                                    onChange={(e) => changePlan(p, e.target.value, !!pp.vip_plan)}
                                    className="w-full appearance-none bg-white border border-[#D9D2E0] rounded-lg pl-3.5 pr-9 py-2.5 text-sm text-[#1B1820] cursor-pointer focus:border-[#7A2357] focus:outline-none"
                                    data-testid={`plan-select-${p.provider_id}`}
                                  >
                                    <option value="">No plan</option>
                                    {AGENCY_PLANS.map((pl) => (
                                      <option key={pl.key} value={pl.key}>{pl.label} · €{pl.price[tier]}/pp</option>
                                    ))}
                                  </select>
                                  <CaretDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F5966] pointer-events-none" />
                                </div>
                                {pp.featured_plan && (
                                  <label className="flex items-center gap-2 cursor-pointer text-sm text-[#1B1820]">
                                    <input
                                      type="checkbox"
                                      checked={!!pp.vip_plan}
                                      onChange={(e) => changePlan(p, pp.featured_plan, e.target.checked)}
                                      className="w-4 h-4 rounded border-[#D9D2E0] accent-[#7A2357]"
                                      data-testid={`vip-toggle-${p.provider_id}`}
                                    />
                                    <Crown size={15} weight="fill" className="text-[#7A2357]" /> VIP Boost (+€{VIP_PRICE[AGENCY_PLAN_MAP[pp.featured_plan]?.vip]?.[tier] ?? 0}/pp)
                                  </label>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-[#8E8597]">Complete the profile to choose a plan</p>
                            )}
                          </div>

                          {/* Status */}
                          <div className="md:pt-0.5"><StatusPill profile={p} /></div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1 md:pt-0.5">
                            <button
                              onClick={() => setVerifyFor(p.provider_id)}
                              title={p.verified ? 'Verified' : (p.verification_status === 'submitted' ? 'Review verification' : 'Verify identity')}
                              aria-label={p.verified ? 'Verified' : 'Verify identity'}
                              className={`p-1.5 rounded transition-colors hover:bg-black/5 ${p.verified ? 'text-[#22C55E]' : 'text-[#EA580C]'}`}
                              data-testid={`verify-profile-${p.provider_id}`}
                            >
                              <ShieldCheck size={18} weight={p.verified ? 'fill' : 'regular'} />
                            </button>
                            <button
                              onClick={() => navigate(`/dashboard/profile/${p.provider_id}`)}
                              title="Edit profile"
                              aria-label="Edit profile"
                              className="p-1.5 rounded transition-colors hover:bg-black/5 text-[#1B1820]"
                              data-testid={`edit-profile-${p.provider_id}`}
                            >
                              <PencilSimple size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              disabled={deletingId === p.provider_id}
                              title="Delete profile"
                              aria-label="Delete profile"
                              className="p-1.5 rounded transition-colors hover:bg-[#B91C1C]/10 text-[#B91C1C] disabled:opacity-50"
                              data-testid={`delete-profile-${p.provider_id}`}
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pay summary */}
                {queued.length > 0 && (
                  <div className="mt-6 rounded-xl bg-[#F7F2F7] border border-[#ECE3EE] px-5 md:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4" data-testid="pay-summary-panel">
                    <div>
                      <p className="text-base font-bold text-[#1B1820]">{queued.length} plan{queued.length === 1 ? '' : 's'} selected</p>
                      <p className="text-sm text-[#8E8597] mt-0.5">{queued.map((p) => `${p.display_name} €${planCost(p.pending_plan, tier)}`).join(' · ')}</p>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wider text-[#8E8597] font-semibold">Total</p>
                        <p className="text-2xl font-bold text-[#1B1820] leading-none">€{payableTotal}</p>
                      </div>
                      <button onClick={handleFinishPay} disabled={paying} className={`${WINE_BTN} !px-6 !py-3.5`} data-testid="finish-pay-btn">
                        {paying ? 'Redirecting…' : `Pay €${payableTotal} & activate`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Agency defaults */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5" data-testid="agency-defaults-header">
            <div>
              <h3 className="text-2xl font-bold text-[#1B1820]">Agency defaults</h3>
              <p className="text-sm text-[#8E8597] mt-1">The starting point for every new companion profile.</p>
            </div>
            <button onClick={handleSyncDefaults} disabled={syncing} className={`${GHOST_BTN} disabled:opacity-50`} data-testid="sync-defaults-btn">
              <ArrowsClockwise size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync defaults to all profiles'}
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {/* Basic information */}
            <div className={`${CARD} p-6 md:p-8`} data-testid="agency-card-basic-info">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#1B1820]">Basic information</h3>
                  <p className="text-sm text-[#8E8597] mt-0.5">Agency name, location and languages</p>
                </div>
                <button onClick={() => openEdit(1)} className={EDIT_BTN} data-testid="agency-edit-basic-info-btn"><PencilSimple size={15} /> Edit</button>
              </div>
              <dl className="divide-y divide-[#F0EDF3]">
                <div className="flex items-center justify-between py-3 gap-4">
                  <dt className="text-sm text-[#5F5966]">Agency name</dt>
                  <dd className="text-sm font-semibold text-[#1B1820] text-right">{agency.agency_name || '—'}</dd>
                </div>
                <div className="flex items-center justify-between py-3 gap-4">
                  <dt className="text-sm text-[#5F5966]">Location</dt>
                  <dd className="text-sm font-semibold text-[#1B1820] text-right">{locationStr}</dd>
                </div>
                <div className="flex items-center justify-between py-3 gap-4">
                  <dt className="text-sm text-[#5F5966]">Languages</dt>
                  <dd className="text-sm font-semibold text-[#1B1820] text-right">{(agency.languages || []).join(', ') || '—'}</dd>
                </div>
              </dl>
              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#7A2357] mb-1.5">Description</p>
                <p className="text-sm text-[#1B1820] leading-relaxed">{agency.description || <span className="text-[#A79FB0] italic">Add a short description of your agency.</span>}</p>
              </div>
            </div>

            {/* Services */}
            <div className={`${CARD} p-6 md:p-8`} data-testid="agency-card-services">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#1B1820]">Services</h3>
                  <p className="text-sm text-[#8E8597] mt-0.5">Default services for new profiles</p>
                </div>
                <button onClick={() => openEdit(2)} className={EDIT_BTN} data-testid="agency-edit-services-btn"><PencilSimple size={15} /> Edit</button>
              </div>
              {svcEntries.length === 0 ? (
                <p className="text-[#A79FB0] text-sm italic">No services set yet</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {inclusiveSvc.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#7A2357] mb-3">Included in the rate · {inclusiveSvc.length}</p>
                      <div className="flex flex-wrap gap-2">
                        {inclusiveSvc.map(([name]) => (<span key={name} className="px-3 py-1.5 text-sm rounded-full bg-[#FBEEF5] text-[#7A2357] font-medium">{name}</span>))}
                      </div>
                    </div>
                  )}
                  {extraSvc.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#7A2357] mb-3">Extra · {extraSvc.length}</p>
                      <div className="flex flex-wrap gap-2">
                        {extraSvc.map(([name, v]) => (<span key={name} className="px-3 py-1.5 text-sm rounded-full border border-[#E6D6E0] bg-white text-[#7A2357] font-medium">{name}{v.price ? ` · ${sym}${v.price}` : ''}</span>))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rates */}
            <div className={`${CARD} p-6 md:p-8`} data-testid="agency-card-rates">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#1B1820]">Rates</h3>
                  <p className="text-sm text-[#8E8597] mt-0.5">{hasAnyRate ? 'Default rates for new profiles' : 'No default rates yet'}</p>
                </div>
                <button onClick={() => openEdit(3)} className={EDIT_BTN} data-testid="agency-edit-rates-btn"><PencilSimple size={15} /> Edit</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                {['incall', 'outcall'].map((kind) => {
                  const col = rates[kind] || {};
                  const extras = (Array.isArray(col.extras) ? col.extras : []).slice().sort((a, b) => (Number(a.hours) || 0) - (Number(b.hours) || 0));
                  return (
                    <div key={kind}>
                      <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[#7A2357] mb-3">{kind}</p>
                      <div className="flex flex-col">
                        {[{ key: '1hour', label: '1 hour' }, { key: '2hours', label: '2 hours' }, { key: '3hours', label: '3 hours' }].map(({ key, label }) => (
                          <div key={key} className="flex items-center justify-between border-b border-[#F0EDF3] py-2.5">
                            <span className="text-[#1B1820] text-sm">{label}</span>
                            <span className="text-sm">{col[key] ? <span className="font-semibold text-[#1B1820]">{sym}{col[key]}</span> : <span className="text-[#A79FB0] italic">Not set</span>}</span>
                          </div>
                        ))}
                        {extras.map((extra, i) => (
                          <div key={`e-${i}`} className="flex items-center justify-between border-b border-[#F0EDF3] py-2.5">
                            <span className="text-[#1B1820] text-sm">{extra.hours} hours</span>
                            <span className="text-sm">{extra.price ? <span className="font-semibold text-[#1B1820]">{sym}{extra.price}</span> : <span className="text-[#A79FB0] italic">Not set</span>}</span>
                          </div>
                        ))}
                        {col.overnight !== undefined && col.overnight !== '' && (
                          <div className="flex items-center justify-between border-b border-[#F0EDF3] py-2.5">
                            <span className="text-[#1B1820] text-sm">Overnight</span>
                            <span className="font-semibold text-[#1B1820] text-sm">{sym}{col.overnight}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Availability */}
            <div className={`${CARD} p-6 md:p-8`} data-testid="agency-card-availability">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h3 className="text-xl font-bold text-[#1B1820]">Availability</h3>
                  <p className="text-sm text-[#8E8597] mt-0.5">{availableDays} of 7 days</p>
                </div>
                <button onClick={() => openEdit(3)} className={EDIT_BTN} data-testid="agency-edit-availability-btn"><PencilSimple size={15} /> Edit</button>
              </div>
              {scheduleDays.length === 0 ? (
                <p className="text-[#A79FB0] text-sm italic">No availability set</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                  {scheduleDays.map(([day, sched]) => (
                    <div key={day} className={`rounded-xl py-3 px-2 text-center border ${sched?.available ? 'bg-[#FBEEF5] border-[#F0DCE8]' : 'bg-[#F5F4F7] border-[#ECEAF0] opacity-70'}`}>
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-[#7A2357] mb-1.5">{(DAY_LABELS[day] || day.slice(0, 3)).toUpperCase()}</p>
                      {sched?.available ? (
                        <>
                          <p className="text-[#1B1820] text-sm font-medium leading-tight">{sched.start}</p>
                          <p className="text-[#1B1820] text-sm font-medium leading-tight">{sched.end}</p>
                        </>
                      ) : (
                        <p className="text-[#8E8597] text-xs italic mt-1">Closed</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Delete agency */}
          <div className={`${CARD} p-6 md:p-8 mt-8 border-[#F0D9E0]`} data-testid="agency-danger-zone">
            <h3 className="text-lg font-bold text-[#A3243B] mb-1.5">Delete agency profile</h3>
            <p className="text-sm text-[#8E8597] mb-4">This permanently deletes your agency, all companion profiles, photos and subscriptions. This can't be undone.</p>
            <button
              onClick={() => setConfirmAgencyDelete(true)}
              disabled={deletingAgency}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#A3243B] text-[#A3243B] hover:bg-[#A3243B]/10 transition-colors text-sm font-semibold disabled:opacity-50"
              data-testid="delete-agency-profile-btn"
            >
              {deletingAgency ? 'Deleting…' : 'Delete agency profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Finish & Pay bar replaced by the inline pay summary panel inside the companion card */}
      <ConfirmDeleteModal
        open={confirmAgencyDelete}
        onClose={() => setConfirmAgencyDelete(false)}
        onConfirm={handleDeleteAgency}
        busy={deletingAgency}
        title="Delete agency profile"
        description={`This permanently removes your agency defaults and all ${profiles.length} companion profile${profiles.length === 1 ? '' : 's'}, including photos, subscriptions, enquiries and verification documents. This cannot be undone.`}
        confirmWord={agency.agency_name || 'DELETE'}
        confirmLabel="Delete agency"
      />
      {/* Per-profile verification (from the roster, no need to open the profile) */}
      <VerificationModal
        open={!!verifyFor}
        onClose={() => setVerifyFor(null)}
        onSubmitted={() => { setVerifyFor(null); loadRoster(); }}
        providerId={verifyFor}
      />
    </div>
  );
}
