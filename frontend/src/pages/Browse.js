import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getProviders, reverseGeocode } from '@/services/api';
import { notifyError, notifyProblem } from '../lib/notify';
import { PublicPage, ProfileTile, Icon } from '@/components/site/Shell';
import ExtraFilters, { EXTRA_FILTER_DEFAULTS, extraFilterParams, extraFilterChips } from '@/components/ExtraFilters';
import '@/styles/public.css';

const DEFAULT_FILTERS = { city: '', gender: '', ...EXTRA_FILTER_DEFAULTS };
const CLOSE_TO_ME_KEY = 'ee-close-to-me';
const RECENT_KEY = 'lumiere-recent-providers';

const CATS = [
  { label: 'All', value: '', testId: 'filter-all' },
  { label: 'Female', value: 'female', testId: 'filter-female' },
  { label: 'Male', value: 'male', testId: 'filter-male' },
  { label: 'Trans', value: 'trans', testId: 'filter-trans' },
];

const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

const SlidersIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></svg>
);
const SmallX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export default function Browse() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_FILTERS, city: params.get('city') || '' }));
  const [panel, setPanel] = useState(false);
  const [offline, setOffline] = useState(false);
  const [closeToMe, setCloseToMe] = useState(() => lsGet(CLOSE_TO_ME_KEY) === '1');
  const [coords, setCoords] = useState(null);
  const [nearCity, setNearCity] = useState(null);
  // One shuffle seed per visit: the order changes on every visit but stays stable while filtering.
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const chips = extraFilterChips(filters);
  const activeCount = chips.length;

  const fetchProviders = async (override) => {
    const f = override || filtersRef.current;
    try {
      const params = { seed, ...extraFilterParams(f) };
      if (f.city) params.city = f.city;
      if (f.gender) params.gender = f.gender;
      if (coords) { params.origin_lat = coords.lat; params.origin_lng = coords.lng; }
      const r = await getProviders(params);
      setProviders(Array.isArray(r.data) ? r.data : []);
      setOffline(false);
    } catch (error) {
      let cached = [];
      try { cached = JSON.parse(lsGet(RECENT_KEY) || '[]'); } catch (e) { cached = []; }
      if (cached.length > 0 && !navigator.onLine) {
        setProviders(cached);
        setOffline(true);
      } else {
        notifyError(error, "We couldn't load profiles.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProviders(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filters.gender, coords]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      notifyProblem('Location unavailable', "Your browser doesn't support location access.");
      setCloseToMe(false); lsSet(CLOSE_TO_ME_KEY, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        reverseGeocode(c.lat, c.lng).then((r) => setNearCity(r.data?.city || null)).catch(() => setNearCity(null));
      },
      () => {
        notifyProblem('Location blocked', 'Allow location access to see escorts closest to you.');
        setCloseToMe(false); lsSet(CLOSE_TO_ME_KEY, null);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  useEffect(() => { if (closeToMe) requestLocation(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggleNear = () => {
    const next = !closeToMe;
    setCloseToMe(next);
    if (next) { lsSet(CLOSE_TO_ME_KEY, '1'); requestLocation(); }
    else { lsSet(CLOSE_TO_ME_KEY, null); setCoords(null); setNearCity(null); }
  };

  const apply = (next) => { setFilters(next); fetchProviders(next); };
  const clearAll = () => apply({ ...DEFAULT_FILTERS, city: filters.city, gender: filters.gender });
  const near = closeToMe && !!coords;
  const nearSub = closeToMe ? (nearCity ? `${nearCity} · nearest first` : 'Nearest first') : 'Uses your device location';

  return (
    <PublicPage bg="glow" mainClass="pub-browse">
      <div className="x-wrap">
        <h1 className="title" data-testid="browse-title">Discover Excellence</h1>

        <form
          role="search"
          aria-label="Find escorts"
          className="toolbar"
          onSubmit={(e) => { e.preventDefault(); fetchProviders(); }}
        >
          <div role="group" aria-label="Category and filters" className="box cats" data-testid="filter-card">
            {CATS.map((c) => (
              <button
                key={c.value || 'all'}
                type="button"
                className={`seg${filters.gender === c.value ? ' on' : ''}`}
                aria-pressed={filters.gender === c.value}
                onClick={() => setFilters({ ...filters, gender: c.value })}
                data-testid={c.testId}
              >
                {c.label}
              </button>
            ))}
            <span className="sep" aria-hidden="true" />
            <button
              type="button"
              className={`icon${panel || activeCount > 0 ? ' on' : ''}`}
              aria-label={activeCount > 0 ? `More filters, ${activeCount} active` : 'More filters'}
              title="More filters"
              aria-haspopup="dialog"
              aria-expanded={panel}
              onClick={() => setPanel((v) => !v)}
              data-testid="filters-button"
            >
              <SlidersIcon />
              {activeCount > 0 && <span className="count" data-testid="extra-filters-count">{activeCount}</span>}
            </button>
          </div>

          <label className={`box near${closeToMe ? ' on' : ''}`} data-testid="close-to-me-toggle">
            <input type="checkbox" checked={closeToMe} onChange={toggleNear} />
            <span className="txt">
              <span className="t1">Show escorts close to me</span>
              <span className="t2">{nearSub}</span>
            </span>
            <Icon.pin width="20" height="20" />
          </label>

          <div className="box find">
            <input
              type="search"
              aria-label="Search city or name"
              placeholder="Search city or name"
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              data-testid="city-search-input"
            />
            <button type="submit" className="go" aria-label="Search" data-testid="search-button"><Icon.search width="20" height="20" /></button>
          </div>

          {panel && (
            <div role="dialog" aria-label="More filters" className="panel" data-testid="filters-panel">
              <div className="phead">
                <h2>More filters</h2>
                <button type="button" className="x" aria-label="Close filters" onClick={() => setPanel(false)} data-testid="filters-close"><Icon.close width="20" height="20" /></button>
              </div>
              <ExtraFilters filters={filters} setFilters={setFilters} />
              <div className="pfoot">
                <button type="button" className="txtbtn" onClick={() => setFilters({ ...DEFAULT_FILTERS, city: filters.city, gender: filters.gender })} data-testid="extra-filters-clear">Clear all</button>
                <button type="button" className="x-btn primary" onClick={() => { fetchProviders(); setPanel(false); }} data-testid="apply-filters-button">
                  {activeCount > 0 ? `Apply filters (${activeCount})` : 'Apply filters'}
                </button>
              </div>
            </div>
          )}
        </form>

        {offline && (
          <div role="status" className="offline" data-testid="offline-banner">You're offline — showing profiles you've recently viewed.</div>
        )}

        {!loading && (
          <div className="meta">
            <div className="left" data-testid="active-filter-chips">
              <span aria-live="polite" className="cnt">{providers.length === 1 ? '1 profile' : `${providers.length} profiles`}</span>
              {near && (
                <span className="chip nearchip">
                  <Icon.pin width="14" height="14" />
                  {nearCity ? <>Showing results nearest to <strong>{nearCity}</strong></> : 'Showing results nearest to you'}
                  <button type="button" aria-label="Stop sorting by distance" onClick={toggleNear}><SmallX /></button>
                </span>
              )}
              {!panel && chips.map((c) => (
                <span key={c.key} className="chip act">
                  {c.label}
                  <button type="button" aria-label={`Remove filter ${c.label}`} onClick={() => apply({ ...filters, ...c.clear })} data-testid={`remove-chip-${c.key}`}><SmallX /></button>
                </span>
              ))}
            </div>
            {!panel && activeCount > 0 && (
              <button type="button" className="txtbtn" onClick={clearAll} data-testid="clear-filter-chips">Clear filters</button>
            )}
          </div>
        )}

        {loading ? (
          <div className="x-tiles c6 results">
            {[...Array(12)].map((_, i) => <div key={i} className="x-tile skeleton" aria-hidden="true" data-testid={`skeleton-${i}`}><div className="ph" /></div>)}
          </div>
        ) : providers.length > 0 ? (
          <>
            <div className="x-tiles c6 results">
              {providers.map((p, i) => <ProfileTile key={p.provider_id} provider={p} index={i} testId={`provider-card-${i}`} />)}
            </div>
            <p className="end">You&apos;ve seen all {providers.length === 1 ? '1 profile' : `${providers.length} profiles`}</p>
          </>
        ) : (
          <div className="x-glass empty" data-testid="no-results">
            <span className="ic"><Icon.search width="24" height="24" /></span>
            <h2>No providers found matching your criteria</h2>
            <p>Try another city or name, choose a different category, or clear some filters.</p>
            <button type="button" className="x-btn white" onClick={() => apply({ ...DEFAULT_FILTERS })}>Clear all filters</button>
          </div>
        )}
      </div>
    </PublicPage>
  );
}
