import { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Buildings, Users, Prohibit, CaretLeft, CaretDown, CaretRight,
  MagnifyingGlass, Trash, CheckCircle, Path, ShieldCheck
} from 'phosphor-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getAdminAgencies, getAdminAgencyDetail, suspendAgency, deleteAgency } from '@/services/api';
import { notifyError, notifyProblem } from '../lib/notify';
import SiteHeader from '@/components/SiteHeader';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export default function AdminAgencies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);       // agency_user_id currently expanded
  const [rosters, setRosters] = useState({});           // user_id -> detail
  const [busyId, setBusyId] = useState(null);           // suspend action in-flight
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      notifyProblem('Admin access is required.', 'Sign in with an admin account to view this page.');
      navigate('/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    try {
      const { data } = await getAdminAgencies();
      setAgencies(data);
    } catch (e) {
      notifyError(e, "We couldn't load the agencies.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRoster = async (a) => {
    if (expanded === a.user_id) { setExpanded(null); return; }
    setExpanded(a.user_id);
    if (!rosters[a.user_id]) {
      try {
        const { data } = await getAdminAgencyDetail(a.user_id);
        setRosters((prev) => ({ ...prev, [a.user_id]: data }));
      } catch (e) {
        notifyError(e, "We couldn't load this agency's roster.");
      }
    }
  };

  const handleSuspend = async (a) => {
    setBusyId(a.user_id);
    try {
      await suspendAgency(a.user_id, !a.suspended);
      toast.success(a.suspended ? `${a.agency_name} reactivated` : `${a.agency_name} suspended`);
      setAgencies((prev) => prev.map((x) => x.user_id === a.user_id ? { ...x, suspended: !a.suspended } : x));
      setRosters((prev) => ({ ...prev }));
      setRosters((prev) => { const c = { ...prev }; delete c[a.user_id]; return c; });
    } catch (e) {
      notifyError(e, "We couldn't update the agency's status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAgency(deleteTarget.user_id);
      toast.success(`${deleteTarget.agency_name} deleted`);
      setAgencies((prev) => prev.filter((x) => x.user_id !== deleteTarget.user_id));
      setDeleteTarget(null);
    } catch (e) {
      notifyError(e, "We couldn't delete this agency.");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = agencies.filter((a) =>
    a.agency_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase()) ||
    a.location?.city?.toLowerCase().includes(search.toLowerCase())
  );

  const totalProfiles = agencies.reduce((n, a) => n + (a.total_profiles || 0), 0);
  const suspendedCount = agencies.filter((a) => a.suspended).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <div className="shimmer w-16 h-16 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      <SiteHeader
        leftSlot={
          <Link to="/admin" className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#DA4167] transition-colors" data-testid="back-to-admin-link">
            <CaretLeft size={18} />
            <span className="uppercase tracking-wider text-xs md:text-sm">Admin</span>
          </Link>
        }
      />

      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-7xl mx-auto">
          {/* Title + tabs */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <p className="uppercase tracking-[0.3em] text-xs text-[#DA4167] mb-2">Administration</p>
              <h1 className="text-3xl md:text-4xl text-[#F2F0ED]">Manage Agencies</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin" className="px-4 py-2 text-sm uppercase tracking-wider border border-[#27272A] text-[#A1A1AA] hover:border-[#DA4167] hover:text-[#DA4167] rounded transition-colors" data-testid="tab-overview">Overview</Link>
              <span className="px-4 py-2 text-sm uppercase tracking-wider border border-[#DA4167] text-[#DA4167] rounded" data-testid="tab-agencies">Agencies</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="card-premium p-6" data-testid="stat-total-agencies">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#832161]/10 flex items-center justify-center"><Buildings size={24} className="text-[#832161]" /></div>
                <div><p className="text-[#A1A1AA] text-sm">Total Agencies</p><p className="text-2xl text-[#F2F0ED]">{agencies.length}</p></div>
              </div>
            </div>
            <div className="card-premium p-6" data-testid="stat-total-agency-profiles">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#832161]/10 flex items-center justify-center"><Users size={24} className="text-[#832161]" /></div>
                <div><p className="text-[#A1A1AA] text-sm">Companion Profiles</p><p className="text-2xl text-[#F2F0ED]">{totalProfiles}</p></div>
              </div>
            </div>
            <div className="card-premium p-6 border-red-500/30" data-testid="stat-suspended-agencies">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center"><Prohibit size={24} className="text-red-500" /></div>
                <div><p className="text-[#A1A1AA] text-sm">Suspended</p><p className="text-2xl text-red-500">{suspendedCount}</p></div>
              </div>
            </div>
          </div>

          {/* Agencies table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-premium p-8" data-testid="agencies-section">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Buildings size={24} className="text-[#832161]" />
                <h2 className="text-xl text-[#F2F0ED]">Agencies</h2>
              </div>
              <div className="relative">
                <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
                <input
                  type="text"
                  placeholder="Search agencies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-premium pl-10 pr-4 py-2 w-64"
                  data-testid="agency-search-input"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" data-testid="agencies-table">
                <thead>
                  <tr className="border-b border-[#27272A]">
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Agency</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Location</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Contact</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Profiles</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Status</th>
                    <th className="text-right py-4 px-4 text-[#A1A1AA] text-sm font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <Fragment key={a.user_id}>
                      <tr className={`border-b border-[#27272A] ${a.suspended ? 'bg-red-500/5' : ''}`} data-testid={`agency-row-${a.user_id}`}>
                        <td className="py-4 px-4">
                          <button onClick={() => toggleRoster(a)} className="flex items-center gap-2 text-left group" data-testid={`agency-expand-${a.user_id}`}>
                            {expanded === a.user_id ? <CaretDown size={16} className="text-[#52525B]" /> : <CaretRight size={16} className="text-[#52525B]" />}
                            <span className="text-[#F2F0ED] group-hover:text-[#DA4167] transition-colors">{a.agency_name}</span>
                          </button>
                        </td>
                        <td className="py-4 px-4 text-[#A1A1AA]">{[a.location?.city, a.location?.country].filter(Boolean).join(', ') || '—'}</td>
                        <td className="py-4 px-4 text-[#A1A1AA]">{a.email || '—'}</td>
                        <td className="py-4 px-4">
                          <span className="text-[#F2F0ED]">{a.total_profiles}</span>
                          <span className="text-[#52525B] text-sm"> total · </span>
                          <span className="text-green-500">{a.live_profiles} live</span>
                        </td>
                        <td className="py-4 px-4">
                          {a.suspended
                            ? <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs rounded">Suspended</span>
                            : <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded">Active</span>}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSuspend(a)}
                              disabled={busyId === a.user_id}
                              className={`inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 rounded border transition-colors disabled:opacity-50 ${a.suspended ? 'border-green-500/50 text-green-500 hover:bg-green-500/10' : 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10'}`}
                              data-testid={`agency-suspend-${a.user_id}`}
                            >
                              {a.suspended ? <><CheckCircle size={14} /> Reactivate</> : <><Prohibit size={14} /> Suspend</>}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(a)}
                              className="inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 rounded border border-[#B91C1C]/50 text-[#EF4444] hover:bg-[#B91C1C]/10 transition-colors"
                              data-testid={`agency-delete-${a.user_id}`}
                            >
                              <Trash size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded === a.user_id && (
                        <tr className="bg-[#0F0F12]" data-testid={`agency-roster-${a.user_id}`}>
                          <td colSpan={6} className="py-5 px-6">
                            {!rosters[a.user_id] ? (
                              <p className="text-[#52525B] text-sm">Loading roster…</p>
                            ) : rosters[a.user_id].profiles.length === 0 ? (
                              <p className="text-[#52525B] text-sm">No companion profiles.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {rosters[a.user_id].profiles.map((p) => (
                                  <div key={p.provider_id} className="flex items-center gap-3 p-3 border border-[#27272A] rounded" data-testid={`roster-profile-${p.provider_id}`}>
                                    <img src={p.photos?.[0] || 'https://via.placeholder.com/40'} alt={p.display_name} className="w-10 h-10 rounded-full object-cover" />
                                    <div className="min-w-0">
                                      <p className="text-[#F2F0ED] text-sm truncate">{p.display_name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        {p.verified && <span className="inline-flex items-center gap-1 text-[10px] text-green-500"><ShieldCheck size={11} weight="fill" /> Verified</span>}
                                        {p.live
                                          ? <span className="text-[10px] text-green-500">● Live</span>
                                          : <span className="text-[10px] text-[#52525B]">● Offline</span>}
                                        {p.suspended && <span className="text-[10px] text-red-500">Suspended</span>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="text-center py-12 text-[#A1A1AA]" data-testid="agencies-empty">No agencies found</div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={deleting}
        title="Delete agency"
        description={deleteTarget ? `This permanently deletes "${deleteTarget.agency_name}", its account, and all ${deleteTarget.total_profiles} companion profile(s), media and enquiries. This cannot be undone.` : ''}
        confirmWord={deleteTarget?.agency_name}
        confirmLabel="Delete agency"
      />
    </div>
  );
}
