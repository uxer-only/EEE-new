import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, PencilSimple, Trash, MapPin, CheckCircle, Crown, ChatCircle, Users, ArrowRight,
  ShieldCheck, Gear, ArrowsClockwise, ArrowSquareOut
} from 'phosphor-react';
import {
  getAgencyProfiles, getAgencyProfile, deleteProviderProfile, setProfilePlan, createBulkCheckout, syncAgencyDefaults
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import SiteHeader from '@/components/SiteHeader';
import AgencyOnboarding from '@/pages/AgencyOnboarding';
import VerificationModal from '@/components/VerificationModal';

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [agency, setAgency] = useState(null);       // null=loading, {onboarded}
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [verifyFor, setVerifyFor] = useState(null);
  const [syncing, setSyncing] = useState(false);

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
      toast.error('Failed to load agency dashboard');
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
      toast.error(e?.response?.data?.detail || 'Could not delete profile');
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
      toast.error('Could not update plan');
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
        toast.error('Could not start checkout');
        setPaying(false);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Checkout failed');
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
      toast.error(e?.response?.data?.detail || 'Could not sync defaults');
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
    return <AgencyOnboarding initial={agency} onDone={() => { setEditing(false); setLoading(true); load(); }} />;
  }

  const activeCount = profiles.filter((p) => p.featured_active).length;
  const totalUnread = profiles.reduce((s, p) => s + (p.unread_enquiries || 0), 0);
  const queued = profiles.filter((p) => p.pending_plan && p.pending_plan.featured_plan);
  const payableTotal = queued.reduce((s, p) => s + planCost(p.pending_plan), 0);

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
            {agency.agency_id && (
              <Link
                to={`/agency/${agency.agency_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm px-4 py-2 border border-[#832161]/40 text-[#832161] hover:bg-[#832161]/10 rounded-lg transition-colors"
                data-testid="view-agency-page-btn"
              >
                <ArrowSquareOut size={16} /> View agency page
              </Link>
            )}
            <button
              onClick={() => setEditing(true)}
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

          {/* Stat strip */}
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
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium">Location</th>
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
                          <div className="lg:hidden mt-1 text-xs text-[#898989] line-clamp-2 max-w-xs">{p.bio || '—'}</div>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell"><p className="text-sm text-[#898989] line-clamp-2 max-w-xs">{p.bio || '—'}</p></td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-sm text-[#000000]"><MapPin size={14} className="text-[#832161]" />{[p.location?.city, p.location?.country].filter(Boolean).join(', ') || '—'}</span>
                        </td>
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
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setVerifyFor(p.provider_id)} className="inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 border border-[#22C55E]/50 text-[#15803D] hover:bg-[#22C55E]/10 rounded transition-colors" data-testid={`verify-profile-${p.provider_id}`}>
                              <ShieldCheck size={14} /> {p.verified ? 'Verified' : (p.verification_status === 'submitted' ? 'Review' : 'Verify')}
                            </button>
                            <button onClick={() => navigate(`/dashboard/profile/${p.provider_id}`)} className="inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 border border-[#832161]/40 text-[#832161] hover:bg-[#832161]/10 rounded transition-colors" data-testid={`edit-profile-${p.provider_id}`}>
                              <PencilSimple size={14} /> Edit
                            </button>
                            <button onClick={() => handleDelete(p)} disabled={deletingId === p.provider_id} className="inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 border border-[#B91C1C]/40 text-[#B91C1C] hover:bg-[#B91C1C]/10 rounded transition-colors disabled:opacity-50" data-testid={`delete-profile-${p.provider_id}`}>
                              <Trash size={14} /> {deletingId === p.provider_id ? '…' : 'Delete'}
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
