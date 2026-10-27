/* NatalProfile — paying for a report by card on the site (YooKassa). The bot is not involved:
   in Telegram digital goods are sold for Stars only, so a report paid by card is delivered here.
   1) Report page: "Pay by card" opens a form with the details the report needs (the same fields as in
      the bot's Mini App). The server checks them, creates a payment and we go to YooKassa's page.
      Card details are entered there, never on this site.
   2) Return page (/paid/?c=…): asks the server whether the payment went through, waits while the report
      is being made and shows the "Download PDF" button. Payments started before the form existed get
      the link into the Telegram bot, as before. */
(function () {
  'use strict';
  if (!window.fetch) return;

  /* owner's check price: a secret word in the address (?test=…) is read once and removed from the address
     at once, so it stays neither in the browser history nor in a screenshot; the server ignores it unless
     it matches its own setting */
  var testKey = '';
  try {
    var params = new URLSearchParams(window.location.search);
    testKey = params.get('test') || '';
    if (testKey) {
      params.delete('test');
      history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params : '') + window.location.hash);
    }
  } catch (e) {}

  function setPath(obj, path, value) {
    var parts = path.split('.'), o = obj;
    for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
    o[parts[parts.length - 1]] = value;
  }

  /* city suggestions — the same server endpoint as the chart calculator */
  function cityWidget(wrap, api, lang, T, onPick) {
    var input = wrap.querySelector('input'), list = wrap.querySelector('ul'), timer = 0, seq = 0;
    function close() { list.hidden = true; list.textContent = ''; input.setAttribute('aria-expanded', 'false'); }
    input.addEventListener('input', function () {
      onPick(null);
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 2) { close(); return; }
      timer = setTimeout(function () {
        var mine = ++seq;
        fetch(api + '/api/site/geocode?lang=' + encodeURIComponent(lang) + '&q=' + encodeURIComponent(q))
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (mine !== seq) return;
            list.textContent = '';
            (d.results || []).forEach(function (r) {
              var li = document.createElement('li'), b = document.createElement('button');
              b.type = 'button'; b.setAttribute('role', 'option'); b.textContent = r.display;
              b.addEventListener('click', function () { onPick(r); input.value = r.display; close(); });
              li.appendChild(b); list.appendChild(li);
            });
            if (!list.children.length) {
              var none = document.createElement('li');
              none.className = 'ch-none'; none.textContent = d.error === 'rate_limited' ? T.limit : T.noCity;
              list.appendChild(none);
            }
            list.hidden = false; input.setAttribute('aria-expanded', 'true');
          })
          .catch(function () { if (mine === seq) close(); });
      }, 350);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowDown' && !list.hidden) { var first = list.querySelector('button'); if (first) { e.preventDefault(); first.focus(); } }
    });
    document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) close(); });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-pay]'), function (box) {
    var T = JSON.parse(box.getAttribute('data-i18n'));
    var api = box.getAttribute('data-api'), lang = box.getAttribute('data-lang');
    var open = box.querySelector('[data-pay-open]'), form = box.querySelector('form'), status = form.querySelector('.pay-status');
    var submit = form.querySelector('button[type="submit"]'), cities = {};
    function say(text, bad) { status.textContent = text || ''; status.classList.toggle('bad', !!bad); }

    open.addEventListener('click', function () {
      form.hidden = false; open.hidden = true; open.setAttribute('aria-expanded', 'true');
      var first = form.querySelector('input, select'); if (first) first.focus();
    });
    Array.prototype.forEach.call(form.querySelectorAll('[data-city]'), function (wrap) {
      var key = wrap.getAttribute('data-city');
      cities[key] = null;
      cityWidget(wrap, api, lang, T, function (r) { cities[key] = r; });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {}, missing = null;
      Array.prototype.forEach.call(form.querySelectorAll('[data-f]'), function (el) {
        var v = (el.value || '').trim();
        if (!v && !missing) missing = el;
        if (el.type === 'date' && v) { var p = v.split('-'); v = p[2] + '.' + p[1] + '.' + p[0]; }
        if (el.type === 'time') v = v.slice(0, 5);
        setPath(data, el.getAttribute('data-f'), v);
      });
      if (missing) { say(T.need, true); missing.focus(); return; }
      for (var key in cities) {
        var c = cities[key];
        if (!c) { say(T.needCity, true); form.querySelector('[data-city="' + key + '"] input').focus(); return; }
        /* "birth" / "current" — fields of the solar return and the daily forecast; otherwise <person.>city */
        var two = key === 'birth' || key === 'current';
        var base = two ? key + '_' : key.replace(/city$/, '');
        setPath(data, two ? key + '_city' : key, c.display);
        setPath(data, base + 'lat', c.lat); setPath(data, base + 'lon', c.lon); setPath(data, base + 'tz', c.tz);
      }
      if (!form.querySelector('[data-pay-consent]').checked) { say(T.needConsent, true); return; }
      submit.disabled = true; say(T.wait);
      fetch(api + '/api/site/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: box.getAttribute('data-product'), lang: lang, consent: true, data: data, test: testKey || undefined,
                               email: (form.querySelector('[data-pay-email]') || {}).value || undefined })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.url) { window.location.href = d.url; return; }
        submit.disabled = false;
        say(d.error === 'rate_limited' ? T.limit : /^invalid_/.test(d.error || '') ? T.need : T.failed, true);
      }).catch(function () { submit.disabled = false; say(T.failed, true); });
    });
  });

  var paid = document.getElementById('paid-box');
  if (paid) {
    var P = JSON.parse(paid.getAttribute('data-i18n')), api = paid.getAttribute('data-api');
    var code = (new URLSearchParams(window.location.search).get('c') || '').replace(/[^a-zA-Z0-9_-]/g, '');
    var title = paid.querySelector('h1'), text = paid.querySelector('.paid-text'), tries = 0;
    function show(h, p) { title.textContent = h; text.textContent = p; }
    function what(d) {
      /* say plainly what the money was for: the bank notice shows only the shop name */
      var el = paid.querySelector('.paid-what');
      if (el && d.product) {
        el.textContent = P.what.replace('{product}', P.products[d.product] || d.product).replace('{sum}', d.amount != null ? String(d.amount).replace(/\.0+$/, '') : '');
        el.hidden = false;
      }
    }
    function check() {
      tries++;
      fetch(api + '/api/site/pay/status?c=' + encodeURIComponent(code))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.status === 'paid') what(d);
          if (d.status === 'paid' && d.report === 'ready' && d.download) {
            show(P.readyH, P.readyP);
            var a = paid.querySelector('.paid-pdf'); a.href = api + d.download; a.hidden = false;
          } else if (d.status === 'paid' && d.report === 'generating') {
            show(P.genH, P.genP);
            setTimeout(check, 5000);           /* a report takes a few minutes: keep waiting */
          } else if (d.status === 'paid' && d.report === 'failed') { show(P.failH, P.failP); }
          else if (d.status === 'paid' && d.report === 'expired') { show(P.expH, P.expP); }
          else if (d.status === 'paid' && d.link) {
            show(P.paidH, P.paidP);
            var link = paid.querySelector('.paid-link'); link.href = d.link; link.hidden = false;
            paid.querySelector('.paid-keep').hidden = false;
          } else if (d.status === 'canceled') { show(P.cancelH, P.cancelP); paid.querySelector('.paid-back').hidden = false; }
          else if (d.status === 'unknown' || d.status === 'mismatch') { show(P.unknownH, P.unknownP); }
          else if (tries < 40) { setTimeout(check, 3000); }
          else { show(P.slowH, P.slowP); }
        })
        .catch(function () { if (tries < 200) setTimeout(check, 5000); else show(P.slowH, P.slowP); });
    }
    if (code) check(); else show(P.unknownH, P.unknownP);
  }
})();
