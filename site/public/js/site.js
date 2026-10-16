/*
 * Shared script of the public pages: header and mobile menu, age check, page-view counter,
 * toast messages, calls to the API (/api/...) and the profile tile used by Browse.
 * Plain JavaScript, no build step. Page scripts (browse.js, profile.js, terms.js) use window.EEE.
 */
(function () {
  'use strict';

  var EEE = (window.EEE = {});
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  EEE.$ = $;
  EEE.$$ = $$;

  /** Escape text for use inside HTML. */
  EEE.esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  EEE.store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  /* ---------------------------------------------------------------- API */

  /** Call the API. Resolves with the answer; an error carries `response: { status, data }`. */
  EEE.api = function (method, path, opts) {
    opts = opts || {};
    var qs = '';
    if (opts.params) {
      var parts = [];
      Object.keys(opts.params).forEach(function (k) {
        var v = opts.params[k];
        if (v !== undefined && v !== null && v !== '') parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
      });
      qs = parts.length ? '?' + parts.join('&') : '';
    }
    var init = { method: method, credentials: 'same-origin' };
    if (opts.body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(opts.body);
    }
    return fetch('/api' + path + qs, init).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          var err = new Error('Request failed with status ' + res.status);
          err.response = { status: res.status, data: data };
          throw err;
        }
        return data;
      });
    }, function () {
      var err = new Error('Network error');
      err.response = undefined;
      throw err;
    });
  };

  /* ---------------------------------------------------------------- toasts */

  var toaster = null;
  var ICONS = {
    success: '<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd"></path></svg>',
    error: '<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path></svg>',
  };

  /** Show a short message in the bottom-right corner. type: 'success' | 'error'. */
  EEE.toast = function (type, title, description) {
    if (!toaster) {
      var sec = document.createElement('section');
      sec.setAttribute('aria-label', 'Notifications');
      sec.innerHTML = '<ol class="eee-toaster" aria-live="polite"></ol>';
      document.body.appendChild(sec);
      toaster = sec.firstChild;
    }
    var li = document.createElement('li');
    li.className = 'eee-toast';
    li.setAttribute('role', type === 'error' ? 'alert' : 'status');
    li.innerHTML = '<span class="ti">' + (ICONS[type] || '') + '</span><div class="tc"><div class="tt">' + EEE.esc(title) + '</div>'
      + (description ? '<div class="eee-toast-desc">' + EEE.esc(description) + '</div>' : '') + '</div>'
      + '<button type="button" class="tx" aria-label="Close message">&times;</button>';
    toaster.appendChild(li);
    while (toaster.children.length > 3) toaster.removeChild(toaster.firstChild);
    var close = function () {
      if (!li.parentNode) return;
      li.classList.add('out');
      setTimeout(function () { if (li.parentNode) li.parentNode.removeChild(li); }, 200);
    };
    li.querySelector('.tx').addEventListener('click', close);
    var timer = setTimeout(close, type === 'error' ? 6000 : 4000);
    li.addEventListener('mouseenter', function () { clearTimeout(timer); });
    li.addEventListener('mouseleave', function () { timer = setTimeout(close, 2000); });
  };

  var FIELD_LABELS = {
    display_name: 'Display name', location: 'Location', city: 'City', country: 'Country', email: 'Email',
    password: 'Password', new_password: 'New password', age: 'Age', name: 'Name', message: 'Message',
    phone: 'Phone number', agency_name: 'Agency name', services: 'Services', rates: 'Rates', photos: 'Photos',
  };
  var humanize = function (k) { return FIELD_LABELS[k] || String(k).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); };
  var uniq = function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); };

  /** Turn an API error into { title, description } ("what happened" and "what to do"). */
  EEE.describeError = function (error, fallbackWhat) {
    fallbackWhat = fallbackWhat || 'Something went wrong.';
    if (!error || !error.response) {
      return { title: "We couldn't reach the server.", description: 'What to do: Check your internet connection and try again in a moment. If it keeps failing, refresh the page.' };
    }
    var status = error.response.status;
    var detail = error.response.data && error.response.data.detail;
    if (typeof detail === 'string' && detail.trim()) {
      var act = { 401: 'Please sign in again to continue.', 403: 'If you believe this is a mistake, contact support.', 404: 'Please refresh the page and try again.', 409: 'Please refresh to load the latest data, then retry.' };
      return { title: detail, description: 'What to do: ' + (act[status] || 'Please correct this and try again.') };
    }
    if (status === 422 && Array.isArray(detail)) {
      var missing = [], invalid = [];
      detail.forEach(function (item) {
        var loc = (item && Array.isArray(item.loc)) ? item.loc : [];
        var field = loc.filter(function (p) { return p !== 'body' && p !== 'query'; }).pop();
        if (!field) return;
        (item.type === 'missing' ? missing : invalid).push(humanize(field));
      });
      var parts = [];
      if (missing.length) parts.push('fill in ' + uniq(missing).join(', '));
      if (invalid.length) parts.push('fix ' + uniq(invalid).join(', '));
      return { title: fallbackWhat, description: 'What to do: ' + (parts.length ? 'Please ' + parts.join(' and ') + ', then try again.' : 'Please review the highlighted fields and try again.') };
    }
    var byStatus = {
      401: ['Your session has expired.', 'Please sign in again to continue.'],
      403: ["You don't have permission to do that.", 'Sign in with the right account, or contact support if this seems wrong.'],
      404: ["We couldn't find what you were looking for.", 'Refresh the page — the item may have been moved or removed.'],
      413: ['Your upload is too large.', 'Remove a few photos or use smaller, compressed images (aim for under 10 MB each), then try again.'],
      429: ['Too many attempts.', 'Please wait a minute before trying again.'],
    };
    if (byStatus[status]) return { title: byStatus[status][0], description: 'What to do: ' + byStatus[status][1] };
    if (status >= 500) return { title: 'The server ran into a problem.', description: 'What to do: Please try again in a few moments. If it keeps happening, contact support.' };
    return { title: fallbackWhat, description: 'What to do: Please try again. If the problem continues, contact support.' };
  };
  EEE.notifyError = function (error, fallbackWhat) {
    var m = EEE.describeError(error, fallbackWhat);
    EEE.toast('error', m.title, m.description);
  };
  EEE.notifyProblem = function (what, action) {
    EEE.toast('error', what, action ? 'What to do: ' + action : '');
  };

  /* ---------------------------------------------------------------- page scrolling lock (dialogs) */

  var locks = 0;
  var prevOverflow = '';
  EEE.lockScroll = function (on) {
    if (on) { if (locks++ === 0) { prevOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; } }
    else if (locks > 0 && --locks === 0) { document.body.style.overflow = prevOverflow; }
  };

  /* ---------------------------------------------------------------- icons and the profile tile */

  var ICON = {
    crown: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"></path></svg>',
    verified: '<svg width="14" height="14" viewBox="0 0 24 24" role="img" aria-label="Verified" style="flex-shrink:0"><circle cx="12" cy="12" r="11" fill="#2F7A55"></circle><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
    smallx: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    pin14: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"></path><circle cx="12" cy="9.5" r="2.5"></circle></svg>',
    close12: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
  };
  EEE.icon = ICON;

  var TINTS = [
    ['#7A5468', '#3C2733', '#B58AA0'], ['#5E5476', '#2E2840', '#9A8DBA'], ['#4E6A5E', '#24332D', '#88AE9C'],
    ['#7A6048', '#3A2C20', '#C2A07C'], ['#74505C', '#36242B', '#B07F90'], ['#525A78', '#262A3C', '#8E98BC'],
  ];

  EEE.isVip = function (p) {
    if (typeof p.vip_active === 'boolean') return p.vip_active;
    return !!(p.vip_until && new Date(p.vip_until) > new Date());
  };

  /** HTML of one profile tile. Same markup as resources/views/partials/tile.blade.php. */
  EEE.tile = function (p, i, testId) {
    var esc = EEE.esc;
    var t = TINTS[i % TINTS.length];
    var photo = p.photos && p.photos[0];
    var meta = [p.age, p.location && p.location.city].filter(Boolean).join(' · ');
    var vip = EEE.isVip(p);
    var label = p.display_name + (meta ? ', ' + meta : '') + (p.verified ? ', verified' : '') + (vip ? ', VIP' : '');
    return '<a class="x-tile" data-testid="' + esc(testId) + '" aria-label="' + esc(label) + '" href="/providers/' + esc(p.provider_id) + '">'
      + '<div class="ph"' + (photo ? '' : ' style="background:linear-gradient(180deg, ' + t[0] + ' 0%, ' + t[1] + ' 100%)"') + '>'
      + (photo
        ? '<img src="' + esc(photo) + '" alt="" loading="' + (i < 6 ? 'eager' : 'lazy') + '">'
        : '<svg class="fig" viewBox="0 0 120 160" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="60" cy="66" r="22" fill="' + t[2] + '"></circle><path d="M18 160c0-38 18-58 42-58s42 20 42 58z" fill="' + t[2] + '"></path></svg>')
      + (vip ? '<span class="x-vip">' + ICON.crown + 'VIP</span>' : '')
      + '<div class="bar"><div class="nm"><span>' + esc(p.display_name) + '</span>' + (p.verified ? ICON.verified : '') + '</div>'
      + (meta ? '<div class="mt">' + esc(meta) + '</div>' : '') + '</div></div></a>';
  };

  /* ---------------------------------------------------------------- header */

  var nav = $('.x-nav');
  var menu = $('#x-menu');
  var burger = $('.x-burger');
  var setMenu = function (open) {
    if (!nav || !menu) return;
    nav.classList.toggle('open', open);
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  if (burger) burger.addEventListener('click', function () { setMenu(menu.hidden); });
  if (menu) menu.addEventListener('click', function (e) { if (e.target.closest('a,button')) setMenu(false); });
  var onScroll = function () { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  $$('[data-logout]').forEach(function (b) {
    b.addEventListener('click', function () {
      EEE.api('POST', '/auth/logout', { body: {} }).catch(function () { /* signed out locally anyway */ })
        .then(function () { window.location.assign('/'); });
    });
  });

  /* Photo background: dims once the visitor scrolls past half the screen. */
  var photo = $('.x-photo');
  if (photo) {
    var onPhoto = function () { photo.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.5); };
    onPhoto();
    window.addEventListener('scroll', onPhoto, { passive: true });
  }

  /* ---------------------------------------------------------------- age check */

  var age = $('#x-age');
  if (age) {
    if (document.documentElement.classList.contains('age-ok')) {
      age.parentNode.removeChild(age);
    } else {
      EEE.lockScroll(true);
      $('[data-age-ok]', age).addEventListener('click', function () {
        EEE.store.set('ageConfirmed', 'true');
        document.documentElement.classList.add('age-ok');
        age.parentNode.removeChild(age);
        EEE.lockScroll(false);
      });
    }
  }

  /* ---------------------------------------------------------------- copy buttons (Contact page) */

  $$('[data-copy]').forEach(function (b) {
    var text = b.getAttribute('data-copy');
    var label = $('[aria-live]', b);
    var icon = $('.ci', b);
    var original = icon ? icon.innerHTML : '';
    b.addEventListener('click', function () {
      var done = function () {
        label.textContent = 'Copied';
        if (icon) icon.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2F7A55" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"></path></svg>';
        setTimeout(function () { label.textContent = 'Copy address'; if (icon) icon.innerHTML = original; }, 2500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy this address:', text); });
      } else {
        window.prompt('Copy this address:', text);
      }
    });
  });

  /* ---------------------------------------------------------------- page-view counter (no cookies, no IP stored) */

  EEE.api('POST', '/track', { body: { page: window.location.pathname + window.location.search } }).catch(function () {});
})();
