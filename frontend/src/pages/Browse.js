import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProviders } from '@/services/api';
import { notifyError, notifyProblem } from '../lib/notify';
import { MagnifyingGlass, MapPin, Faders, CheckCircle, Crown } from 'phosphor-react';
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

export default function Browse() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const { user } = useAuth();

  // Count of active "extra" filters (excludes city + gender — those are always visible).
  const isActive = (key) => {
    const v = filters[key];
    return v !== undefined && v !== null && String(v).length > 0;
  };
  const activeExtraCount = EXTRA_FILTER_KEYS.filter(isActive).length;

  useEffect(() => {
    fetchProviders();
  }, [filters.gender]);

  const fetchProviders = async () => {
    try {
      const params = {};
      if (filters.city) params.city = filters.city;
      if (filters.gender) params.gender = filters.gender;

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
        <div className="max-w-4xl mx-auto mb-10 md:mb-16">
          <h2 className="text-4xl md:text-5xl text-[#141416] mb-6 md:mb-8 text-center" data-testid="browse-title">
 Discover Excellence
 </h2>
          
          {/* Gender Filter Buttons */}
          <div className="flex items-center justify-center flex-wrap gap-2 md:gap-4 mb-8">
            <button
              onClick={() => setFilters({ ...filters, gender: '' })}
              className={`px-4 md:px-8 py-2.5 md:py-3 border uppercase tracking-wider text-xs md:text-sm font-medium transition-all ${
                filters.gender === ''
                  ? 'border-[#832161] bg-[#832161] text-white'
                  : 'border-[#832161] text-[#832161] font-bold hover:bg-[#832161]/10'
              }`}
              data-testid="filter-all"
            >
              All
            </button>
            <button
              onClick={() => setFilters({ ...filters, gender: 'female' })}
              className={`px-4 md:px-8 py-2.5 md:py-3 border uppercase tracking-wider text-xs md:text-sm font-medium transition-all ${
                filters.gender === 'female'
                  ? 'border-[#832161] bg-[#832161] text-white'
                  : 'border-[#832161] text-[#832161] font-bold hover:bg-[#832161]/10'
              }`}
              data-testid="filter-female"
            >
              Female
            </button>
            <button
              onClick={() => setFilters({ ...filters, gender: 'male' })}
              className={`px-4 md:px-8 py-2.5 md:py-3 border uppercase tracking-wider text-xs md:text-sm font-medium transition-all ${
                filters.gender === 'male'
                  ? 'border-[#832161] bg-[#832161] text-white'
                  : 'border-[#832161] text-[#832161] font-bold hover:bg-[#832161]/10'
              }`}
              data-testid="filter-male"
            >
              Male
            </button>
            <button
              onClick={() => setFilters({ ...filters, gender: 'trans' })}
              className={`px-4 md:px-8 py-2.5 md:py-3 border uppercase tracking-wider text-xs md:text-sm font-medium transition-all ${
                filters.gender === 'trans'
                  ? 'border-[#832161] bg-[#832161] text-white'
                  : 'border-[#832161] text-[#832161] font-bold hover:bg-[#832161]/10'
              }`}
              data-testid="filter-trans"
            >
              Trans
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative px-4 md:px-6 py-2.5 md:py-3 border uppercase tracking-wider text-xs md:text-sm font-medium transition-all flex items-center gap-2 ${
                showFilters || activeExtraCount > 0
                  ? 'border-[#832161] bg-[#832161] text-white'
                  : 'border-[#832161] text-[#832161] font-bold hover:bg-[#832161]/10'
              }`}
              data-testid="filters-button"
              aria-label="Extra filters"
            >
              <Faders size={18} />
              <span className="hidden sm:inline">Extra Filters</span>
              {activeExtraCount > 0 && (
                <span
                  className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-white text-[#832161] text-[10px] font-semibold leading-none"
                  data-testid="extra-filters-count"
                >
                  {activeExtraCount}
                </span>
              )}
            </button>
          </div>
          
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                placeholder="Search by city or name..."
                className="input-premium w-full pr-10"
                data-testid="city-search-input"
              />
              <MagnifyingGlass
                size={20}
                className="absolute right-3 text-[#52525B]"
              />
            </div>
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto"
              data-testid="search-button"
            >
              Search
            </button>
          </form>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-8 border border-[#3F3F46] p-6 md:p-8"
              data-testid="filters-panel"
            >
              <ExtraFilters
                filters={filters}
                setFilters={setFilters}
              />
              <div className="mt-8 flex justify-end items-center gap-4">
                <button
                  type="button"
                  onClick={handleClearExtraFilters}
                  className="text-xs uppercase tracking-[0.2em] text-[#A1A1AA] hover:text-[#DA4167] transition-colors"
                  data-testid="extra-filters-clear"
                >
                  Clear all filters
                </button>
                <button
                  type="button"
                  onClick={fetchProviders}
                  className="btn-primary"
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
