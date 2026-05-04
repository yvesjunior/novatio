/* Component loader: <div data-component="NAME"></div> -> /partials/NAME.html
 * Also marks the active nav item after the header loads. */
(function () {
  function markActiveMenu() {
    var path = location.pathname.replace(/\/+$/, '') || '/';
    document.querySelectorAll('.pxl-menu-primary a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      var hp = href.replace(/\?.*$/, '').replace(/\/+$/, '') || '/';
      if (hp === path && a.closest('li')) {
        a.closest('li').classList.add('current-menu-item');
        // walk up: any parent <li> gets current-menu-ancestor
        var li = a.closest('li').parentElement;
        while (li) {
          if (li.tagName === 'LI') li.classList.add('current-menu-parent', 'current-menu-ancestor');
          li = li.parentElement;
        }
      }
    });
  }
  function loadOne(el) {
    var name = el.getAttribute('data-component');
    if (!name) return Promise.resolve();
    return fetch('/partials/' + name + '.html', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (html) {
        if (!html) return;
        el.outerHTML = html;
      })
      .catch(function () {});
  }
  function init() {
    var els = Array.from(document.querySelectorAll('[data-component]'));
    Promise.all(els.map(loadOne)).then(function () {
      markActiveMenu();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
