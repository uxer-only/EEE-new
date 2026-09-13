import { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Buildings, Users, Prohibit, CaretLeft, CaretDown, CaretRight,
  MagnifyingGlass, Trash, CheckCircle, ShieldCheck
} from 'phosphor-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { getAdminAgencies, getAdminAgencyDetail, suspendAgency, deleteAgency } from '@/services/api';
import { notifyError, notifyProblem } from '../lib/notify';
import SiteHeader from '@/components/SiteHeader';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import TablePagination from '@/components/TablePagination';

const PER_PAGE = 15;

const StatCard = ({ icon: Icon, label, value, accent = '#832161', testId }) => (
  <div className="bg-white border border-[#dbdadd] rounded-lg p-6" data-testid={testId}>
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}1a` }}>
        <Icon size={24} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[#898989] text-sm">{label}</p>
        <p className="text-2xl" style={{ color: accent === '#832161' ? '#000000' : accent }}>{value}</p>
      </div>
    </div>
  </div>
);

const TabNav = ({ active }) => (
  <div className="flex flex-wrap items-center gap-2 mb-8">
    {[
      { to: '/admin', label: 'Overview', id: 'overview' },
      { to: '/admin/agencies', label: 'Agencies', id: 'agencies' },
      { to: '/admin/verifications', label: 'Verifications', id: 'verifications' },
    ].map((t) =>
      t.id === active ? (
        <span key={t.id} className="px-4 py-2 text-sm uppercase tracking-wider border border-[#832161] text-[#832161] rounded" data-testid={`tab-${t.id}`}>{t.label}</span>
      ) : (
        <Link key={t.id} to={t.to} className="px-4 py-2 text-sm uppercase tracking-wider border border-[#dbdadd] text-[#898989] hover:border-[#832161] hover:text-[#832161] rounded transition-colors" data-testid={`tab-${t.id}`}>{t.label}</Link>
      )
    )}
  </div>
);

export default function AdminAgencies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(null);
  const [rosters, setRosters] = useState({});
  const [busyId, setBusyId] = useState(null);
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

  const pageStart = (page - 1) * PER_PAGE;
  const paged = filtered.slice(pageStart, pageStart + PER_PAGE);

  const onSearch = (v) => { setSearch(v); setPage(1); };

  const totalProfiles = agencies.reduce((n, a) => n + (a.total_profiles || 0), 0);
  const suspendedCount = agencies.filter((a) => a.suspended).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0EFF4] flex items-center justify-center">
        <div className="shimmer w-16 h-16 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
      <SiteHeader
        leftSlot={
          <Link to="/admin" className="flex items-center gap-2 text-[#898989] hover:text-[#832161] transition-colors" data-testid="back-to-admin-link">
            <CaretLeft size={18} />
            <span className="uppercase tracking-wider text-xs md:text-sm">Admin</span>
          </Link>
        }
      />

      <div className="pt-32 pb-24 section-padding">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-2">Administration</p>
            <h2 className="text-4xl md:text-5xl text-[#000000]">Manage Agencies</h2>
          </div>

          <TabNav active="agencies" />

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <StatCard icon={Buildings} label="Total Agencies" value={agencies.length} testId="stat-total-agencies" />
            <StatCard icon={Users} label="Companion Profiles" value={totalProfiles} testId="stat-total-agency-profiles" />
            <StatCard icon={Prohibit} label="Suspended" value={suspendedCount} accent="#DC2626" testId="stat-suspended-agencies" />
          </div>

          {/* Agencies table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-[#dbdadd] rounded-lg p-8" data-testid="agencies-section">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Buildings size={22} className="text-[#832161]" />
                <h3 className="text-xl font-bold text-[#832161]">Agencies</h3>
              </div>
              <div className="relative">
                <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#898989]" />
                <input
                  type="text"
                  placeholder="Search agencies..."
                  value={search}
                  onChange={(e) => onSearch(e.target.value)}
                  className="input-premium !pl-11 pr-4 py-2 w-full sm:w-64"
                  data-testid="agency-search-input"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-[6px]" data-testid="agencies-table">
                <thead>
                  <tr className="bg-[#d9d9db]">
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold rounded-l-lg">Agency</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold hidden md:table-cell">Location</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold hidden lg:table-cell">Contact</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold">Profiles</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold">Status</th>
                    <th className="text-right py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold rounded-r-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((a) => (
                    <Fragment key={a.user_id}>
                      <tr className={`[&>td]:border-y [&>td]:border-[#dbdadd] ${a.suspended ? '[&>td]:bg-red-50' : '[&>td]:bg-white'}`} data-testid={`agency-row-${a.user_id}`}>
                        <td className="py-4 px-4 border-l rounded-l-lg">
                          <button onClick={() => toggleRoster(a)} className="flex items-center gap-2 text-left group" data-testid={`agency-expand-${a.user_id}`}>
                            {expanded === a.user_id ? <CaretDown size={16} className="text-[#898989]" /> : <CaretRight size={16} className="text-[#898989]" />}
                            <span className="text-[#000000] group-hover:text-[#832161] transition-colors font-medium">{a.agency_name}</span>
                          </button>
                        </td>
                        <td className="py-4 px-4 text-[#898989] hidden md:table-cell">{[a.location?.city, a.location?.country].filter(Boolean).join(', ') || '—'}</td>
                        <td className="py-4 px-4 text-[#898989] hidden lg:table-cell">{a.email || '—'}</td>
                        <td className="py-4 px-4">
                          <span className="text-[#000000]">{a.total_profiles}</span>
                          <span className="text-[#898989] text-sm"> total · </span>
                          <span className="text-[#16A34A]">{a.live_profiles} live</span>
                        </td>
                        <td className="py-4 px-4">
                          {a.suspended
                            ? <span className="px-2 py-1 bg-[#DC2626]/15 text-[#DC2626] text-xs rounded">Suspended</span>
                            : <span className="px-2 py-1 bg-[#16A34A]/15 text-[#16A34A] text-xs rounded">Active</span>}
                        </td>
                        <td className="py-4 px-4 border-r rounded-r-lg">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleSuspend(a)}
                              disabled={busyId === a.user_id}
                              className={`inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 rounded border transition-colors disabled:opacity-50 ${a.suspended ? 'border-[#16A34A]/50 text-[#16A34A] hover:bg-[#16A34A]/10' : 'border-[#D97706]/50 text-[#D97706] hover:bg-[#D97706]/10'}`}
                              data-testid={`agency-suspend-${a.user_id}`}
                            >
                              {a.suspended ? <><CheckCircle size={14} /> Reactivate</> : <><Prohibit size={14} /> Suspend</>}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(a)}
                              className="inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 rounded border border-[#B91C1C]/50 text-[#B91C1C] hover:bg-[#B91C1C]/10 transition-colors"
                              data-testid={`agency-delete-${a.user_id}`}
                            >
                              <Trash size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expanded === a.user_id && (
                        <tr data-testid={`agency-roster-${a.user_id}`}>
                          <td colSpan={6} className="p-0">
                            <div className="bg-[#F0EFF4] border border-[#dbdadd] rounded-lg p-5">
                              {!rosters[a.user_id] ? (
                                <p className="text-[#898989] text-sm">Loading roster…</p>
                              ) : rosters[a.user_id].profiles.length === 0 ? (
                                <p className="text-[#898989] text-sm">No companion profiles.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {rosters[a.user_id].profiles.map((p) => (
                                    <div key={p.provider_id} className="flex items-center gap-3 p-3 bg-white border border-[#dbdadd] rounded-lg" data-testid={`roster-profile-${p.provider_id}`}>
                                      <img src={p.photos?.[0] || 'https://via.placeholder.com/40'} alt={p.display_name} className="w-10 h-10 rounded-full object-cover" />
                                      <div className="min-w-0">
                                        <p className="text-[#000000] text-sm truncate font-medium">{p.display_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {p.verified && <span className="inline-flex items-center gap-1 text-[10px] text-[#16A34A]"><ShieldCheck size={11} weight="fill" /> Verified</span>}
                                          {p.live
                                            ? <span className="text-[10px] text-[#16A34A]">● Live</span>
                                            : <span className="text-[10px] text-[#898989]">● Offline</span>}
                                          {p.suspended && <span className="text-[10px] text-[#DC2626]">Suspended</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="text-center py-12 text-[#898989]" data-testid="agencies-empty">No agencies found</div>
              )}
            </div>

            <TablePagination
              page={page}
              perPage={PER_PAGE}
              totalItems={filtered.length}
              onPageChange={setPage}
              testId="agencies-pagination"
            />
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
