import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, Eye, ChartLine, Warning, CheckCircle, Clock, 
  CaretRight, MagnifyingGlass, CaretLeft
} from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';
import { getAdminProviders, getAdminStats, getAdminTraffic } from '@/services/api';
import { toast } from 'sonner';
import SiteHeader from '@/components/SiteHeader';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [trafficDays, setTrafficDays] = useState(7);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      toast.error('Admin access required');
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchTraffic = async (days) => {
    try {
      const res = await getAdminTraffic(days);
      setTraffic(res.data);
    } catch (_err) {
      // Traffic widget will simply show stale data on failure.
    }
  };

  const handleTrafficDaysChange = (days) => {
    setTrafficDays(days);
    if (user?.role === 'admin') {
      fetchTraffic(days);
    }
  };

  const fetchData = async () => {
    try {
      const [providersRes, statsRes, trafficRes] = await Promise.all([
        getAdminProviders(),
        getAdminStats(),
        getAdminTraffic(trafficDays)
      ]);
      setProviders(providersRes.data);
      setStats(statsRes.data);
      setTraffic(trafficRes.data);
    } catch (_err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(provider => 
    provider.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <div className="shimmer w-16 h-16 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C]">
      {/* Header */}
      <SiteHeader
        leftSlot={
          <Link to="/" className="flex items-center gap-2 text-[#A1A1AA] hover:text-[#DA4167] transition-colors" data-testid="back-to-site-link">
            <CaretLeft size={18} />
            <span className="uppercase tracking-wider text-xs md:text-sm">Back to Site</span>
          </Link>
        }
      />

      <div className="pt-32 pb-20 section-padding">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-premium p-6"
              data-testid="stat-providers"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#832161]/10 flex items-center justify-center">
                  <Users size={24} className="text-[#832161]" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">Total Providers</p>
                  <p className="text-2xl text-[#F2F0ED]">{stats?.total_providers || 0}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-premium p-6"
              data-testid="stat-clients"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#832161]/10 flex items-center justify-center">
                  <Users size={24} className="text-[#832161]" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">Total Clients</p>
                  <p className="text-2xl text-[#F2F0ED]">{stats?.total_clients || 0}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-premium p-6 border-amber-500/30"
              data-testid="stat-pending"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Clock size={24} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">Pending Media</p>
                  <p className="text-2xl text-amber-500">{stats?.pending_media || 0}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-premium p-6 border-red-500/30"
              data-testid="stat-action-needed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Warning size={24} className="text-red-500" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">Need Action</p>
                  <p className="text-2xl text-red-500">{stats?.providers_needing_action || 0}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card-premium p-6"
              data-testid="stat-pending-media"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#832161]/10 flex items-center justify-center">
                  <CheckCircle size={24} className="text-[#832161]" />
                </div>
                <div>
                  <p className="text-[#A1A1AA] text-sm">Pending Media</p>
                  <p className="text-2xl text-[#F2F0ED]">{stats?.pending_media || 0}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Traffic Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card-premium p-8 mb-12"
            data-testid="traffic-section"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ChartLine size={24} className="text-[#832161]" />
                <h2 className="text-xl text-[#F2F0ED]">Website Traffic</h2>
              </div>
              <select
                value={trafficDays}
                onChange={(e) => handleTrafficDaysChange(Number(e.target.value))}
                className="input-premium px-4 py-2 text-sm"
                data-testid="traffic-days-select"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-4 border border-[#27272A] rounded">
                <p className="text-3xl text-[#832161]">{traffic?.total_views || 0}</p>
                <p className="text-[#A1A1AA] text-sm mt-1">Total Page Views</p>
              </div>
              <div className="text-center p-4 border border-[#27272A] rounded">
                <p className="text-3xl text-[#832161]">{traffic?.total_unique_visitors || 0}</p>
                <p className="text-[#A1A1AA] text-sm mt-1">Unique Visitors</p>
              </div>
              <div className="text-center p-4 border border-[#27272A] rounded">
                <p className="text-3xl text-[#832161]">
                  {traffic?.daily_stats?.length > 0 
                    ? Math.round(traffic.total_views / traffic.daily_stats.length) 
                    : 0}
                </p>
                <p className="text-[#A1A1AA] text-sm mt-1">Avg. Daily Views</p>
              </div>
            </div>

            {/* Daily Traffic Chart */}
            {traffic?.daily_stats?.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm text-[#A1A1AA] mb-4">Daily Views</h3>
                <div className="flex items-end gap-2 h-40">
                  {traffic.daily_stats.map((day, index) => {
                    const maxViews = Math.max(...traffic.daily_stats.map(d => d.views));
                    const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                    return (
                      <div 
                        key={day.date} 
                        className="flex-1 flex flex-col items-center gap-2"
                        data-testid={`traffic-bar-${index}`}
                      >
                        <div 
                          className="w-full bg-[#832161]/80 rounded-t transition-all hover:bg-[#832161]"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${day.views} views`}
                        ></div>
                        <span className="text-xs text-[#52525B] transform -rotate-45 origin-left">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Pages */}
            {traffic?.page_stats && Object.keys(traffic.page_stats).length > 0 && (
              <div>
                <h3 className="text-sm text-[#A1A1AA] mb-4">Top Pages</h3>
                <div className="space-y-2">
                  {Object.entries(traffic.page_stats).slice(0, 5).map(([page, views]) => (
                    <div key={page} className="flex justify-between items-center py-2 border-b border-[#27272A]">
                      <span className="text-[#F2F0ED] text-sm truncate max-w-md">{page}</span>
                      <span className="text-[#832161] font-medium">{views} views</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Providers Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card-premium p-8"
            data-testid="providers-section"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users size={24} className="text-[#832161]" />
                <h2 className="text-xl text-[#F2F0ED]">Advertisers</h2>
              </div>
              <div className="relative">
                <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-premium pl-10 pr-4 py-2 w-64"
                  data-testid="search-input"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full" data-testid="providers-table">
                <thead>
                  <tr className="border-b border-[#27272A]">
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Status</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Provider</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Email</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Location</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Verified</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal">Pending Media</th>
                    <th className="text-left py-4 px-4 text-[#A1A1AA] text-sm font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProviders.map((provider, index) => (
                    <tr
                      key={provider.provider_id}
                      onClick={() => navigate(`/admin/providers/${provider.provider_id}`)}
                      className={`border-b border-[#27272A] cursor-pointer transition-colors hover:bg-[#141416] ${
                        provider.needs_action ? 'bg-amber-500/5' : ''
                      }`}
                      data-testid={`provider-row-${index}`}
                    >
                      <td className="py-4 px-4">
                        {provider.needs_action ? (
                          <div className="flex items-center gap-2">
                            <Warning size={18} className="text-amber-500" />
                            <span className="text-amber-500 text-sm">Action needed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle size={18} className="text-green-500" />
                            <span className="text-green-500 text-sm">OK</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={provider.photos?.[0] || 'https://via.placeholder.com/40'}
                            alt={provider.display_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <span className="text-[#F2F0ED]">{provider.display_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#A1A1AA]">{provider.user?.email}</td>
                      <td className="py-4 px-4 text-[#A1A1AA]">{provider.location?.city}</td>
                      <td className="py-4 px-4">
                        {provider.verified ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded">Verified</span>
                        ) : (
                          <span className="px-2 py-1 bg-[#27272A] text-[#A1A1AA] text-xs rounded">Unverified</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {provider.pending_media_count > 0 ? (
                          <span className="px-2 py-1 bg-amber-500/20 text-amber-500 text-xs rounded">
                            {provider.pending_media_count} pending
                          </span>
                        ) : (
                          <span className="text-[#52525B] text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <CaretRight size={20} className="text-[#52525B]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProviders.length === 0 && (
                <div className="text-center py-12 text-[#A1A1AA]">
                  No providers found
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
