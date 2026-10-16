/*
 * Profile page: the profile comes ready from the server (resources/views/pages/profile.blade.php);
 * the gallery and lightbox, "Show number", the request form, the report dialog and
 * previous/next profile (also with the ← and → keys) work here.
 */
(function () {
  'use strict';

  var E = window.EEE, $ = E.$, $$ = E.$$, esc = E.esc;
  var dataEl = $('#profile-data');
  if (!dataEl) return;
  var P = JSON.parse(dataEl.textContent);
  var media = P.media || [];
  var N = media.length;
  var idx = 0;
  var lightbox = null;
  var report = null;
  var neighbors = { prev: null, next: null };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  var SVG = {
    chevL: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"></path></svg>',
    chevR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"></path></svg>',
    expand: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"></path></svg>',
    video: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"></rect><path d="m16 10 5-3v10l-5-3"></path></svg>',
    close20: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg>',
    upload: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"></path></svg>',
  };

  /* ---------- remember recently viewed profiles (Browse shows them when the visitor is offline) ---------- */
  try {
    var KEY = 'lumiere-recent-providers';
    var existing = JSON.parse(E.store.get(KEY) || '[]');
    var slim = { provider_id: P.provider_id, display_name: P.display_name, age: P.age, photos: P.photos, location: P.location, verified: P.verified, viewed_at: Date.now() };
    E.store.set(KEY, JSON.stringify([slim].concat(existing.filter(function (x) { return x.provider_id !== slim.provider_id; })).slice(0, 10)));
  } catch (e) { /* best effort */ }

  /* ---------- previous / next profile, in the Browse order ---------- */
  E.api('GET', '/providers', { params: { limit: 200 } }).then(function (list) {
    list = Array.isArray(list) ? list : [];
    var i = -1;
    list.forEach(function (p, j) { if (p.provider_id === P.provider_id) i = j; });
    if (i === -1) return;
    neighbors = { prev: i > 0 ? list[i - 1].provider_id : null, next: i < list.length - 1 ? list[i + 1].provider_id : null };
    $('#pnavs').innerHTML = (neighbors.prev ? '<a class="pnav" href="/providers/' + esc(neighbors.prev) + '" title="Previous profile (←)" data-testid="prev-profile-btn">' + SVG.chevL + 'Previous profile</a>' : '')
      + (neighbors.next ? '<a class="pnav" href="/providers/' + esc(neighbors.next) + '" title="Next profile (→)" data-testid="next-profile-btn">Next profile' + SVG.chevR + '</a>' : '');
  }, function () {});

  /* ---------- gallery ---------- */
  var main = $('#pp-main');

  function renderMain() {
    var cur = media[idx];
    if (!cur) return;
    var h = '';
    if (cur.video) {
      h += '<video src="' + esc(cur.url) + '" controls playsinline preload="metadata" class="media" data-testid="provider-video"></video><span class="vbadge">' + SVG.video + 'Video</span>';
    } else {
      h += '<button type="button" class="mediabtn" data-lightbox aria-label="Open full-size photo" data-testid="open-lightbox-' + idx + '"><img src="' + esc(cur.url) + '" alt="' + esc(P.display_name + ', photo ' + (idx + 1) + ' of ' + N) + '" class="media" data-testid="provider-photo-' + idx + '"></button>'
        + '<button type="button" class="round tr" aria-label="Open full-size photo" data-lightbox>' + SVG.expand + '</button>';
    }
    if (N > 1) h += '<button type="button" class="round l" aria-label="Previous photo" data-go="-1">' + SVG.chevL + '</button><button type="button" class="round r" aria-label="Next photo" data-go="1">' + SVG.chevR + '</button>';
    if (!cur.video) h += '<span class="counter">' + (idx + 1) + ' / ' + N + '</span>';
    main.innerHTML = h;
    $$('#pp-thumbs .thumb').forEach(function (t, i) {
      t.classList.toggle('on', i === idx);
      t.setAttribute('aria-pressed', i === idx ? 'true' : 'false');
    });
    if (lightbox) renderLightbox();
  }

  function go(d) { if (!N) return; idx = (idx + d + N) % N; renderMain(); }

  main.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (g) return go(+g.getAttribute('data-go'));
    if (e.target.closest('[data-lightbox]')) openLightbox();
  });
  var touchX = null;
  main.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  main.addEventListener('touchend', function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX = null;
  });
  $$('#pp-thumbs .thumb').forEach(function (t) {
    t.addEventListener('click', function () { idx = +t.getAttribute('data-idx'); renderMain(); });
    var v = $('video', t);
    if (v) {
      var showDuration = function () {
        var s = v.duration;
        if (!isFinite(s)) return;
        var d = $('.tdur', t);
        d.textContent = Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
        d.hidden = false;
      };
      if (v.readyState >= 1) showDuration(); // already loaded (from the browser cache)
      else v.addEventListener('loadedmetadata', showDuration);
    }
  });

  /* ---------- lightbox ---------- */
  function renderLightbox() {
    var cur = media[idx];
    if (!cur || cur.video) return closeLightbox();
    lightbox.innerHTML = '<span class="lbc" data-testid="lightbox-counter">' + (idx + 1) + ' / ' + N + '</span>'
      + '<button type="button" class="round lbx" aria-label="Close" data-lb="close" data-testid="lightbox-close">' + SVG.close20 + '</button>'
      + (N > 1 ? '<button type="button" class="round lbl" aria-label="Previous photo" data-lb="-1" data-testid="lightbox-prev">' + SVG.chevL + '</button>' : '')
      + '<img src="' + esc(cur.url) + '" alt="' + esc(P.display_name + ', photo ' + (idx + 1)) + '" data-testid="lightbox-image">'
      + (N > 1 ? '<button type="button" class="round lbr" aria-label="Next photo" data-lb="1" data-testid="lightbox-next">' + SVG.chevR + '</button>' : '');
  }
  function openLightbox() {
    if (lightbox) return;
    lightbox = document.createElement('div');
    lightbox.className = 'pp-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Photo viewer');
    lightbox.setAttribute('data-testid', 'lightbox-overlay');
    lightbox.addEventListener('click', function (e) {
      if (e.target.tagName === 'IMG') return;
      var b = e.target.closest('[data-lb]');
      if (b && b.getAttribute('data-lb') !== 'close') { e.stopPropagation(); return go(+b.getAttribute('data-lb')); }
      closeLightbox();
    });
    document.body.appendChild(lightbox);
    E.lockScroll(true);
    renderLightbox();
  }
  function closeLightbox() {
    if (!lightbox) return;
    lightbox.parentNode.removeChild(lightbox);
    lightbox = null;
    E.lockScroll(false);
  }

  /* ---------- keyboard: ←/→ = previous/next profile (photos when the lightbox is open) ---------- */
  window.addEventListener('keydown', function (e) {
    var tag = ((e.target && e.target.tagName) || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || report) return;
    if (lightbox) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      return;
    }
    if (e.key === 'ArrowRight' && neighbors.next) window.location.assign('/providers/' + neighbors.next);
    else if (e.key === 'ArrowLeft' && neighbors.prev) window.location.assign('/providers/' + neighbors.prev);
  });

  /* ---------- phone number ---------- */
  var show = $('#show-phone');
  if (show) {
    show.addEventListener('click', function () {
      $('#phone-num').innerHTML = '<a href="tel:' + esc(P.phone.replace(/\s+/g, '')) + '" data-testid="phone-number">' + esc(P.phone) + '</a>';
    });
  }

  /* ---------- request form ---------- */
  var form = $('#req-form');
  var f = function (n) { return $('[name="req-' + n + '"]', form); };
  var send = $('#req-send');
  var sending = false;
  var syncReq = function () {
    var m = f('message');
    if (m.value.length > 350) m.value = m.value.slice(0, 350);
    $('#req-count').textContent = m.value.length + '/350 characters';
    send.disabled = sending || !m.value.trim();
  };
  f('message').addEventListener('input', syncReq);
  send.addEventListener('click', function () {
    var name = f('name').value.trim(), email = f('email').value.trim(), message = f('message').value.trim();
    if (!name) return E.notifyProblem('Your name is missing.', 'Enter your name so ' + P.display_name + ' knows who is contacting.');
    if (!EMAIL_RE.test(email)) return E.notifyProblem('That e-mail address looks invalid.', 'Enter a valid e-mail (e.g. you@example.com) so ' + P.display_name + ' can reply.');
    if (!message) return E.notifyProblem('Your message is empty.', 'Write a short request describing what you are looking for.');
    sending = true;
    $('span', send).textContent = 'Sending…';
    syncReq();
    E.api('POST', '/enquiries', { body: { provider_id: P.provider_id, name: name, email: email, message: message } }).then(function () {
      f('name').value = ''; f('email').value = ''; f('message').value = '';
      form.hidden = true;
      $('#req-sent').hidden = false;
    }, function (err) {
      E.notifyError(err, "We couldn't send your request.");
    }).then(function () {
      sending = false;
      $('span', send).textContent = 'Send request';
      syncReq();
    });
  });
  $('#req-again').addEventListener('click', function () { $('#req-sent').hidden = true; form.hidden = false; });

  /* ---------- report dialog ---------- */
  function renderReport() {
    var imgs = report.images.map(function (src, i) {
      return '<span><img src="' + esc(src) + '" alt="Evidence ' + (i + 1) + '"><button type="button" aria-label="Remove image ' + (i + 1) + '" data-rm="' + i + '" data-testid="report-image-remove-' + i + '">' + E.icon.close12 + '</button></span>';
    }).join('');
    $('.up', report.el).innerHTML = '<span class="ul">Upload pictures <em>(optional)</em></span>'
      + (report.images.length < 5 ? '<label class="drop" data-testid="report-upload-label">' + SVG.upload + 'Add images<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-testid="report-upload-input"></label>' : '')
      + (report.images.length ? '<div class="prev" data-testid="report-image-previews">' + imgs + '</div>' : '')
      + '<span class="hint">Up to 5 images · JPG, PNG or WEBP · max 5 MB each</span>';
  }

  function openReport() {
    var scrim = document.createElement('div');
    scrim.className = 'pp-scrim';
    scrim.innerHTML = '<div role="dialog" aria-modal="true" aria-labelledby="rep-title" class="pp-dialog" data-testid="report-profile-modal">'
      + '<div class="dh"><div><h2 id="rep-title">Report this profile</h2><p>Help us keep the platform safe. Tell us why you believe this profile is fake — our administrators will review your report.</p></div>'
      + '<button type="button" class="dx" aria-label="Close" data-close>' + SVG.close20 + '</button></div>'
      + '<div class="db"><div class="two"><label><span>Your name</span><input class="lin" type="text" placeholder="Your name" name="rep-name" data-testid="report-name-input"></label>'
      + '<label><span>Your e-mail address</span><input class="lin" type="email" placeholder="your@email.com" name="rep-email" data-testid="report-email-input"></label></div>'
      + '<label><span>Description</span><textarea class="lin" maxlength="500" placeholder="Describe why you think this profile is fake…" name="rep-text" data-testid="report-description-input"></textarea><span class="cnt">0/500 characters</span></label>'
      + '<div class="up"></div></div>'
      + '<div class="df"><button type="button" class="x-btn white" data-close data-testid="report-cancel-button">Cancel</button><button type="button" class="x-btn primary" data-submit data-testid="report-submit-button">Submit report</button></div></div>';
    document.body.appendChild(scrim);
    report = { el: scrim, images: [] };
    E.lockScroll(true);
    renderReport();
    var text = $('[name="rep-text"]', scrim);
    text.addEventListener('input', function () { if (text.value.length > 500) text.value = text.value.slice(0, 500); $('.cnt', scrim).textContent = text.value.length + '/500 characters'; });
    scrim.addEventListener('mousedown', function (e) { if (e.target === scrim) closeReport(); });
    scrim.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) return closeReport();
      var rm = e.target.closest('[data-rm]');
      if (rm) { report.images.splice(+rm.getAttribute('data-rm'), 1); renderReport(); return; }
      if (e.target.closest('[data-submit]')) submitReport(e.target.closest('[data-submit]'));
    });
    scrim.addEventListener('change', function (e) {
      if (e.target.type !== 'file') return;
      var files = Array.prototype.slice.call(e.target.files || []);
      var ok = ['image/jpeg', 'image/png', 'image/webp'];
      var picked = files.filter(function (x) { return ok.indexOf(x.type) !== -1 && x.size <= 5 * 1024 * 1024; });
      if (picked.length !== files.length) E.notifyProblem('Some files were skipped.', 'Only JPG, PNG or WEBP images up to 5 MB each are allowed.');
      picked.slice(0, 5 - report.images.length).forEach(function (file) {
        var fr = new FileReader();
        fr.onload = function () { if (report && report.images.length < 5) { report.images.push(fr.result); renderReport(); } };
        fr.readAsDataURL(file);
      });
      e.target.value = '';
    });
    $('[name="rep-name"]', scrim).focus();
  }

  function closeReport() {
    if (!report) return;
    report.el.parentNode.removeChild(report.el);
    report = null;
    E.lockScroll(false);
  }

  function submitReport(btn) {
    var el = report.el;
    var name = $('[name="rep-name"]', el).value.trim(), email = $('[name="rep-email"]', el).value.trim(), text = $('[name="rep-text"]', el).value.trim();
    if (!name) return E.notifyProblem('Your name is missing.', 'Enter your name so we know who filed the report.');
    if (!EMAIL_RE.test(email)) return E.notifyProblem('That e-mail address looks invalid.', 'Enter a valid e-mail so we can follow up.');
    if (!text) return E.notifyProblem('The description is empty.', 'Briefly describe why you believe this profile is fake.');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    E.api('POST', '/reports', { body: { provider_id: P.provider_id, reporter_name: name, reporter_email: email, description: text, images: report.images } }).then(function () {
      E.toast('success', 'Report submitted. Thank you — our team will review it.');
      closeReport();
    }, function (err) {
      E.notifyError(err, "We couldn't submit your report.");
      btn.disabled = false;
      btn.textContent = 'Submit report';
    });
  }

  $('#report-open').addEventListener('click', openReport);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && report) closeReport(); });
})();
