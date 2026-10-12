/* NatalProfile — chart calculation on the page. Sends the birth date, time and the chosen city to the
   bot's server (data-api), gets back a picture of the wheel and the signs of the Sun, the Moon and the
   Ascendant. The server keeps nothing and limits the number of calculations per hour. */
(function () {
  'use strict';
  var box = document.getElementById('chart-tool');
  if (!box || !window.fetch) return;
  var API = box.getAttribute('data-api'), LANG = box.getAttribute('data-lang');
  var T = JSON.parse(box.getAttribute('data-i18n'));
  var form = box.querySelector('form');
  var dateIn = box.querySelector('#ch-date'), timeIn = box.querySelector('#ch-time'), noTime = box.querySelector('#ch-notime');
  var cityIn = box.querySelector('#ch-city'), list = box.querySelector('#ch-list');
  var status = box.querySelector('.ch-status'), button = form.querySelector('button[type="submit"]');
  var img = box.querySelector('#ch-img'), placeholder = box.querySelector('.ch-placeholder');
  var three = box.querySelector('.ch-three'), after = box.querySelector('.ch-after');
  var city = null, timer = 0, seq = 0;

  function say(text, bad) { status.textContent = text || ''; status.classList.toggle('bad', !!bad); }
  function closeList() { list.hidden = true; list.textContent = ''; cityIn.setAttribute('aria-expanded', 'false'); }

  noTime.addEventListener('change', function () { timeIn.disabled = noTime.checked; if (noTime.checked) timeIn.value = ''; });

  /* city suggestions: a short pause after typing, the latest answer wins */
  cityIn.addEventListener('input', function () {
    city = null;
    clearTimeout(timer);
    var q = cityIn.value.trim();
    if (q.length < 2) { closeList(); return; }
    timer = setTimeout(function () {
      var mine = ++seq;
      fetch(API + '/api/site/geocode?lang=' + encodeURIComponent(LANG) + '&q=' + encodeURIComponent(q))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (mine !== seq) return;
          list.textContent = '';
          (d.results || []).forEach(function (r) {
            var li = document.createElement('li');
            var b = document.createElement('button');
            b.type = 'button'; b.setAttribute('role', 'option'); b.textContent = r.display;
            b.addEventListener('click', function () { city = r; cityIn.value = r.display; closeList(); say(''); });
            li.appendChild(b); list.appendChild(li);
          });
          if (!list.children.length) {
            var none = document.createElement('li');
            none.className = 'ch-none'; none.textContent = d.error === 'rate_limited' ? T.limit : T.noCity;
            list.appendChild(none);
          }
          list.hidden = false; cityIn.setAttribute('aria-expanded', 'true');
        })
        .catch(function () { if (mine === seq) closeList(); });
    }, 350);
  });
  document.addEventListener('click', function (e) { if (!box.querySelector('.ch-city').contains(e.target)) closeList(); });
  cityIn.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeList();
    if (e.key === 'ArrowDown' && !list.hidden) { var first = list.querySelector('button'); if (first) { e.preventDefault(); first.focus(); } }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = dateIn.value.split('-');
    if (p.length !== 3 || p[0].length !== 4) { say(T.needDate, true); dateIn.focus(); return; }
    if (!noTime.checked && !/^\d{2}:\d{2}/.test(timeIn.value)) { say(T.needTime, true); timeIn.focus(); return; }
    if (!city) { say(T.needCity, true); cityIn.focus(); return; }
    button.disabled = true; say(T.wait);
    fetch(API + '/api/site/chart', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: p[2] + '.' + p[1] + '.' + p[0], time: noTime.checked ? '' : timeIn.value.slice(0, 5), time_known: !noTime.checked,
                             city: city.display, lat: city.lat, lon: city.lon, tz: city.tz })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        button.disabled = false;
        var d = res.d;
        if (!res.ok) {
          say(d.error === 'rate_limited' ? T.limit : d.error === 'invalid_date' ? T.needDate : d.error === 'invalid_time' ? T.needTime :
              d.error === 'invalid_city' ? T.needCity : T.failed, true);
          return;
        }
        img.src = d.image; img.alt = T.wheelAlt; img.hidden = false;
        if (placeholder) placeholder.hidden = true;
        three.textContent = '';
        [['sun', T.sun], ['moon', T.moon], ['asc', T.asc]].forEach(function (row) {
          var key = d[row[0]], i = T.keys.indexOf(key);
          var li = document.createElement('li');
          var label = document.createElement('span'); label.className = 'ch-label'; label.textContent = row[1];
          var val = document.createElement('b');
          if (i >= 0) {
            var gl = document.createElement('span'); gl.className = 'sky-gl'; gl.textContent = T.glyphs[i] + '︎';
            val.appendChild(gl); val.appendChild(document.createTextNode(T.signs[i]));
          } else { val.textContent = T.noAsc; val.className = 'ch-muted'; }
          li.appendChild(label); li.appendChild(val); three.appendChild(li);
        });
        three.hidden = false; after.hidden = false;
        say(typeof d.left === 'number' ? T.left.replace('{n}', d.left) : '');
        if (window.matchMedia && window.matchMedia('(max-width: 960px)').matches) box.querySelector('.ch-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function () { button.disabled = false; say(T.failed, true); });
  });
})();
