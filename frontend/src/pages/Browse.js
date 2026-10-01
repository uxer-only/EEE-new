import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProviders } from '@/services/api';
import { notifyError, notifyProblem } from '../lib/notify';
import { MagnifyingGlass, MapPin, Faders, CheckCircle, Crown, Check, X } from 'phosphor-react';
import { useAuth } from '@/context/AuthContext';
import SiteHeader from '@/components/SiteHeader';
import ExtraFilters from '@/components/ExtraFilters';

const DEFAULT_FILTERS = {
  city: '',
  gender: '',
  // Extra filters
  service: '',
  nationality: '',
  ethnicity: '',
  orientation: '',
  breast_size: '',
  breast_type: ''
};

const EXTRA_FILTER_KEYS = [
  'service',
  'nationality', 'ethnicity', 'orientation',
  'breast_size', 'breast_type'
];

const CLOSE_TO_ME_KEY = 'ee-close-to-me';

const GENDER_OPTIONS = [
  { label: 'All', value: '', testId: 'filter-all' },
  { label: 'Female', value: 'female', testId: 'filter-female' },
  { label: 'Male', value: 'male', testId: 'filter-male' },
  { label: 'Trans', value: 'trans', testId: 'filter-trans' },
];

export default function Browse() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [closeToMe, setCloseToMe] = useState(() => localStorage.getItem(CLOSE_TO_ME_KEY) === '1');
  const [coords, setCoords] = useState(null);
  const { user } = useAuth();

  // Count of active "extra" filters (excludes city + gender — those are always visible).
  const isActive = (key) => {
    const v = filters[key];
    return v !== undefined && v !== null && String(v).length > 0;
  };
  const activeExtraCount = EXTRA_FILTER_KEYS.filter(isActive).length;

  useEffect(() => {
    fetchProviders();
  }, [filters.gender, coords]);

  // Re-request device location on mount if the user previously opted in.
  useEffect(() => {
    if (closeToMe) requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProviders = async () => {
    try {
      const params = {};
      if (filters.city) params.city = filters.city;
      if (filters.gender) params.gender = filters.gender;
      if (coords) {
        params.origin_lat = coords.lat;
        params.origin_lng = coords.lng;
      }

      // Extra filters
      EXTRA_FILTER_KEYS.forEach((k) => {
        if (filters[k] && String(filters[k]).length > 0) params[k] = filters[k];
      });

      const response = await getProviders(params);
      setProviders(response.data);
      setOfflineMode(false);
    } catch (error) {
      // Fall back to recently viewed profiles cached in localStorage
      try {
        const cached = JSON.parse(localStorage.getItem('lumiere-recent-providers') || '[]');
        if (cached.length > 0 && !navigator.onLine) {
          setProviders(cached);
          setOfflineMode(true);
        } else {
          notifyError(error, "We couldn't load providers.");
        }
      } catch {
        notifyProblem("We couldn't load providers.", 'Check your connection and refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProviders();
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      notifyProblem("Location unavailable", "Your browser doesn't support location access.");
      setCloseToMe(false);
      localStorage.removeItem(CLOSE_TO_ME_KEY);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        notifyProblem("Location blocked", "Allow location access to see escorts closest to you.");
        setCloseToMe(false);
        localStorage.removeItem(CLOSE_TO_ME_KEY);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  const handleToggleCloseToMe = () => {
    const next = !closeToMe;
    setCloseToMe(next);
    if (next) {
      localStorage.setItem(CLOSE_TO_ME_KEY, '1');
      requestLocation();
    } else {
      localStorage.removeItem(CLOSE_TO_ME_KEY);
      setCoords(null);
    }
  };

  const handleClearExtraFilters = () => {
    setFilters((prev) => ({
      ...DEFAULT_FILTERS,
      city: prev.city,
      gender: prev.gender
    }));
  };

  return (
    <div className="min-h-screen bg-[#F0EFF4]">
      {/* Header */}
      <SiteHeader />

      <div className="pt-24 md:pt-32 pb-20 section-padding">
        {offlineMode && (
          <div
            className="max-w-4xl mx-auto mb-6 px-4 py-3 rounded border border-[#832161]/30 bg-[#832161]/5 text-center"
            data-testid="offline-banner"
          >
            <p className="text-[#832161] text-sm">
              You're offline — showing profiles you've recently viewed
            </p>
          </div>
        )}
        {/* Search Bar */}
        <div className="max-w-6xl mx-auto mb-10 md:mb-16">
          <h2 className="text-4xl md:text-5xl text-[#141416] mb-6 md:mb-8 text-center" data-testid="browse-title">
 Discover Excellence
 </h2>

          {/* Filter + location + search toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch gap-3 lg:gap-4">
            {/* Gender filter + extra filters */}
            <div
              className="flex items-center justify-center gap-1 bg-white rounded-2xl shadow-[0_2px_14px_rgba(20,20,22,0.05)] px-2 py-2"
              data-testid="filter-card"
            >
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.value || 'all'}
                  onClick={() => setFilters({ ...filters, gender: g.value })}
                  className={`px-3 md:px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    filters.gender === g.value
                      ? 'bg-[#832161] text-white'
                      : 'text-[#52525B] hover:text-[#832161]'
                  }`}
                  data-testid={g.testId}
                >
                  {g.label}
                </button>
              ))}
              <div className="w-px h-6 bg-[#e5e7eb] mx-1" />
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`relative p-2.5 rounded-xl transition-colors ${
                  showFilters || activeExtraCount > 0
                    ? 'text-[#832161] bg-[#832161]/5'
                    : 'text-[#52525B] hover:text-[#832161]'
                }`}
                data-testid="filters-button"
                aria-label="Extra filters"
              >
                <Faders size={20} />
                {activeExtraCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[#832161] text-white text-[10px] font-semibold leading-none"
                    data-testid="extra-filters-count"
                  >
                    {activeExtraCount}
                  </span>
                )}
              </button>
            </div>

            {/* Close-to-me location toggle (uses device geolocation) */}
            <button
              type="button"
              onClick={handleToggleCloseToMe}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-[0_2px_14px_rgba(20,20,22,0.05)] px-4 py-3 text-left"
              data-testid="close-to-me-toggle"
              aria-pressed={closeToMe}
            >
              <span
                className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                  closeToMe ? 'bg-[#832161] border-[#832161]' : 'border-[#c9c7cc] bg-white'
                }`}
              >
                {closeToMe && <Check size={14} weight="bold" className="text-white" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-[#141416] leading-tight">Show escorts close to me</span>
                <span className="block text-xs text-[#898989] leading-tight">Uses your device location</span>
              </span>
              <MapPin size={22} weight="fill" className="text-[#832161] flex-shrink-0" />
            </button>

            {/* City / name search */}
            <form
              onSubmit={handleSearch}
              className="flex-1 flex items-center gap-2 bg-white rounded-2xl shadow-[0_2px_14px_rgba(20,20,22,0.05)] pl-5 pr-2 py-2"
            >
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                placeholder="Search city or name"
                className="flex-1 min-w-0 bg-transparent border-0 text-sm text-[#3D2645] placeholder:text-[#9CA3AF] focus:ring-0 focus:outline-none"
                data-testid="city-search-input"
              />
              <button
                type="submit"
                style={{ borderRadius: '12px' }}
                className="flex-shrink-0 w-11 h-11 bg-[#832161] hover:bg-[#6d1b51] text-white flex items-center justify-center transition-colors"
                data-testid="search-button"
                aria-label="Search"
              >
                <MagnifyingGlass size={20} />
              </button>
            </form>
          </div>

          {/* More filters panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 w-full max-w-[880px] bg-white rounded-2xl shadow-[0_12px_44px_rgba(20,20,22,0.14)] overflow-hidden"
              data-testid="filters-panel"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#141416]">More filters</h3>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="text-[#898989] hover:text-[#141416] transition-colors"
                    data-testid="filters-close"
                    aria-label="Close filters"
                  >
                    <X size={22} />
                  </button>
                </div>
                <ExtraFilters filters={filters} setFilters={setFilters} />
              </div>
              <div className="border-t border-[#ececef] px-6 md:px-8 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearExtraFilters}
                  className="text-sm font-medium text-[#832161] underline underline-offset-4 hover:text-[#6d1b51] transition-colors"
                  data-testid="extra-filters-clear"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => { fetchProviders(); setShowFilters(false); }}
                  style={{ borderRadius: '12px' }}
                  className="bg-[#832161] hover:bg-[#6d1b51] text-white font-semibold px-6 py-3 transition-colors"
                  data-testid="apply-filters-button"
                >
                  Apply filters
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Results */}
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(30)].map((_, i) => (
                <div key={i} className="shimmer aspect-[3/4]" data-testid={`skeleton-${i}`}></div>
              ))}
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-20" data-testid="no-results">
              <p className="text-[#A1A1AA] text-lg">No providers found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {providers.map((provider, index) => (
                <motion.div
                  key={provider.provider_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.02 }}
                  data-testid={`provider-card-${index}`}
                >
                  <Link
                    to={`/providers/${provider.provider_id}`}
                    className="block group"
                  >
                    <div className="relative w-full aspect-[3/4] overflow-hidden bg-[#141416] border border-[#dbdadd] hover:border-[#832161] transition-all duration-300">
                      <img
                        src={provider.photos?.[0] || 'https://images.unsplash.com/photo-1768609957045-591c79431f48?crop=entropy&cs=srgb&fm=jpg&q=85'}
                        alt={provider.display_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* VIP pill - top left */}
                      {provider.vip_active && (
                        <div
                          className="absolute top-2 left-2 px-2 py-1 bg-[#832161] text-white text-[10px] font-semibold uppercase tracking-wider rounded-sm flex items-center gap-1 shadow-lg"
                          data-testid={`vip-pill-${index}`}
                        >
                          <Crown size={11} weight="fill" />
                          VIP
                        </div>
                      )}

                      {/* Info overlay - always visible at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0C] to-transparent">
                        <div>
                          <h3 className="text-lg text-[#F2F0ED] mb-1 truncate flex items-center gap-1.5">
 <span className="truncate">{provider.display_name}</span>
 {provider.verified && (
 <CheckCircle
 size={16}
 weight="fill"
 className="text-[#22C55E] flex-shrink-0"
 data-testid={`verified-badge-${index}`}
 />
 )}
 </h3>
                          <div className="flex items-center gap-2 text-[#A1A1AA] text-xs mb-1">
                            <span>{provider.age}</span>
                            <span>•</span>
                            <span className="truncate">{provider.location?.city}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
