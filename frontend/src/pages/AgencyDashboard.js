import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, PencilSimple, Trash, MapPin, CheckCircle, Crown, ChatCircle, Users
} from 'phosphor-react';
import { getAgencyProfiles, deleteProviderProfile } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import SiteHeader from '@/components/SiteHeader';

const StatusPill = ({ profile }) => {
  if (profile.featured_active) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#22C55E]/10 text-[#15803D]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#832161]/10 text-[#832161]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#832161]" /> Not activated
    </span>
  );
};

const VerifyPill = ({ profile }) => {
  const map = {
    approved: { cls: 'bg-[#22C55E]/10 text-[#15803D]', label: 'Verified' },
    submitted: { cls: 'bg-[#F59E0B]/10 text-[#B45309]', label: 'Under review' },
    rejected: { cls: 'bg-[#B91C1C]/10 text-[#B91C1C]', label: 'Rejected' },
    pending: { cls: 'bg-[#dbdadd]/60 text-[#898989]', label: 'Unverified' },
  };
  const s = map[profile.verification_status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${s.cls}`}>
      {profile.verified && <CheckCircle size={12} weight="fill" />}
      {s.label}
    </span>
  );
};

export default function AgencyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    try {
      const { data } = await getAgencyProfiles();
      setProfiles(data.profiles || []);
    } catch (e) {
      toast.error('Failed to load your profiles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (profile) => {
    if (!window.confirm(
      `Delete "${profile.display_name}"?\n\nThis permanently removes the profile, its photos, subscription history and verification documents. This cannot be undone.`
    )) return;
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

  const activeCount = profiles.filter((p) => p.featured_active).length;
  const totalUnread = profiles.reduce((s, p) => s + (p.unread_enquiries || 0), 0);

  return (
    <div className="min-h-screen bg-[#F0EFF4] dashboard-light">
      <SiteHeader />

      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10"
            data-testid="agency-header"
          >
            <div>
              <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-3">Agency Dashboard</p>
              <h2 className="text-4xl md:text-5xl text-[#000000] mb-3">Welcome, {user?.name}</h2>
              <p className="text-[#898989] text-sm">
                Manage every companion profile under your agency from one place.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard/profile/new')}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
              data-testid="add-profile-btn"
            >
              <Plus size={18} weight="bold" /> Add profile
            </button>
          </motion.div>

          {/* Stat strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-lg border border-[#dbdadd] bg-white p-5 flex items-center gap-4" data-testid="stat-total">
              <div className="w-11 h-11 rounded-full bg-[#832161]/10 flex items-center justify-center">
                <Users size={20} className="text-[#832161]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#000000]">{profiles.length}</p>
                <p className="text-xs text-[#898989] uppercase tracking-wider">Total profiles</p>
              </div>
            </div>
            <div className="rounded-lg border border-[#dbdadd] bg-white p-5 flex items-center gap-4" data-testid="stat-live">
              <div className="w-11 h-11 rounded-full bg-[#22C55E]/10 flex items-center justify-center">
                <Crown size={20} className="text-[#22C55E]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#000000]">{activeCount}</p>
                <p className="text-xs text-[#898989] uppercase tracking-wider">Live on Browse</p>
              </div>
            </div>
            <div className="rounded-lg border border-[#dbdadd] bg-white p-5 flex items-center gap-4" data-testid="stat-enquiries">
              <div className="w-11 h-11 rounded-full bg-[#DA4167]/10 flex items-center justify-center">
                <ChatCircle size={20} className="text-[#DA4167]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#000000]">{totalUnread}</p>
                <p className="text-xs text-[#898989] uppercase tracking-wider">Unread enquiries</p>
              </div>
            </div>
          </div>

          {/* Profiles table */}
          <div className="rounded-lg border border-[#dbdadd] bg-white overflow-hidden" data-testid="agency-profiles-table">
            {loading ? (
              <div className="p-10 flex justify-center">
                <div className="shimmer w-10 h-10 rounded-full" />
              </div>
            ) : profiles.length === 0 ? (
              <div className="p-12 text-center" data-testid="agency-empty-state">
                <div className="w-14 h-14 rounded-full bg-[#832161]/10 flex items-center justify-center mx-auto mb-4">
                  <Users size={26} className="text-[#832161]" />
                </div>
                <h3 className="text-lg font-bold text-[#000000] mb-2">No profiles yet</h3>
                <p className="text-sm text-[#898989] mb-6 max-w-md mx-auto">
                  Add your first companion profile. Each profile gets its own listing, subscription and verification.
                </p>
                <button
                  onClick={() => navigate('/dashboard/profile/new')}
                  className="btn-primary inline-flex items-center gap-2"
                  data-testid="add-first-profile-btn"
                >
                  <Plus size={18} weight="bold" /> Add your first profile
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#dbdadd] bg-[#F0EFF4]/60">
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium">Profile</th>
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium hidden md:table-cell">Description</th>
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium">Location</th>
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium">Status</th>
                      <th className="px-5 py-3 text-xs uppercase tracking-wider text-[#898989] font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr
                        key={p.provider_id}
                        className="border-b border-[#dbdadd] last:border-0 hover:bg-[#F0EFF4]/40 transition-colors"
                        data-testid={`agency-profile-row-${p.provider_id}`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-[#000000]">{p.display_name}</p>
                            {p.unread_enquiries > 0 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-[#DA4167] text-white rounded-full">
                                {p.unread_enquiries}
                              </span>
                            )}
                          </div>
                          <div className="md:hidden mt-1 text-xs text-[#898989] line-clamp-2 max-w-xs">{p.bio || '—'}</div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <p className="text-sm text-[#898989] line-clamp-2 max-w-sm">{p.bio || '—'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-sm text-[#000000]">
                            <MapPin size={14} className="text-[#832161]" />
                            {[p.location?.city, p.location?.country].filter(Boolean).join(', ') || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            <StatusPill profile={p} />
                            <VerifyPill profile={p} />
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/dashboard/profile/${p.provider_id}`)}
                              className="inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 border border-[#832161]/40 text-[#832161] hover:bg-[#832161]/10 rounded transition-colors"
                              data-testid={`edit-profile-${p.provider_id}`}
                            >
                              <PencilSimple size={14} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              disabled={deletingId === p.provider_id}
                              className="inline-flex items-center gap-1 text-xs uppercase tracking-wider px-3 py-2 border border-[#B91C1C]/40 text-[#B91C1C] hover:bg-[#B91C1C]/10 rounded transition-colors disabled:opacity-50"
                              data-testid={`delete-profile-${p.provider_id}`}
                            >
                              <Trash size={14} /> {deletingId === p.provider_id ? '…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
