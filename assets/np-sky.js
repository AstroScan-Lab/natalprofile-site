/* NatalProfile — "sky now" block. Reads assets/sky.json (made at build time with the Swiss Ephemeris, see
   sky_data.py) and shows where the Moon and the planets are at this moment. Nothing is sent anywhere.
   Without this script, or when the data has run out, the block simply stays hidden. */
(function () {
  'use strict';
  /* calendar hub: point the "Moon today" link at today's page (date in the calendar's own time zone) */
  var todayLink = document.querySelector('[data-moon-today]');
  if (todayLink) {
    var day = new Date(Date.now() + (+todayLink.getAttribute('data-tz')) * 3600000).toISOString().slice(0, 10);
    if (day >= todayLink.getAttribute('data-min') && day <= todayLink.getAttribute('data-max')) {
      todayLink.setAttribute('href', todayLink.getAttribute('href').replace(/\d{4}-\d{2}-\d{2}/, day));
    }
  }
  var box = document.getElementById('sky-now');
  if (!box || !window.fetch) return;
  var T = JSON.parse(box.getAttribute('data-i18n'));
  var root = document.documentElement.getAttribute('data-root') || '';
  var SVG = 'http://www.w3.org/2000/svg';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  /* state in force at `now`: the start value, replaced by every event that has already happened */
  function current(start, events, now) {
    var v = start, since = null, next = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i][0] <= now) { v = events[i][1]; since = events[i][0]; } else { next = events[i][0]; break; }
    }
    return { v: v, since: since, next: next };
  }
  function when(minute) {
    return new Intl.DateTimeFormat(document.documentElement.lang, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(minute * 60000));
  }
  /* Moon disc as seen from the northern hemisphere; f is the fraction of the cycle, 0 = new, 0.5 = full */
  function moonDisc(f) {
    var R = 46, c = 50, s = svg('svg', { viewBox: '0 0 100 100', 'class': 'sky-moon', 'aria-hidden': 'true' });
    s.appendChild(svg('circle', { cx: c, cy: c, r: R, 'class': 'sky-moon-dark' }));
    var rx = Math.abs(Math.cos(2 * Math.PI * f)) * R, waxing = f < 0.5, crescent = f < 0.25 || f > 0.75;
    var d = 'M' + c + ',' + (c - R) + ' A' + R + ',' + R + ' 0 0 ' + (waxing ? 1 : 0) + ' ' + c + ',' + (c + R) +
            ' A' + rx.toFixed(2) + ',' + R + ' 0 0 ' + (waxing === crescent ? 0 : 1) + ' ' + c + ',' + (c - R) + ' Z';
    s.appendChild(svg('path', { d: d, 'class': 'sky-moon-lit' }));
    s.appendChild(svg('circle', { cx: c, cy: c, r: R, 'class': 'sky-moon-rim' }));
    return s;
  }

  fetch(root + 'assets/sky.json?v=' + box.getAttribute('data-v')).then(function (r) { return r.json(); }).then(function (D) {
    var now = Math.floor(Date.now() / 60000);
    if (now < D.from || now > D.until) return;

    var moon = current(D.moon.s0, D.moon.ing, now);
    var ph = current(D.phase.p0, D.phase.ev, now);
    var frac = 0.5;
    if (ph.since !== null && ph.next !== null) frac = (now - ph.since) / (ph.next - ph.since);
    var f = (((45 * ph.v - 22.5) + 45 * frac) / 360 + 1) % 1;

    var left = el('div', 'sky-main');
    left.appendChild(moonDisc(f));
    var txt = el('div');
    txt.appendChild(el('p', 'sky-label', T.moonNow));
    var big = el('p', 'sky-big');
    var gl = el('span', 'sky-gl', T.glyphs[moon.v] + '︎');
    big.appendChild(gl); big.appendChild(document.createTextNode(T.signs[moon.v]));
    txt.appendChild(big);
    /* a principal phase is named only within half a day of its exact moment (the middle of its span);
       otherwise the Moon is simply waxing or waning, crescent or gibbous */
    var mid = (ph.since !== null && ph.next !== null) ? (ph.since + ph.next) / 2 : null;
    var phaseName = (ph.v % 2 === 0 && mid !== null && Math.abs(now - mid) <= 720) ? ph.v : [1, 3, 5, 7][Math.floor(f * 4) % 4];
    txt.appendChild(el('p', 'sky-note', T.phases[phaseName]));
    if (moon.next !== null) txt.appendChild(el('p', 'sky-note', T.nextSign.replace('{sign}', T.signs[(moon.v + 1) % 12]).replace('{date}', when(moon.next))));
    left.appendChild(txt);

    var list = el('ul', 'sky-planets');
    T.order.forEach(function (key, i) {
      var p = D.pl[key];
      if (!p) return;
      var sign = current(p.s0, p.ing, now).v;
      var retro = p.st ? current(p.r0, p.st, now).v === 1 : false;
      var li = el('li');
      li.appendChild(el('span', 'sky-gl', T.planetGlyphs[i] + '︎'));
      li.appendChild(el('b', null, T.planets[i]));
      li.appendChild(el('span', 'sky-sign', T.signs[sign]));
      if (retro) li.appendChild(el('span', 'sky-retro', T.retro));
      list.appendChild(li);
    });

    var grid = box.querySelector('.sky-grid');
    grid.appendChild(left); grid.appendChild(list);
    box.hidden = false;
  }).catch(function () {});
})();
