(function () {
  'use strict';
  var D = document, W = window, H = D.documentElement, KEY = 'cl.intro';

  function area(kind) { try { return W[kind]; } catch (e) { return null; } }
  function get(s, k) { try { return s ? s.getItem(k) : null; } catch (e) { return null; } }
  function put(s, k, v) { try { if (s) s.setItem(k, v); } catch (e) {} }
  function param(n) { try { return new URLSearchParams(W.location.search).get(n); } catch (e) { return null; } }
  var cfg = W.CL_CONFIG || {};
  if (cfg.intro === false) return;
  var ses = area('sessionStorage'), loc = area('localStorage');
  var ask = param('intro');
  if (!D.body) return;
  try { if (W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  if (get(loc, 'cl.still') === '1') return;
  try { var sess = JSON.parse(get(loc, 'cl.session.v1') || 'null'); if (sess && sess.exp > Date.now()) return; } catch (e) {}
  function replayButton() {
    if (cfg.introReplay === false || D.body.getAttribute('data-page') !== 'auth') return;
    function add() {
      if (D.getElementById('intro-replay')) return;
      var b = D.createElement('button');
      b.type = 'button'; b.id = 'intro-replay'; b.textContent = 'Replay intro';
      b.addEventListener('click', function () { W.location.href = W.location.pathname + '?intro=1'; });
      D.body.appendChild(b);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', add); else add();
  }
  replayButton();

  if (ask === '0') return;
  if (ask !== '1' && (get(ses, KEY) === '1' || param('next'))) return;
  if (ask === '1') {  
    try { var u = new URL(W.location.href); u.searchParams.delete('intro'); W.history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
  }
  function wave(n, amp, ph, fill, foam) {
    var steps = n * 20 * 2, top = '', i, x, y;
    for (i = 0; i <= steps; i++) {
      x = +(i * 2400 / steps).toFixed(1);
      y = +(40 + amp * Math.sin(2 * Math.PI * n * x / 1200 + ph)).toFixed(2);
      top += (i ? 'L' : 'M') + x + ',' + y;
    }
    return '<svg viewBox="0 0 2400 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<path d="' + top + 'L2400,100L0,100Z" fill="' + fill + '"/>' +
      (foam ? '<path class="i-foam" d="' + top + '"/>' : '') + '</svg>';
  }
  var LAYERS = [
    [5, 6, 0.4, '#4cc3c6', 57.5, 36, 1, 0],
    [4, 8, 1.7, '#2aa4bf', 61.5, 25, 0, 0],
    [3, 10, 3.1, '#1583ac', 66, 18, 1, 1],
    [2, 11, 0.9, '#0b6893', 71, 13, 0, 1]
  ];
  function layers() {
    return LAYERS.map(function (l, i) {
      return '<div class="i-wl" style="top:' + l[4] + '%;animation-delay:-' + (i * 1.3) + 's"><div class="i-w" style="animation-duration:' + l[5] + 's;' +
        (l[6] ? 'animation-direction:reverse;' : '') + '">' + wave(l[0], l[1], l[2], l[3], l[7]) +
        '<div class="i-under" style="background:' + l[3] + '"></div></div></div>';
    }).join('');
  }
  function washShape(id) {
    var up = '', down = '', i, x, y;
    function edge(x) { return (86 + 4.5 * Math.sin(2 * Math.PI * 5 * x / 1200) + 3 * Math.sin(2 * Math.PI * 11 * x / 1200 + 1.3)).toFixed(2); }
    for (i = 0; i <= 120; i++) { x = i * 10; y = edge(x); up += (i ? 'L' : 'M') + x + ',' + y; }
    for (i = 120; i >= 0; i--) { x = i * 10; y = edge(x); down += 'L' + x + ',' + y; }
    return '<svg viewBox="0 0 1200 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe6e0" stop-opacity=".1"/><stop offset="1" stop-color="#a9f0ea" stop-opacity=".5"/></linearGradient></defs>' +
      '<path d="M0,0L1200,0' + down + 'Z" fill="url(#' + id + ')"/><path class="i-foam i-foam2" d="' + up + '"/></svg>';
  }
  function stars() {
    var s = '', i;
    for (i = 0; i < 26; i++) {
      s += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 30).toFixed(1) + '%;width:' + (1 + Math.random() * 1.6).toFixed(1) +
        'px;height:' + (1 + Math.random() * 1.6).toFixed(1) + 'px;animation-delay:-' + (Math.random() * 4).toFixed(1) + 's"></i>';
    }
    return s;
  }
  function letters(t) {
    return t.split('').map(function (c, i) { return '<span style="animation-delay:' + (0.35 + i * 0.06).toFixed(2) + 's">' + c + '</span>'; }).join('');
  }

  var html =
    '<div id="intro" role="dialog" aria-modal="true" aria-label="Coastlines is loading">' +
      '<div class="i-sky"></div><div class="i-stars" aria-hidden="true">' + stars() + '</div>' +
      '<div class="i-sun" aria-hidden="true"></div>' +
      '<div class="i-sea" aria-hidden="true"></div>' +
      '<div class="i-glint" aria-hidden="true"></div>' +
      '<div class="i-layers" aria-hidden="true">' + layers() + '</div>' +
      '<svg class="i-sand" viewBox="0 0 1200 260" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
        '<defs><linearGradient id="ti-sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e4b8"/><stop offset=".45" stop-color="#e6c78b"/><stop offset="1" stop-color="#c29c62"/></linearGradient></defs>' +
        '<path d="M0,36C220,14 430,52 640,30S1000,8 1200,34L1200,260L0,260Z" fill="url(#ti-sg)"/></svg>' +
      '<div class="i-clip" aria-hidden="true"><div class="i-wet"></div><div class="i-wash">' + washShape('ti-wg1') + '</div><div class="i-wash i-wash2">' + washShape('ti-wg2') + '</div></div>' +
      '<div class="i-ui">' +
        '<svg class="i-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect x="2" y="2" width="60" height="60" rx="15"/>' +
          '<path pathLength="1" d="M11 27c6-6 11-6 17 0s11 6 17 0 6-3.5 8-3"/><path pathLength="1" d="M11 42c6-6 11-6 17 0s11 6 17 0 6-3.5 8-3" style="animation-delay:.25s"/></svg>' +
        '<div class="i-name" aria-hidden="true">' + letters('Coastlines') + '</div>' +
        '<div class="i-tag">Coastal erosion and sea level reports from across India</div>' +
        '<div class="i-bar" role="progressbar" aria-label="Loading Coastlines" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
          '<div class="i-track"><div class="i-fillbar"></div></div>' +
          '<div class="i-meta"><span class="i-msg">Charting the coast…</span><span class="i-pct">0%</span></div>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="i-skip">Skip intro</button>' +
    '</div><div id="intro-bub" aria-hidden="true"></div>';

  H.classList.add('intro-on');
  try { D.body.insertAdjacentHTML('afterbegin', html); } catch (e) { H.classList.remove('intro-on'); return; }
  put(ses, KEY, '1');

  var root = D.getElementById('intro'), bub = D.getElementById('intro-bub');
  var fill = root.querySelector('.i-fillbar'), pct = root.querySelector('.i-pct'), msg = root.querySelector('.i-msg'), bar = root.querySelector('.i-bar'), skipBtn = root.querySelector('.i-skip');

  var BAR_AT = 700;     
  var BAR_MS = 2000;   
  var GIVE_UP = 6500;   
  var T0 = (W.performance && performance.now) ? performance.now() : Date.now();
  function now() { return (W.performance && performance.now) ? performance.now() : Date.now(); }
  var real = { dom: 0, load: 0, fonts: 0, app: 0 };
  if (D.readyState !== 'loading') real.dom = 1; else D.addEventListener('DOMContentLoaded', function () { real.dom = 1; });
  function fontsWait() {
    var done = false;
    function ok() { if (!done) { done = true; real.fonts = 1; } }
    try { if (D.fonts && D.fonts.ready) D.fonts.ready.then(ok, ok); else ok(); } catch (e) { ok(); }
    setTimeout(ok, 1500);  
  }
  function onLoad() { real.load = 1; fontsWait(); }
  if (D.readyState === 'complete') onLoad(); else W.addEventListener('load', onLoad);
  function appDrawn() {
    var a = D.getElementById('app'), i;
    if (!a) return true;
    for (i = 0; i < a.children.length; i++) if (a.children[i].nodeName !== 'NOSCRIPT') return true;
    return false;
  }
  var shown = 0, last = T0, raf = 0, ended = false, bursting = false, lastAria = 0, stage = -1;
  var MSGS = [[0.25, 'Charting the coast…'], [0.55, 'Loading monitored sites…'], [0.85, 'Checking the tide…'], [1, 'Almost there…']];
  function paint(p) {
    fill.style.width = (p * 100).toFixed(1) + '%';
    var n = Math.round(p * 100);
    pct.textContent = n + '%';
    var s = 0; while (s < MSGS.length - 1 && p >= MSGS[s][0]) s++;
    if (p >= 1) { s = 4; }
    if (s !== stage) { stage = s; msg.textContent = s === 4 ? 'Ready' : MSGS[s][1]; }
    if (Math.abs(n - lastAria) >= 5 || n === 100) { lastAria = n; bar.setAttribute('aria-valuenow', String(n)); }
  }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function tick() {
    if (ended) return;
    var t = now(), el = t - T0, dt = Math.min(80, t - last);
    last = t;
    if (!real.app && appDrawn()) real.app = 1;
    if (el > GIVE_UP) { real.dom = real.load = real.fonts = real.app = 1; }
    var tc = ease(Math.min(1, Math.max(0, (el - BAR_AT) / BAR_MS)));
    var rp = real.dom * 0.2 + real.load * 0.35 + real.fonts * 0.2 + real.app * 0.25;
    var target = Math.min(tc, rp);
    shown += (target - shown) * Math.min(1, dt / 140);
    if (target >= 1 && 1 - shown < 0.004) shown = 1;
    paint(shown);
    if (shown >= 1 && !bursting) { bursting = true; setTimeout(burst, 380); }
    raf = W.requestAnimationFrame(tick);
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function bubbles() {
    var n = Math.round(Math.max(22, Math.min(46, W.innerWidth / 30))), out = '', i, longest = 0, s, d, dl;
    for (i = 0; i < n; i++) {
      s = Math.round(Math.pow(Math.random(), 1.7) * 52 + 12);           
      d = rnd(1.4, 2.4); dl = rnd(0, 0.7);
      longest = Math.max(longest, d + dl);
      out += '<div class="bub" style="--x:' + rnd(2, 98).toFixed(1) + '%;--s:' + s + 'px;--d:' + d.toFixed(2) + 's;--dl:' + dl.toFixed(2) +
        's;--y:-' + Math.round(rnd(55, 118)) + 'vh;--a:' + Math.round(rnd(6, 26)) + 'px;--w:' + rnd(0.7, 1.4).toFixed(2) + 's"><b></b></div>';
    }
    bub.innerHTML = out;
    return longest;
  }
  var timers = [];
  function later(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function cleanup() {
    if (ended === 'gone') return;
    ended = 'gone';
    W.cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    D.removeEventListener('keydown', onKey, true);
    if (root.parentNode) root.parentNode.removeChild(root);
    if (bub.parentNode) bub.parentNode.removeChild(bub);
    H.classList.remove('intro-on');
  }
  function reveal() {
    H.classList.remove('intro-on'); 
    root.classList.add('out');
    later(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 1150);
  }
  function burst() {
    if (ended) return;
    root.classList.add('go');
    var longest = bubbles();
    later(reveal, 750);
    later(cleanup, Math.round(longest * 1000) + 300);
  }
  function skip() {
    if (ended === 'gone' || root.classList.contains('fast')) return;
    ended = true;
    W.cancelAnimationFrame(raf);
    root.classList.add('fast', 'out');
    bub.classList.add('fast');
    H.classList.remove('intro-on');
    timers.forEach(clearTimeout);
    later(cleanup, 380);
  }
  function onKey(e) { if (e.key === 'Escape' || e.key === 'Esc') skip(); }
  root.addEventListener('click', skip);
  D.addEventListener('keydown', onKey, true);
  later(skip, 14000);
  paint(0);
  raf = W.requestAnimationFrame(tick);
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { try { skipBtn.focus({ preventScroll: true }); } catch (e) {} });
  else { try { skipBtn.focus({ preventScroll: true }); } catch (e) {} }
})();
