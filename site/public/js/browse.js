/*
 * Browse page: the first list comes ready from the server (resources/views/pages/browse.blade.php);
 * the category buttons, search, "More filters" panel, chips and "close to me" work here.
 */
(function () {
  'use strict';

  var E = window.EEE, $ = E.$, $$ = E.$$;
  var root = $('#browse');
  if (!root) return;

  var seed = root.getAttribute('data-seed');
  var form = $('#browse-form');
  var panel = $('#filters-panel');
  var filtersBtn = $('#filters-button');
  var cityInput = $('input[name="city"]', form);
  var NEAR_KEY = 'ee-close-to-me';
  var RECENT_KEY = 'lumiere-recent-providers';

  var SELECTS = { service: 'Service', nationality: 'Nationality', ethnicity: 'Ethnicity', orientation: 'Orientation' };
  var RANGES = {
    rate: { label: '1 hour', pre: '€', unit: '' },
    age: { label: 'Age', pre: '', unit: ' yrs' },
    height: { label: 'Height', pre: '', unit: ' cm' },
    weight: { label: 'Weight', pre: '', unit: ' kg' },
  };
  var SEGMENTS = { breast_type: 'Breast type', breast_size: 'Breast size', tattoos: 'Tattoos', piercings: 'Piercings', smoker: 'Smoker' };
  var filled = function (v) { return v !== undefined && v !== null && String(v).trim().length > 0; };

  var gender = '';
  var coords = null;
  var nearCity = null;
  var closeToMe = E.store.get(NEAR_KEY) === '1';

  /* ---------- the extra filters live in the panel's fields ---------- */

  var field = function (name) { return panel.querySelector('[name="' + name + '"]'); };

  function readExtras() {
    var f = {};
    Object.keys(SELECTS).forEach(function (k) { f[k] = field(k).value; });
    Object.keys(RANGES).forEach(function (k) { f['min_' + k] = field('min_' + k).value; f['max_' + k] = field('max_' + k).value; });
    Object.keys(SEGMENTS).forEach(function (k) {
      var on = panel.querySelector('[data-seg="' + k + '"] [aria-pressed="true"]');
      f[k] = on ? on.getAttribute('data-value') : '';
    });
    f.languages = $$('[data-lang][aria-pressed="true"]', panel).map(function (b) { return b.getAttribute('data-lang'); });
    return f;
  }

  function setSeg(name, value) {
    $$('[data-seg="' + name + '"] button', panel).forEach(function (b) {
      var on = b.getAttribute('data-value') === value;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.className = on ? (value ? 'on val' : 'on any') : '';
    });
  }

  /** Change some extra filters (keys as in readExtras), then refresh the visible state. */
  function writeExtras(patch) {
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (k === 'languages') {
        $$('[data-lang]', panel).forEach(function (b) {
          var on = v.indexOf(b.getAttribute('data-lang')) !== -1;
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.className = on ? 'on' : '';
        });
      } else if (SEGMENTS[k]) {
        setSeg(k, v);
      } else if (field(k)) {
        field(k).value = v;
      }
    });
    syncFields();
    updateUi();
  }

  function clearExtras() {
    var p = { languages: [] };
    Object.keys(SELECTS).forEach(function (k) { p[k] = ''; });
    Object.keys(RANGES).forEach(function (k) { p['min_' + k] = ''; p['max_' + k] = ''; });
    Object.keys(SEGMENTS).forEach(function (k) { p[k] = ''; });
    writeExtras(p);
  }

  /** Highlight filled fields (class "on"), as in the React version. */
  function syncFields() {
    $$('.ef-in', panel).forEach(function (el) { el.classList.toggle('on', filled(el.value)); });
  }

  function chips(f) {
    var out = [];
    Object.keys(SELECTS).forEach(function (k) {
      if (filled(f[k])) { var c = {}; c[k] = ''; out.push({ key: k, label: SELECTS[k] + ': ' + f[k], clear: c }); }
    });
    Object.keys(RANGES).forEach(function (k) {
      var r = RANGES[k], lo = f['min_' + k], hi = f['max_' + k];
      if (!filled(lo) && !filled(hi)) return;
      var fmt = function (x) { return r.pre + x + r.unit; };
      var txt = filled(lo) && filled(hi) ? r.pre + lo + '–' + hi + r.unit : filled(lo) ? 'from ' + fmt(lo) : 'up to ' + fmt(hi);
      var c = {}; c['min_' + k] = ''; c['max_' + k] = '';
      out.push({ key: k, label: r.label + ': ' + txt, clear: c });
    });
    if (f.languages.length) out.push({ key: 'languages', label: 'Speaks: ' + f.languages.join(', '), clear: { languages: [] } });
    Object.keys(SEGMENTS).forEach(function (k) {
      var v = f[k];
      if (!filled(v)) return;
      var c = {}; c[k] = '';
      out.push({ key: k, label: SEGMENTS[k] + ': ' + (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : v), clear: c });
    });
    return out;
  }

  function params() {
    var f = readExtras();
    var p = { seed: seed };
    Object.keys(f).forEach(function (k) {
      if (k === 'languages') { if (f.languages.length) p.languages = f.languages.join(','); }
      else if (filled(f[k])) p[k] = String(f[k]).trim();
    });
    if (cityInput.value) p.city = cityInput.value;
    if (gender) p.gender = gender;
    if (coords) { p.origin_lat = coords.lat; p.origin_lng = coords.lng; }
    return p;
  }

  /* ---------- what the page shows ---------- */

  var count = 0;
  var countText = function (n) { return n === 1 ? '1 profile' : n + ' profiles'; };

  function updateUi() {
    var list = chips(readExtras());
    var open = !panel.hidden;
    var badge = $('.count', filtersBtn);
    badge.hidden = list.length === 0;
    badge.textContent = list.length;
    filtersBtn.classList.toggle('on', open || list.length > 0);
    filtersBtn.setAttribute('aria-label', list.length ? 'More filters, ' + list.length + ' active' : 'More filters');
    filtersBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    $('#filters-apply').textContent = list.length ? 'Apply filters (' + list.length + ')' : 'Apply filters';

    var box = $('#chips');
    var html = '<span aria-live="polite" class="cnt" id="count">' + countText(count) + '</span>';
    if (closeToMe && coords) {
      html += '<span class="chip nearchip">' + E.icon.pin14
        + (nearCity ? 'Showing results nearest to <strong>' + E.esc(nearCity) + '</strong>' : 'Showing results nearest to you')
        + '<button type="button" aria-label="Stop sorting by distance" data-near-off>' + E.icon.smallx + '</button></span>';
    }
    if (!open) {
      list.forEach(function (c, i) {
        html += '<span class="chip act">' + E.esc(c.label) + '<button type="button" aria-label="Remove filter ' + E.esc(c.label) + '" data-chip="' + i + '" data-testid="remove-chip-' + c.key + '">' + E.icon.smallx + '</button></span>';
      });
    }
    box.innerHTML = html;
    $$('[data-chip]', box).forEach(function (b) {
      b.addEventListener('click', function () { writeExtras(list[+b.getAttribute('data-chip')].clear); load(); });
    });
    var off = $('[data-near-off]', box);
    if (off) off.addEventListener('click', toggleNear);
    $('#chips-clear').hidden = open || list.length === 0;

    $('#near').classList.toggle('on', closeToMe);
    $('#near-input').checked = closeToMe;
    $('#near-sub').textContent = closeToMe ? (nearCity ? nearCity + ' · nearest first' : 'Nearest first') : 'Uses your device location';
  }

  function render(list) {
    count = list.length;
    var out = $('#results');
    if (list.length) {
      out.innerHTML = '<div class="x-tiles c6 results">' + list.map(function (p, i) { return E.tile(p, i, 'provider-card-' + i); }).join('')
        + '</div><p class="end">You\'ve seen all ' + countText(list.length) + '</p>';
    } else {
      out.innerHTML = '<div class="x-glass empty" data-testid="no-results"><span class="ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg></span>'
        + '<h2>No providers found matching your criteria</h2><p>Try another city or name, choose a different category, or clear some filters.</p>'
        + '<button type="button" class="x-btn white" data-clear-all>Clear all filters</button></div>';
    }
    updateUi();
  }

  function load() {
    return E.api('GET', '/providers', { params: params() }).then(function (data) {
      $('#offline').hidden = true;
      render(Array.isArray(data) ? data : []);
    }, function (error) {
      var cached = [];
      try { cached = JSON.parse(E.store.get(RECENT_KEY) || '[]'); } catch (e) { cached = []; }
      if (cached.length > 0 && !navigator.onLine) {
        $('#offline').hidden = false;
        render(cached);
      } else {
        E.notifyError(error, "We couldn't load profiles.");
      }
    });
  }

  /* ---------- close to me ---------- */

  function stopNear() {
    closeToMe = false;
    E.store.set(NEAR_KEY, null);
    updateUi();
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      E.notifyProblem('Location unavailable', "Your browser doesn't support location access.");
      return stopNear();
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      load();
      E.api('GET', '/geo/reverse', { params: coords }).then(function (r) { nearCity = (r && r.city) || null; updateUi(); }, function () { nearCity = null; updateUi(); });
    }, function () {
      E.notifyProblem('Location blocked', 'Allow location access to see escorts closest to you.');
      stopNear();
    }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
  }

  function toggleNear() {
    closeToMe = !closeToMe;
    if (closeToMe) {
      E.store.set(NEAR_KEY, '1');
      requestLocation();
    } else {
      E.store.set(NEAR_KEY, null);
      var had = !!coords;
      coords = null; nearCity = null;
      if (had) load();
    }
    updateUi();
  }

  /* ---------- events ---------- */

  form.addEventListener('submit', function (e) { e.preventDefault(); load(); });

  $$('[data-gender]', form).forEach(function (b) {
    b.addEventListener('click', function () {
      gender = b.getAttribute('data-gender');
      $$('[data-gender]', form).forEach(function (x) {
        var on = x === b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      load();
    });
  });

  $('#near-input').addEventListener('change', toggleNear);

  var setPanel = function (open) { panel.hidden = !open; updateUi(); };
  filtersBtn.addEventListener('click', function () { setPanel(panel.hidden); });
  $('#filters-close').addEventListener('click', function () { setPanel(false); });
  $('#filters-clear').addEventListener('click', clearExtras);
  $('#filters-apply').addEventListener('click', function () { load(); setPanel(false); });
  $('#chips-clear').addEventListener('click', function () { clearExtras(); load(); });

  panel.addEventListener('input', function () { syncFields(); updateUi(); });
  panel.addEventListener('change', function () { syncFields(); updateUi(); });
  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var seg = b.closest('[data-seg]');
    if (seg) { setSeg(seg.getAttribute('data-seg'), b.getAttribute('data-value')); updateUi(); return; }
    var lang = b.getAttribute('data-lang');
    if (lang) { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.className = on ? 'on' : ''; updateUi(); }
  });

  // "Clear all filters" on the empty result: everything back to the start, including category and search.
  $('#results').addEventListener('click', function (e) {
    if (!e.target.closest('[data-clear-all]')) return;
    clearExtras();
    cityInput.value = '';
    gender = '';
    $$('[data-gender]', form).forEach(function (x) { var on = x.getAttribute('data-gender') === ''; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    load();
  });

  count = $$('#results .x-tile').length;
  updateUi();
  if (closeToMe) requestLocation();
})();
