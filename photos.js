/* Coastlines photo credits.
   Beach photographs are hotlinked from Wikimedia Commons. Each one carries a link to its Commons file page. This
   file asks the Commons API who took each photo and under which licence, and writes that into the credit line
   ("Photo: <photographer> · <licence>"). If the lookup fails or the browser is offline, the credit stays as
   "Photo: Wikimedia Commons", which still links to the file page.

   Author names come back from Commons as HTML. They are turned into plain text with DOMParser and set with
   textContent, never innerHTML, so nothing from Commons is ever run as markup. Answers are kept in
   sessionStorage so each file is looked up once per visit. */
(function () {
  'use strict';
  var API = 'https://commons.wikimedia.org/w/api.php';
  var PRE = 'cl.ph.', MAX = 20, mem = {}, inflight = {}, failedAt = 0;

  function norm(f) { return String(f || '').replace(/_/g, ' ').trim().toLowerCase(); }
  function sget(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function sput(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }

  function plain(html) {
    try {
      var d = new DOMParser().parseFromString(String(html || ''), 'text/html');
      var junk = d.querySelectorAll('script,style,template,noscript');
      for (var i = 0; i < junk.length; i++) junk[i].remove();
      return (d.body && d.body.textContent || '').replace(/\s+/g, ' ').trim();
    } catch (e) { return ''; }
  }
  function clip(s, n) { return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; }

  function known(f) {
    var k = norm(f);
    if (mem[k]) return mem[k];
    var raw = sget(PRE + k);
    if (raw) { try { var v = JSON.parse(raw); if (v && typeof v === 'object') { mem[k] = v; return v; } } catch (e) {} }
    return null;
  }

  function apply(root) {
    var links = (root || document).querySelectorAll('a.credit[data-credit]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i], c = known(a.getAttribute('data-credit'));
      if (!c) continue;
      var who = c.by ? clip(c.by, 60) : '', lic = c.lic ? clip(c.lic, 30) : '';
      if (!who && !lic) continue;
      a.textContent = 'Photo: ' + (who || 'Wikimedia Commons') + (lic ? ' · ' + lic : '');
      a.setAttribute('title', 'Photo: ' + (c.by || 'Wikimedia Commons') + (c.lic ? ', licence ' + c.lic : '') + '. Opens the Wikimedia Commons file page.');
    }
  }

  function fetchBatch(files) {
    var titles = files.map(function (f) { return 'File:' + String(f).replace(/_/g, ' '); }).join('|');
    var url = API + '?action=query&prop=imageinfo&iiprop=extmetadata&format=json&formatversion=2&origin=*&titles=' + encodeURIComponent(titles);
    var ctl = window.AbortController ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 8000) : 0;
    return fetch(url, ctl ? { signal: ctl.signal, credentials: 'omit' } : { credentials: 'omit' })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        if (timer) clearTimeout(timer);
        var pages = (j && j.query && j.query.pages) || [];
        pages.forEach(function (p) {
          var m = p && p.imageinfo && p.imageinfo[0] && p.imageinfo[0].extmetadata;
          if (!m) return;
          var k = norm(String(p.title || '').replace(/^File:/i, '')), rec = {
            by: plain(m.Artist && m.Artist.value),
            lic: plain(m.LicenseShortName && m.LicenseShortName.value)
          };
          mem[k] = rec; sput(PRE + k, JSON.stringify(rec));
        });
      })
      .catch(function () { if (timer) clearTimeout(timer); failedAt = Date.now(); });
  }

  function credits(root) {
    if (!window.fetch) return;
    apply(root);
    if (failedAt && Date.now() - failedAt < 60000) return;
    var want = [], seen = {}, links = (root || document).querySelectorAll('a.credit[data-credit]');
    for (var i = 0; i < links.length; i++) {
      var f = links[i].getAttribute('data-credit'), k = norm(f);
      if (!k || seen[k] || known(f) || inflight[k]) continue;
      seen[k] = 1; want.push(f);
    }
    if (!want.length) return;
    var jobs = [];
    function job(part) {
      part.forEach(function (f) { inflight[norm(f)] = 1; });
      return fetchBatch(part).then(function () { part.forEach(function (f) { delete inflight[norm(f)]; }); });
    }
    for (var j = 0; j < want.length; j += MAX) jobs.push(job(want.slice(j, j + MAX)));
    Promise.all(jobs).then(function () { apply(document); });
  }

  window.CLPhotos = { credits: credits, _plain: plain };
})();
