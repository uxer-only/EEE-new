/* Terms page: highlights the part being read in "On this page" and scrolls smoothly to a part. */
(function () {
  'use strict';
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  var setCurrent = function (id) {
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      e.preventDefault();
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
      setCurrent(id);
    });
  });
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    var vis = entries.filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
    if (vis[0]) setCurrent(vis[0].target.id);
  }, { rootMargin: '-90px 0px -60% 0px' });
  links.forEach(function (a) {
    var el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) io.observe(el);
  });
})();
