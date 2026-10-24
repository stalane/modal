/*
 * age-gate.js — generic age confirmation modal.
 * Install with one tag:  <script src="/age-gate.js" defer></script>
 * Optional config before the tag:
 *   window.AGE_GATE = { name: 'age_gate', days: 365, text: '...' };
 */
(function () {
  'use strict';

  var cfg = Object.assign(
    {
      name: 'age_gate',
      days: 365,
      text: 'There is nothing on this website that is interesting or suitable for children. Click to accept that you are over the age of 16',
      button: "I confirm I'm over 16",
    },
    window.AGE_GATE || {}
  );

  if (hasCookie(cfg.name)) return;

  document.addEventListener('DOMContentLoaded', init);

  /* ---------------- cookies ---------------- */

  function hasCookie(name) {
    return document.cookie
      .split(';')
      .some(function (c) {
        return c.trim().split('=')[0] === name;
      });
  }

  var SECOND_LEVEL = [
    'co', 'com', 'net', 'org', 'gov', 'edu', 'ac', 'mil', 'or', 'ne',
    'go', 'ad', 'asn', 'id', 'sch', 'gob', 'res', 'fin', 'leg', 'jur',
  ];

  // registrable domain: last two labels, or three for known second-level TLDs
  function apexOf(hostname) {
    var parts = hostname.split('.');
    if (parts.length < 2) return null;
    var last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) return null; // numeric TLD = IP address
    var tail = parts.slice(-2).join('.');
    var second = parts[parts.length - 2].toLowerCase();
    if (parts.length >= 3 && last.length === 2 && SECOND_LEVEL.indexOf(second) !== -1) {
      return parts.slice(-3).join('.');
    }
    return tail;
  }

  function setCookie(name, value, days, domain) {
    var exp = new Date(Date.now() + days * 864e5).toUTCString();
    var s = name + '=' + value + '; Expires=' + exp + '; Path=/; SameSite=Lax';
    if (domain) s += '; Domain=' + domain;
    document.cookie = s;
  }

  function accept() {
    var apex = apexOf(location.hostname);
    if (apex) {
      setCookie(cfg.name, '1', cfg.days, '.' + apex);
      if (hasCookie(cfg.name)) return true;
    }
    setCookie(cfg.name, '1', cfg.days, null); // host-only fallback
    return hasCookie(cfg.name);
  }

  /* ---------------- style harvesting ---------------- */

  var NAMED = {
    black: [0, 0, 0], white: [255, 255, 255], red: [255, 0, 0], green: [0, 128, 0],
    blue: [0, 0, 255], gray: [128, 128, 128], grey: [128, 128, 128], yellow: [255, 255, 0],
    orange: [255, 165, 0], purple: [128, 0, 128], pink: [255, 192, 203], brown: [165, 42, 42],
    cyan: [0, 255, 255], magenta: [255, 0, 255], lime: [0, 255, 0], navy: [0, 0, 128],
    teal: [0, 128, 128], maroon: [128, 0, 0], olive: [128, 128, 0], silver: [192, 192, 192],
  };

  function parseColor(str) {
    if (!str) return null;
    str = str.trim().toLowerCase();
    var m = str.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      var p = m[1].split(/[\/\s,]+/).filter(Boolean);
      var rgb = [0, 1, 2].map(function (i) {
        var v = parseFloat(p[i]);
        return p[i] && p[i].indexOf('%') !== -1 ? Math.round((v * 255) / 100) : Math.round(v);
      });
      var a = p.length > 3 ? parseFloat(p[3]) : 1;
      if (p.length > 3 && p[3].indexOf('%') !== -1) a = a / 100;
      return { r: rgb[0], g: rgb[1], b: rgb[2], a: isNaN(a) ? 1 : a };
    }
    if (str[0] === '#') {
      var h = str.slice(1);
      if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
      if (h.length === 6 || h.length === 8) {
        return {
          r: parseInt(h.slice(0, 2), 16),
          g: parseInt(h.slice(2, 4), 16),
          b: parseInt(h.slice(4, 6), 16),
          a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
        };
      }
      return null;
    }
    if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    var n = NAMED[str];
    return n ? { r: n[0], g: n[1], b: n[2], a: 1 } : null;
  }

  function css(el, prop) {
    return el ? getComputedStyle(el).getPropertyValue(prop) : null;
  }

  function compositedBg() {
    var chain = [];
    var el = document.body;
    while (el) {
      var c = parseColor(css(el, 'background-color'));
      if (c && c.a > 0) chain.push({ c: c, el: el });
      el = el === document.body ? document.documentElement : null;
    }
    for (var i = 0; i < chain.length; i++) {
      var img = css(chain[i].el, 'background-image');
      if (img && img !== 'none') return chain[i].c; // image wins visually; take its color
    }
    if (chain.length) return chain[0].c; // body paints on top of html
    return { r: 255, g: 255, b: 255, a: 1 };
  }

  function firstAnchorColor() {
    var links = document.querySelectorAll('a[href]');
    for (var i = 0; i < Math.min(links.length, 10); i++) {
      var cs = getComputedStyle(links[i]);
      // skip invisible anchors (Cloudflare injects hidden cdn-cgi links as the first <a>)
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
      var c = parseColor(cs.color);
      if (c && c.a > 0) return c;
    }
    return null;
  }

  function lum(c) {
    var f = function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function mix(c, target, t) {
    return {
      r: Math.round(c.r + (target.r - c.r) * t),
      g: Math.round(c.g + (target.g - c.g) * t),
      b: Math.round(c.b + (target.b - c.b) * t),
      a: 1,
    };
  }

  function rgb(c) {
    return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
  }

  function rgba(c, a) {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  function harvest() {
    var bg = compositedBg();
    var fg = parseColor(css(document.body, 'color')) || (lum(bg) > 0.4 ? { r: 17, g: 17, b: 17, a: 1 } : { r: 238, g: 238, b: 238, a: 1 });
    var accent = firstAnchorColor() || fg;
    var dark = lum(bg) < 0.4;
    var WHITE = { r: 255, g: 255, b: 255, a: 1 };
    var BLACK = { r: 0, g: 0, b: 0, a: 1 };
    return {
      panel: rgb(mix(bg, WHITE, dark ? 0.07 : 0.5)),
      text: rgb(fg),
      muted: rgb(mix(bg, fg, 0.55)),
      border: rgba(mix(bg, fg, 0.25), 1),
      accent: rgb(accent),
      accentText: rgb(lum(accent) > 0.35 ? BLACK : WHITE),
      overlay: rgba(dark ? BLACK : mix(bg, BLACK, 0.5), dark ? 0.65 : 0.5),
      font: css(document.body, 'font-family') || 'ui-sans-serif, system-ui, sans-serif',
    };
  }

  /* ---------------- ui ---------------- */

  function init() {
    if (hasCookie(cfg.name)) return;
    var t = harvest();

    var style = document.createElement('style');
    style.id = 'age-gate-styles';
    style.textContent = [
      '#age-gate-overlay{position:fixed;inset:0;z-index:2147483646;display:flex;',
      'align-items:center;justify-content:center;padding:20px;box-sizing:border-box;',
      'background:' + t.overlay + ';-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
      'opacity:0;transition:opacity .25s ease;font-family:' + t.font + '}',
      '#age-gate-overlay.age-gate-show{opacity:1}',
      '#age-gate-panel{max-width:460px;width:100%;box-sizing:border-box;',
      'padding:28px 28px 24px;border-radius:14px;background:' + t.panel + ';color:' + t.text + ';',
      'text-align:center;',
      'border:1px solid ' + t.border + ';box-shadow:0 24px 64px rgba(0,0,0,.35);',
      'transform:translateY(8px) scale(.98);transition:transform .25s ease}',
      '#age-gate-overlay.age-gate-show #age-gate-panel{transform:none}',
      '#age-gate-title{margin:0 0 12px;font-size:13px;font-weight:700;letter-spacing:.08em;',
      'text-transform:uppercase;color:' + t.muted + '}',
      '#age-gate-text{margin:0 0 22px;font-size:16px;line-height:1.55}',
      '#age-gate-ok{appearance:none;border:0;cursor:pointer;width:100%;padding:13px 18px;',
      'border-radius:9px;background:' + t.accent + ';color:' + t.accentText + ';',
      'font:600 15px/1 ' + t.font + ';letter-spacing:.01em}',
      '#age-gate-ok:hover{filter:brightness(1.08)}',
      '#age-gate-ok:focus-visible{outline:2px solid ' + t.text + ';outline-offset:2px}',
      'body.age-gate-open{overflow:hidden}',
      '@keyframes age-gate-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-9px)}',
      '40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}',
      '#age-gate-panel.age-gate-shake{animation:age-gate-shake .35s ease}',
    ].join('');
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'age-gate-overlay';
    var panel = document.createElement('div');
    panel.id = 'age-gate-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'age-gate-text');

    var title = document.createElement('div');
    title.id = 'age-gate-title';
    title.textContent = 'Age confirmation Required';

    var text = document.createElement('p');
    text.id = 'age-gate-text';
    text.textContent = cfg.text;

    var btn = document.createElement('button');
    btn.id = 'age-gate-ok';
    btn.type = 'button';
    btn.textContent = cfg.button;

    panel.appendChild(title);
    panel.appendChild(text);
    panel.appendChild(btn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('age-gate-open');

    function close() {
      accept();
      overlay.classList.remove('age-gate-show');
      document.documentElement.style.overflow = '';
      document.body.classList.remove('age-gate-open');
      setTimeout(function () {
        overlay.remove();
        var s = document.getElementById('age-gate-styles');
        if (s) s.remove();
      }, 260);
    }

    function shake() {
      panel.classList.remove('age-gate-shake');
      void panel.offsetWidth; // restart the animation on repeat attempts
      panel.classList.add('age-gate-shake');
    }

    btn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) shake(); // no way out but accepting
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') shake();
      if (e.key === 'Tab') {
        e.preventDefault(); // focus trap: the button is the only stop
        btn.focus();
      }
    });

    requestAnimationFrame(function () {
      overlay.classList.add('age-gate-show');
      btn.focus();
    });
  }
})();
