/* Google Analytics with consent, for where2charge.4abnc.com.
   gtag.js loads only after the visitor accepts analytics cookies. Until then, or after
   declining, gtag() calls (e.g. the onclick tracking on links) are dropped and nothing is
   sent to Google. "Cookie settings" links call w2cCookieSettings() to change the choice. */
(function () {
  var GA_ID = 'G-66145CF3RP';
  var KEY = 'w2c_analytics_consent';
  var loaded = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    if (loaded) window.dataLayer.push(arguments);
  };

  function read() {
    try { var v = localStorage.getItem(KEY); return v === 'granted' || v === 'denied' ? v : null; } catch (e) { return null; }
  }
  function save(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* private mode: applies to this visit */ }
  }

  function load() {
    if (loaded) return;
    loaded = true;
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  /* Removes _ga cookies from this host and its parent domains. */
  function deleteCookies() {
    var parts = location.hostname.split('.');
    var domains = [''];
    for (var i = 0; i < parts.length - 1; i++) domains.push('; domain=.' + parts.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name !== '_ga' && name.indexOf('_ga_') !== 0) return;
      domains.forEach(function (d) { document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d; });
    });
  }

  var banner = null;
  function close() { if (banner) { banner.remove(); banner = null; } }

  function choose(v) {
    var before = read();
    save(v);
    close();
    if (v === 'granted') load();
    else if (before === 'granted' || loaded) { deleteCookies(); location.reload(); }
  }

  function show() {
    if (banner) return;
    banner = document.createElement('section');
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-labelledby', 'w2c-consent-title');
    banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:100;display:flex;justify-content:center;padding:0 12px 12px;pointer-events:none;font-family:inherit';
    banner.innerHTML =
      '<div style="pointer-events:auto;width:100%;max-width:440px;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:20px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.5)">' +
        '<h2 id="w2c-consent-title" style="margin:0;font-size:15px;font-weight:700">Analytics cookies</h2>' +
        '<p style="margin:6px 0 0;font-size:14px;line-height:1.55;color:#cbd5e1">May we use Google Analytics cookies to count visits and which links are used? ' +
        'It never receives your location or account details. <a href="/privacy.html" style="color:#34d399;font-weight:600;text-decoration:underline">Privacy Policy</a></p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px">' +
          '<button type="button" data-choice="denied" style="height:44px;border-radius:999px;border:1px solid #475569;background:transparent;color:#f1f5f9;font:inherit;font-size:14px;font-weight:700;cursor:pointer">Decline</button>' +
          '<button type="button" data-choice="granted" style="height:44px;border-radius:999px;border:1px solid #475569;background:transparent;color:#f1f5f9;font:inherit;font-size:14px;font-weight:700;cursor:pointer">Accept</button>' +
        '</div>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-choice]') : null;
      if (b) choose(b.getAttribute('data-choice'));
    });
    document.body.appendChild(banner);
  }

  window.w2cCookieSettings = show;

  var choice = read();
  if (choice === 'granted') load();
  else if (choice === null) {
    if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
  }
})();
