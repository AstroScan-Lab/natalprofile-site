/* NatalProfile — site behaviour. No third-party requests, nothing is stored or sent anywhere. */
(function () {
  'use strict';

  /* dropdown menus + language switcher: one open at a time, Esc and outside click close */
  var toggles = Array.prototype.slice.call(document.querySelectorAll('[data-dd]'));
  function closeAll(except) {
    toggles.forEach(function (b) { if (b !== except) b.setAttribute('aria-expanded', 'false'); });
  }
  toggles.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = btn.getAttribute('aria-expanded') === 'true';
      closeAll(btn);
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });
  document.addEventListener('click', function () { closeAll(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var opened = toggles.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
      closeAll();
      if (opened) opened.focus();
    }
  });

  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* carousel: buttons scroll the track by one card; the track itself is natively scrollable and focusable */
  Array.prototype.forEach.call(document.querySelectorAll('.carousel'), function (c) {
    var track = c.querySelector('.car-track');
    function step(dir) {
      var card = track.querySelector('figure');
      var w = card ? card.getBoundingClientRect().width + 18 : 300;
      var rtl = getComputedStyle(track).direction === 'rtl';
      track.scrollBy({ left: (rtl ? -dir : dir) * w, behavior: 'smooth' });
    }
    var prev = c.querySelector('[data-car="prev"]'), next = c.querySelector('[data-car="next"]');
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
  });

  /* tool 1 — Sun sign and element from the day and month (conventional tropical dates) */
  var SIGN_FROM = [[1, 20, 10], [2, 19, 11], [3, 21, 0], [4, 20, 1], [5, 21, 2], [6, 21, 3], [7, 23, 4], [8, 23, 5], [9, 23, 6], [10, 23, 7], [11, 22, 8], [12, 22, 9]];
  var ELEMENT = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]; /* fire, earth, air, water */
  function sunSign(month, day) {
    var idx = 9; /* Capricorn before 20 January */
    for (var i = 0; i < SIGN_FROM.length; i++) {
      if (month > SIGN_FROM[i][0] || (month === SIGN_FROM[i][0] && day >= SIGN_FROM[i][1])) idx = SIGN_FROM[i][2];
    }
    var cusp = SIGN_FROM.some(function (s) { return s[0] === month && Math.abs(s[1] - day) <= 1; });
    return { idx: idx, cusp: cusp };
  }
  var sunTool = document.getElementById('tool-sun');
  if (sunTool) {
    var sData = JSON.parse(sunTool.getAttribute('data-i18n'));
    var sIn = sunTool.querySelector('input'), sOut = sunTool.querySelector('.out');
    sIn.addEventListener('input', function () {
      var p = sIn.value.split('-');
      if (p.length !== 3 || !+p[1] || !+p[2]) { sOut.hidden = true; return; }
      var r = sunSign(+p[1], +p[2]);
      sOut.hidden = false;
      sOut.innerHTML = '';
      var gl = document.createElement('span');
      gl.className = 'gl';
      gl.textContent = sData.glyphs[r.idx] + '︎'; /* text, not emoji */
      sOut.appendChild(gl);
      var b = document.createElement('b');
      b.textContent = sData.signs[r.idx];
      var el = document.createElement('small');
      el.textContent = sData.elementLabel + ': ' + sData.elements[ELEMENT[r.idx]];
      sOut.appendChild(b); sOut.appendChild(el);
      if (r.cusp) { var n = document.createElement('small'); n.textContent = sData.cusp; sOut.appendChild(n); }
    });
  }

  /* tool 2 — Life Path number: digits of DDMMYYYY summed and reduced, 11/22/33 kept (same arithmetic as the bot) */
  function reduce(n) {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
      n = String(n).split('').reduce(function (a, d) { return a + (+d); }, 0);
    }
    return n;
  }
  var lpTool = document.getElementById('tool-lifepath');
  if (lpTool) {
    var lData = JSON.parse(lpTool.getAttribute('data-i18n'));
    var lIn = lpTool.querySelector('input'), lOut = lpTool.querySelector('.out');
    lIn.addEventListener('input', function () {
      var p = lIn.value.split('-');
      if (p.length !== 3 || p[0].length !== 4 || !+p[1] || !+p[2]) { lOut.hidden = true; return; }
      var digits = (p[2] + p[1] + p[0]).split('');
      var sum = digits.reduce(function (a, d) { return a + (+d); }, 0);
      var n = reduce(sum);
      lOut.hidden = false;
      lOut.innerHTML = '';
      var b = document.createElement('b');
      b.textContent = lData.label + ': ' + n;
      var how = document.createElement('small');
      how.textContent = digits.join(' + ') + ' = ' + sum + (sum !== n ? ' → ' + n : '');
      lOut.appendChild(b); lOut.appendChild(how);
      if (n > 9) { var m = document.createElement('small'); m.textContent = lData.master; lOut.appendChild(m); }
    });
  }

  /* PWA: register the service worker, show the install button only when the browser offers installation */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register(document.documentElement.getAttribute('data-root') + 'sw.js').catch(function () {});
  }
  var installBtn = document.querySelector('.install-btn'), deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (installBtn) installBtn.hidden = false;
  });
  if (installBtn) installBtn.addEventListener('click', function () {
    if (!deferred) return;
    deferred.prompt(); deferred = null; installBtn.hidden = true;
  });
})();
