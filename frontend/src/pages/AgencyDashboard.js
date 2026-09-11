import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { notifyError, notifyProblem } from '../lib/notify';
import {
  Plus, PencilSimple, Trash, CheckCircle, Crown, ChatCircle, Users, ArrowRight,
  ShieldCheck, Gear, ArrowsClockwise, User, FileText, CurrencyDollar, Clock
} from 'phosphor-react';
import {
  getAgencyProfiles, getAgencyProfile, deleteProviderProfile, setProfilePlan, createBulkCheckout, syncAgencyDefaults, deleteAgencyProfile
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import SiteHeader from '@/components/SiteHeader';
import AgencyOnboarding from '@/pages/AgencyOnboarding';
import VerificationModal from '@/components/VerificationModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { currencySymbol } from '@/constants/companionData';

const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const EDIT_BTN = 'inline-flex items-center gap-1.5 text-xs uppercase tracking-wider px-3 py-1.5 border border-[#832161] text-[#832161] hover:bg-[#832161]/10 rounded transition-colors';

// Agency per-profile plan catalogue (mirrors backend PLANS allowlist)
const FEATURED = {
  agency_featured_2w: { label: '2 weeks · €30', price: 30, vip: 'vip_2w' },
  agency_featured_4w: { label: '4 weeks · €50', price: 50, vip: 'vip_4w' }
};
const VIP_PRICE = { vip_2w: 15, vip_4w: 25 };

const planCost = (pp) => {
  if (!pp || !pp.featured_plan) return 0;
  return (FEATURED[pp.featured_plan]?.price || 0) + (pp.vip_plan ? (VIP_PRICE[pp.vip_plan] || 0) : 0);
};

const StatusPill = ({ profile }) => (
  profile.featured_active ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#22C55E]/10 text-[#15803D]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Live
    </span>
  ) : profile.in_grace ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#B45309]" title="Listing expired — still visible during the grace period" data-testid={`grace-pill-${profile.provider_id}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Renew · {Math.ceil(profile.grace_days_left)}d left
    </span>
  ) : profile.pending_plan ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#DA4167]/10 text-[#DA4167]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#DA4167]" /> Ready to pay
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#832161]/10 text-[#832161]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#832161]" /> Draft
    </span>
  )
);

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
    const vip_plan = featured_plan && vip_on ? FEATURED[featured_plan]?.vip : null;
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
  const totalUnread = profiles.reduce((s, p) => s + (p.unread_enquiries || 0), 0);
  const queued = profiles.filter((p) => p.pending_plan && p.pending_plan.featured_plan);
  const payableTotal = queued.reduce((s, p) => s + planCost(p.pending_plan), 0);

  // ----- Agency master-profile defaults (from the setup wizard) -----
  const svc = agency.default_services || {};
  const svcEntries = Object.entries(svc).filter(([, v]) => v && v.type);
  const inclusiveSvc = svcEntries.filter(([, v]) => v.type === 'inclusive');
  const extraSvc = svcEntries.filter(([, v]) => v.type === 'extra');
  const rates = agency.default_rates || {};
  const sym = currencySymbol(rates.currency);
  const avail = agency.default_availability || {};
  const schedule = avail.schedule || {};
  const scheduleDays = Object.entries(schedule);
  const availableDays = scheduleDays.filter(([, s]) => s?.available).length;

  return (
    <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
      <SiteHeader />
      <div className="pt-32 pb-40 section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10" data-testid="agency-header">
            <div>
              <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-3">Agency Dashboard</p>
              <h2 className="text-4xl md:text-5xl text-[#000000] mb-3">{agency.agency_name || user?.name}</h2>
              <p className="text-[#898989] text-sm">Add a profile for each companion, choose a plan, then pay for all at once.</p>
            </div>
            <button onClick={() => navigate('/dashboard/profile/new')} className="btn-primary flex items-center gap-2 whitespace-nowrap" data-testid="add-profile-btn">
              <Plus size={18} weight="bold" /> Add profile
            </button>
          </motion.div>

          {/* Agency action bar */}
          <div className="flex flex-wrap items-center gap-3 mb-8" data-testid="agency-actions">
            <button
              onClick={() => openEdit(1)}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 border border-[#dbdadd] text-[#000000] hover:border-[#832161] hover:text-[#832161] rounded-lg transition-colors"
              data-testid="agency-settings-btn"
            >
              <Gear size={16} /> Agency settings
            </button>
            <button
              onClick={handleSyncDefaults}
              disabled={syncing}
              className="inline-flex items-center gap-2 text-sm px-4 py-2 border border-[#dbdadd] text-[#000000] hover:border-[#DA4167] hover:text-[#DA4167] rounded-lg transition-colors disabled:opacity-50"
              data-testid="sync-defaults-btn"
            >
              <ArrowsClockwise size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing…' : 'Sync defaults to all'}
            </button>
          </div>

          {/* Agency profile & defaults — Basic info / Services / Rates / Availability */}
          <div className="mb-10" data-testid="agency-profile-summary">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-[#000000] font-medium">Agency profile &amp; defaults</h3>
              <span className="text-xs text-[#898989]">Used as the starting point for every new companion profile</span>
            </div>
            <div className="flex flex-col gap-6">
              {/* Basic Information */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="agency-card-basic-info">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center"><User size={18} className="text-[#832161]" /></div>
                    <h3 className="text-xl font-bold text-[#000000]">Basic Information</h3>
                  </div>
                  <button onClick={() => openEdit(1)} className={EDIT_BTN} data-testid="agency-edit-basic-info-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                <dl className="space-y-3 text-sm">
                  <div className="text-[#000000]"><dt className="inline font-semibold">Agency name</dt><dd className="inline">: {agency.agency_name || '—'}</dd></div>
                  <div className="text-[#000000]"><dt className="inline font-semibold">Location</dt><dd className="inline">: {agency.location?.city ? `${agency.location.city}, ${agency.location.country || ''}` : '—'}</dd></div>
                  <div className="text-[#000000]"><dt className="inline font-semibold">Languages</dt><dd className="inline">: {(agency.languages || []).join(', ') || '—'}</dd></div>
                  <div className="pt-2 border-t border-[#dbdadd]">
                    <dt className="text-[#000000] font-semibold mb-2">Description</dt>
                    <dd className="text-[#000000] line-clamp-3 leading-relaxed">{agency.description || <span className="text-[#898989] italic">Not set</span>}</dd>
                  </div>
                </dl>
              </div>

              {/* Services */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="agency-card-services">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center"><FileText size={18} className="text-[#832161]" /></div>
                    <h3 className="text-xl font-bold text-[#000000]">Services</h3>
                  </div>
                  <button onClick={() => openEdit(2)} className={EDIT_BTN} data-testid="agency-edit-services-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                {svcEntries.length === 0 ? (
                  <p className="text-[#898989] text-sm italic">No services set</p>
                ) : (
                  <div>
                    {inclusiveSvc.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#832161] mb-2">Inclusive ({inclusiveSvc.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {inclusiveSvc.slice(0, 10).map(([name]) => (<span key={name} className="px-3 py-1 text-xs border border-[#dbdadd] text-[#000000] rounded-full">{name}</span>))}
                          {inclusiveSvc.length > 10 && <span className="px-3 py-1 text-xs text-[#000000]">+{inclusiveSvc.length - 10} more</span>}
                        </div>
                      </div>
                    )}
                    {extraSvc.length > 0 && (
                      <div className={inclusiveSvc.length > 0 ? 'mt-10' : ''}>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#832161] mb-2">Extra ({extraSvc.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {extraSvc.slice(0, 8).map(([name, v]) => (<span key={name} className="px-3 py-1 text-xs border border-[#832161]/40 bg-[#832161]/10 text-[#832161] rounded-full">{name}{v.price && ` · €${v.price}`}</span>))}
                          {extraSvc.length > 8 && <span className="px-3 py-1 text-xs text-[#000000]">+{extraSvc.length - 8} more</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rates */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="agency-card-rates">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center"><CurrencyDollar size={18} className="text-[#832161]" /></div>
                    <h3 className="text-xl font-bold text-[#000000]">Rates</h3>
                  </div>
                  <button onClick={() => openEdit(3)} className={EDIT_BTN} data-testid="agency-edit-rates-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['incall', 'outcall'].map((kind) => {
                    const col = rates[kind] || {};
                    const extras = (Array.isArray(col.extras) ? col.extras : []).slice().sort((a, b) => (Number(a.hours) || 0) - (Number(b.hours) || 0));
                    return (
                      <div key={kind}>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#832161] mb-3">{kind}</p>
                        <div className="space-y-2">
                          {[{ key: '1hour', label: '1 hour' }, { key: '2hours', label: '2 hours' }, { key: '3hours', label: '3 hours' }].map(({ key, label }) => (
                            <div key={key} className="flex items-center justify-between border-b border-[#dbdadd] pb-2">
                              <span className="text-[#000000] text-sm">{label}</span>
                              <span className="text-[#832161]">{col[key] ? `${sym}${col[key]}` : <span className="text-[#898989] text-sm italic">Not set</span>}</span>
                            </div>
                          ))}
                          {extras.map((extra, i) => (
                            <div key={`e-${i}`} className="flex items-center justify-between border-b border-[#dbdadd] pb-2">
                              <span className="text-[#000000] text-sm">{extra.hours} hours</span>
                              <span className="text-[#832161]">{extra.price ? `${sym}${extra.price}` : <span className="text-[#898989] text-sm italic">Not set</span>}</span>
                            </div>
                          ))}
                          {col.overnight !== undefined && col.overnight !== '' && (
                            <div className="flex items-center justify-between border-b border-[#dbdadd] pb-2">
                              <span className="text-[#000000] text-sm">Overnight</span>
                              <span className="text-[#832161]">{sym}{col.overnight}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Availability */}
              <div className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="agency-card-availability">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-[#dbdadd] flex items-center justify-center"><Clock size={18} className="text-[#832161]" /></div>
                    <div>
                      <h3 className="text-xl font-bold text-[#000000]">Availability</h3>
                      <p className="text-[#000000] text-xs mt-1">{availableDays} of 7 days available</p>
                    </div>
                  </div>
                  <button onClick={() => openEdit(3)} className={EDIT_BTN} data-testid="agency-edit-availability-btn"><PencilSimple size={14} /> Edit</button>
                </div>
                {scheduleDays.length === 0 ? (
                  <p className="text-[#898989] text-sm italic">No availability set</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                    {scheduleDays.map(([day, sched]) => (
                      <div key={day} className={`border p-3 text-center transition-colors ${sched?.available ? 'border-[#832161]/40 bg-[#832161]/5' : 'border-[#dbdadd] opacity-50'}`}>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#000000] mb-2">{DAY_LABELS[day] || day.slice(0, 3)}</p>
                        {sched?.available ? (<><p className="text-[#000000] text-sm">{sched.start}</p><p className="text-[#000000] text-xs">to</p><p className="text-[#000000] text-sm">{sched.end}</p></>) : (<p className="text-[#000000] text-xs italic">Closed</p>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Companion profiles */}
          <h3 className="text-lg text-[#000000] font-medium mb-4" data-testid="companion-profiles-heading">Companion profiles</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-lg border border-[#dbdadd] bg-white p-5 flex items-center gap-4" data-testid="stat-total">
              <div className="w-11 h-11 rounded-full bg-[#832161]/10 flex items-center justify-center"><Users size={20} className="text-[#832161]" /></div>
              <div><p className="text-2xl font-bold text-[#000000]">{profiles.length}</p><p className="text-xs text-[#898989] uppercase tracking-wider">Total profiles</p></div>
            </div>
            <div className="rounded-lg border border-[#dbdadd] bg-white p-5 flex items-center gap-4" data-testid="stat-live">
              <div className="w-11 h-11 rounded-full bg-[#22C55E]/10 flex items-center justify-center"><Crown size={20} className="text-[#22C55E]" /></div>
              <div><p className="text-2xl font-bold text-[#000000]">{activeCount}</p><p className="text-xs text-[#898989] uppercase tracking-wider">Live on Browse</p></div>
            </div>
            <div className="rounded-lg border border-[#dbdadd] bg-white p-5 flex items-center gap-4" data-testid="stat-enquiries">
              <div className="w-11 h-11 rounded-full bg-[#DA4167]/10 flex items-center justify-center"><ChatCircle size={20} className="text-[#DA4167]" /></div>
              <div><p className="text-2xl font-bold text-[#000000]">{totalUnread}</p><p className="text-xs text-[#898989] uppercase tracking-wider">Unread enquiries</p></div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-[#dbdadd] bg-white overflow-hidden" data-testid="agency-profiles-table">
            {profiles.length === 0 ? (
              <div className="p-12 text-center" data-testid="agency-empty-state">
                <div className="w-14 h-14 rounded-full bg-[#832161]/10 flex items-center justify-center mx-auto mb-4"><Users size={26} className="text-[#832161]" /></div>
                <h3 className="text-lg font-bold text-[#000000] mb-2">No profiles yet</h3>
                <p className="text-sm text-[#898989] mb-6 max-w-md mx-auto">Add your first companion profile. It inherits your agency defaults, and you can tailor it individually.</p>
                <button onClick={() => navigate('/dashboard/profile/new')} className="btn-primary inline-flex items-center gap-2" data-testid="add-first-profile-btn">
                  <Plus size={18} weight="bold" /> Add your first profile
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#dbdadd] bg-[#F0EFF4]/60">
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium">Profile</th>
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium hidden lg:table-cell">Description</th>
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium">Plan</th>
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium">Status</th>
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => {
                      const pp = p.pending_plan || {};
                      return (
                      <tr key={p.provider_id} className="border-b border-[#dbdadd] last:border-0 hover:bg-[#F0EFF4]/40 transition-colors" data-testid={`agency-profile-row-${p.provider_id}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#000000]">{p.display_name}</p>
                            {p.verified && <CheckCircle size={14} weight="fill" className="text-[#22C55E]" />}
                            {p.unread_enquiries > 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#DA4167] text-white rounded-full">{p.unread_enquiries}</span>}
                          </div>
                          <div className="lg:hidden mt-1 text-xs text-[#898989] line-clamp-1 max-w-xs">{p.bio || '—'}</div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell"><p className="text-sm text-[#898989] line-clamp-1 max-w-xs">{p.bio || '—'}</p></td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-2">
                            <select
                              value={pp.featured_plan || ''}
                              onChange={(e) => changePlan(p, e.target.value, !!pp.vip_plan)}
                              className="input-premium !py-2 text-sm min-w-[150px]"
                              data-testid={`plan-select-${p.provider_id}`}
                            >
                              <option value="">No plan</option>
                              <option value="agency_featured_2w">Featured · 2 weeks · €30</option>
                              <option value="agency_featured_4w">Featured · 4 weeks · €50</option>
                            </select>
                            {pp.featured_plan && (
                              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#000000]">
                                <input
                                  type="checkbox"
                                  checked={!!pp.vip_plan}
                                  onChange={(e) => changePlan(p, pp.featured_plan, e.target.checked)}
                                  className="w-4 h-4 rounded border-[#dbdadd] checked:bg-[#832161] checked:border-[#832161]"
                                  data-testid={`vip-toggle-${p.provider_id}`}
                                />
                                <Crown size={13} className="text-[#832161]" /> VIP Boost (+€{FEATURED[pp.featured_plan]?.vip === 'vip_4w' ? 25 : 15})
                              </label>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4"><StatusPill profile={p} /></td>
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center justify-end gap-1">
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
                              className="p-1.5 rounded transition-colors hover:bg-black/5 text-[#000000]"
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
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Delete agency */}
          <div className="mt-12 flex justify-center" data-testid="agency-danger-zone">
            <button
              onClick={() => setConfirmAgencyDelete(true)}
              disabled={deletingAgency}
              className="inline-flex items-center gap-2 px-6 py-3 border border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C]/10 transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
              data-testid="delete-agency-profile-btn"
            >
              <Trash size={16} /> {deletingAgency ? 'Deleting…' : 'Delete Agency Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Finish & Pay bar */}
      {queued.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#dbdadd] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" data-testid="finish-pay-bar">
          <div className="max-w-6xl mx-auto section-padding py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[#000000] font-medium">{queued.length} profile{queued.length === 1 ? '' : 's'} ready to publish</p>
              <p className="text-sm text-[#898989]">Total due: <span className="font-bold text-[#832161]">€{payableTotal}</span></p>
            </div>
            <button onClick={handleFinishPay} disabled={paying} className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50" data-testid="finish-pay-btn">
              {paying ? 'Redirecting…' : (<>Finish &amp; pay €{payableTotal} <ArrowRight size={18} /></>)}
            </button>
          </div>
        </div>
      )}
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
