import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, ChartLine, Warning, CheckCircle, Clock,
  CaretRight, MagnifyingGlass, CaretLeft
} from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';
import { getAdminProviders, getAdminStats, getAdminTraffic } from '@/services/api';
import { notifyError, notifyProblem } from '../lib/notify';
import SiteHeader from '@/components/SiteHeader';
import TablePagination from '@/components/TablePagination';

const PER_PAGE = 15;

const StatCard = ({ icon: Icon, label, value, accent = '#832161', delay = 0, testId }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-white border border-[#dbdadd] rounded-lg p-6"
    data-testid={testId}
  >
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accent}1a` }}>
        <Icon size={24} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[#898989] text-sm">{label}</p>
        <p className="text-2xl" style={{ color: accent === '#832161' ? '#000000' : accent }}>{value}</p>
      </div>
    </div>
  </motion.div>
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [trafficDays, setTrafficDays] = useState(7);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      notifyProblem('Admin access is required.', 'Sign in with an admin account to view this page.');
      navigate('/login');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchTraffic = async (days) => {
    try {
      const res = await getAdminTraffic(days);
      setTraffic(res.data);
    } catch (_err) { /* keep stale data on failure */ }
  };

  const handleTrafficDaysChange = (days) => {
    setTrafficDays(days);
    if (user?.role === 'admin') fetchTraffic(days);
  };

  const fetchData = async () => {
    try {
      const [providersRes, statsRes, trafficRes] = await Promise.all([
        getAdminProviders(),
        getAdminStats(),
        getAdminTraffic(trafficDays),
      ]);
      setProviders(providersRes.data);
      setStats(statsRes.data);
      setTraffic(trafficRes.data);
    } catch (_err) {
      notifyError(_err, "We couldn't load the admin dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter((provider) =>
    provider.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pageStart = (page - 1) * PER_PAGE;
  const paged = filteredProviders.slice(pageStart, pageStart + PER_PAGE);

  const onSearch = (v) => { setSearchQuery(v); setPage(1); };

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
          <Link to="/" className="flex items-center gap-2 text-[#898989] hover:text-[#832161] transition-colors" data-testid="back-to-site-link">
            <CaretLeft size={18} />
            <span className="uppercase tracking-wider text-xs md:text-sm">Back to Site</span>
          </Link>
        }
      />

      <div className="pt-32 pb-24 section-padding">
        <div className="max-w-7xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <p className="text-[#000000] text-xs uppercase tracking-[0.2em] mb-2">Administration</p>
            <h2 className="text-4xl md:text-5xl text-[#000000]">Overview</h2>
          </div>

          <TabNav active="overview" />

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            <StatCard icon={Users} label="Total Providers" value={stats?.total_providers || 0} delay={0} testId="stat-providers" />
            <StatCard icon={Users} label="Total Clients" value={stats?.total_clients || 0} delay={0.1} testId="stat-clients" />
            <StatCard icon={Clock} label="Pending Media" value={stats?.pending_media || 0} accent="#D97706" delay={0.2} testId="stat-pending" />
            <StatCard icon={Warning} label="Need Action" value={stats?.providers_needing_action || 0} accent="#DC2626" delay={0.3} testId="stat-action-needed" />
            <StatCard icon={CheckCircle} label="Verified" value={stats?.verified_providers ?? stats?.total_providers ?? 0} delay={0.4} testId="stat-verified" />
          </div>

          {/* Traffic Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white border border-[#dbdadd] rounded-lg p-8 mb-12"
            data-testid="traffic-section"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ChartLine size={22} className="text-[#832161]" />
                <h3 className="text-xl font-bold text-[#832161]">Website Traffic</h3>
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
              <div className="text-center p-4 border border-[#dbdadd] rounded-lg">
                <p className="text-3xl text-[#832161]">{traffic?.total_views || 0}</p>
                <p className="text-[#898989] text-sm mt-1">Total Page Views</p>
              </div>
              <div className="text-center p-4 border border-[#dbdadd] rounded-lg">
                <p className="text-3xl text-[#832161]">{traffic?.total_unique_visitors || 0}</p>
                <p className="text-[#898989] text-sm mt-1">Unique Visitors</p>
              </div>
              <div className="text-center p-4 border border-[#dbdadd] rounded-lg">
                <p className="text-3xl text-[#832161]">
                  {traffic?.daily_stats?.length > 0 ? Math.round(traffic.total_views / traffic.daily_stats.length) : 0}
                </p>
                <p className="text-[#898989] text-sm mt-1">Avg. Daily Views</p>
              </div>
            </div>

            {traffic?.daily_stats?.length > 0 && (
              <div className="mb-8">
                <h4 className="text-sm text-[#898989] mb-4">Daily Views</h4>
                <div className="flex items-end gap-2 h-40">
                  {traffic.daily_stats.map((day, index) => {
                    const maxViews = Math.max(...traffic.daily_stats.map((d) => d.views));
                    const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-2" data-testid={`traffic-bar-${index}`}>
                        <div
                          className="w-full bg-[#832161]/70 rounded-t transition-all hover:bg-[#832161]"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${day.views} views`}
                        ></div>
                        <span className="text-xs text-[#898989] transform -rotate-45 origin-left">{day.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {traffic?.page_stats && Object.keys(traffic.page_stats).length > 0 && (
              <div>
                <h4 className="text-sm text-[#898989] mb-4">Top Pages</h4>
                <div className="space-y-2">
                  {Object.entries(traffic.page_stats).slice(0, 5).map(([pageName, views]) => (
                    <div key={pageName} className="flex justify-between items-center py-2 border-b border-[#dbdadd]">
                      <span className="text-[#000000] text-sm truncate max-w-md">{pageName}</span>
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
            className="bg-white border border-[#dbdadd] rounded-lg p-8"
            data-testid="providers-section"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Users size={22} className="text-[#832161]" />
                <h3 className="text-xl font-bold text-[#832161]">Advertisers</h3>
              </div>
              <div className="relative">
                <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#898989]" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => onSearch(e.target.value)}
                  className="input-premium pl-10 pr-4 py-2 w-full sm:w-64"
                  data-testid="search-input"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-[6px]" data-testid="providers-table">
                <thead>
                  <tr className="bg-[#d9d9db]">
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold rounded-l-lg">Status</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold">Provider</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold hidden md:table-cell">Email</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold hidden lg:table-cell">Location</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold">Verified</th>
                    <th className="text-left py-3 px-4 text-[#6b6b6f] text-xs uppercase tracking-wider font-semibold hidden lg:table-cell">Pending Media</th>
                    <th className="py-3 px-4 rounded-r-lg"></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((provider, index) => (
                    <tr
                      key={provider.provider_id}
                      onClick={() => navigate(`/admin/providers/${provider.provider_id}`)}
                      className={`cursor-pointer transition-colors [&>td]:align-middle [&>td]:bg-white [&>td]:border-y [&>td]:border-[#dbdadd] hover:[&>td]:bg-[#F0EFF4]/60 ${provider.needs_action ? '[&>td]:!bg-amber-50' : ''}`}
                      data-testid={`provider-row-${index}`}
                    >
                      <td className="py-4 px-4 border-l rounded-l-lg">
                        {provider.needs_action ? (
                          <div className="flex items-center gap-2">
                            <Warning size={18} className="text-[#D97706]" />
                            <span className="text-[#D97706] text-sm">Action needed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle size={18} className="text-[#16A34A]" />
                            <span className="text-[#16A34A] text-sm">OK</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img src={provider.photos?.[0] || 'https://via.placeholder.com/40'} alt={provider.display_name} className="w-10 h-10 rounded-full object-cover" />
                          <span className="text-[#000000]">{provider.display_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-[#898989] hidden md:table-cell">{provider.user?.email}</td>
                      <td className="py-4 px-4 text-[#898989] hidden lg:table-cell">{provider.location?.city}</td>
                      <td className="py-4 px-4">
                        {provider.verified ? (
                          <span className="px-2 py-1 bg-[#16A34A]/15 text-[#16A34A] text-xs rounded">Verified</span>
                        ) : (
                          <span className="px-2 py-1 bg-[#e6e5e8] text-[#898989] text-xs rounded">Unverified</span>
                        )}
                      </td>
                      <td className="py-4 px-4 hidden lg:table-cell">
                        {provider.pending_media_count > 0 ? (
                          <span className="px-2 py-1 bg-[#D97706]/15 text-[#D97706] text-xs rounded">{provider.pending_media_count} pending</span>
                        ) : (
                          <span className="text-[#898989] text-sm">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 border-r rounded-r-lg text-right">
                        <CaretRight size={20} className="text-[#898989] inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredProviders.length === 0 && (
                <div className="text-center py-12 text-[#898989]" data-testid="providers-empty">No providers found</div>
              )}
            </div>

            <TablePagination
              page={page}
              perPage={PER_PAGE}
              totalItems={filteredProviders.length}
              onPageChange={setPage}
              testId="providers-pagination"
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
