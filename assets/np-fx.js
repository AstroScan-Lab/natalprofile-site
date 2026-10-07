/* NatalProfile — visual effects. Decorative only: the site works fully without this file.
   Mechanics adapted from the GAV site (star backdrop, count-up, scroll reveal, tilt with sheen). Rules kept from there: nothing runs under prefers-reduced-motion; pointer effects
   only for a fine pointer; the backdrop starts when the browser is idle, runs at ~30 fps on phones and stops while
   the tab is hidden; no forced reflow inside handlers. */
(function () {
  'use strict';
  var mq = window.matchMedia;
  var reduce = mq && mq('(prefers-reduced-motion: reduce)').matches;
  var light = mq && mq('(prefers-color-scheme: light)').matches;
  var fine = mq && mq('(pointer: fine)').matches;
  var phone = mq && mq('(max-width: 760px)').matches;
  var root = document.documentElement;

  /* ---- count-up for the figures in the stats row (works in both themes) ---- */
  if (!reduce && 'IntersectionObserver' in window) {
    var nums = document.querySelectorAll('.stat b');
    var io1 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io1.unobserve(en.target);
        var el = en.target, text = el.textContent, m = text.match(/\d+/);
        if (!m) return;
        var target = +m[0], pre = text.slice(0, m.index), post = text.slice(m.index + m[0].length), t0 = null;
        (function tick(now) {
          if (t0 === null) t0 = now;
          var p = Math.min((now - t0) / 900, 1);
          el.textContent = pre + Math.round(target * (1 - Math.pow(1 - p, 3))) + post;
          if (p < 1) requestAnimationFrame(tick);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    Array.prototype.forEach.call(nums, function (n) { io1.observe(n); });
  }
  if (reduce) return;
  root.classList.add('fx-on');

  /* ---- scroll reveal: mark blocks below the first screen, show each once ---- */
  if ('IntersectionObserver' in window) {
    var blocks = document.querySelectorAll('.section .wrap > h2, .section .wrap > .sub, .section .grid > *, .tools > *, .carousel, blockquote, .chapters li');
    var vh = window.innerHeight;
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io2.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(blocks, function (b) {
      if (b.getBoundingClientRect().top > vh * 0.9) { b.classList.add('reveal'); io2.observe(b); }
    });
  }

  /* ---- pointer effects: desktop only ---- */
  if (fine) {
    /* tilt + sheen on the sample pages */
    Array.prototype.forEach.call(document.querySelectorAll('.car-track figure img'), function (img) {
      var wrap = document.createElement('div');
      wrap.className = 'tilt';
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
      wrap.addEventListener('mousemove', function (e) {
        var r = wrap.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        wrap.style.transform = 'rotateX(' + (-py * 10).toFixed(2) + 'deg) rotateY(' + (px * 12).toFixed(2) + 'deg) scale(1.03)';
        wrap.classList.add('on');
      }, { passive: true });
      wrap.addEventListener('mouseleave', function () { wrap.style.transform = ''; wrap.classList.remove('on'); });
    });
  }
  if (light) return; /* the light theme keeps the page calm: no canvases */

  /* ---- star backdrop: twinkling stars, a faint constellation, rare shooting stars ---- */
  function startSky() {
    var cv = document.createElement('canvas');
    cv.className = 'sky-canvas';
    cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild);
    var cx = cv.getContext('2d'), W = 0, H = 0, stars = [], links = [], meteor = null, raf = 0, last = 0, nextMeteor = 0;
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    function seed(n) { var s = n; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, phone ? 1 : 1.5);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var rnd = seed(20261008), count = Math.round(W * H / (phone ? 5200 : 6800));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({ x: rnd() * W, y: rnd() * H, r: 0.4 + rnd() * 1.3, a: 0.25 + rnd() * 0.65, sp: 0.4 + rnd() * 1.6, ph: rnd() * 6.28, d: 0.3 + rnd() * 0.7,
                     gold: rnd() < 0.12 });
      }
      /* one loose constellation from the brightest stars in the upper part of the screen */
      var bright = stars.filter(function (s) { return s.r > 1.2 && s.y < H * 0.6; }).sort(function (a, b) { return a.x - b.x; }).slice(0, phone ? 5 : 8);
      links = [];
      for (var j = 0; j < bright.length - 1; j++) links.push([bright[j], bright[j + 1]]);
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (phone && now - last < 33) return;
      var dt = Math.min(64, now - (last || now)); last = now;
      mouse.x += (mouse.tx - mouse.x) * 0.04; mouse.y += (mouse.ty - mouse.y) * 0.04;
      cx.clearRect(0, 0, W, H);
      var t = now / 1000, i, s;
      cx.lineWidth = 0.6; cx.strokeStyle = 'rgba(226,203,153,0.14)';
      cx.beginPath();
      for (i = 0; i < links.length; i++) {
        cx.moveTo(links[i][0].x + mouse.x * 14 * links[i][0].d, links[i][0].y + mouse.y * 10 * links[i][0].d);
        cx.lineTo(links[i][1].x + mouse.x * 14 * links[i][1].d, links[i][1].y + mouse.y * 10 * links[i][1].d);
      }
      cx.stroke();
      for (i = 0; i < stars.length; i++) {
        s = stars[i];
        var tw = 0.65 + 0.35 * Math.sin(t * s.sp + s.ph);
        cx.globalAlpha = s.a * tw;
        cx.fillStyle = s.gold ? '#e2cb99' : '#dfe7ff';
        cx.beginPath();
        cx.arc(s.x + mouse.x * 14 * s.d, s.y + mouse.y * 10 * s.d, s.r, 0, 6.2832);
        cx.fill();
      }
      cx.globalAlpha = 1;
      if (!meteor && now > nextMeteor) {
        meteor = { x: W * (0.2 + Math.random() * 0.7), y: -20, vx: -(0.25 + Math.random() * 0.2), vy: 0.42 + Math.random() * 0.2, life: 1 };
        nextMeteor = now + 9000 + Math.random() * 14000;
      }
      if (meteor) {
        meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt; meteor.life -= dt / 1400;
        var g = cx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * 170, meteor.y - meteor.vy * 170);
        g.addColorStop(0, 'rgba(255,244,214,' + Math.max(0, meteor.life).toFixed(2) + ')');
        g.addColorStop(1, 'rgba(255,244,214,0)');
        cx.strokeStyle = g; cx.lineWidth = 1.6;
        cx.beginPath(); cx.moveTo(meteor.x, meteor.y); cx.lineTo(meteor.x - meteor.vx * 170, meteor.y - meteor.vy * 170); cx.stroke();
        if (meteor.life <= 0 || meteor.y > H + 40) meteor = null;
      }
    }
    build();
    nextMeteor = performance.now() + 3500;
    var resizeTimer = 0;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 200); });
    if (fine) window.addEventListener('pointermove', function (e) { mouse.tx = e.clientX / W * 2 - 1; mouse.ty = e.clientY / H * 2 - 1; }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAnimationFrame(raf); else { last = 0; raf = requestAnimationFrame(frame); }
    });
    raf = requestAnimationFrame(frame);
  }
  if (window.requestIdleCallback) requestIdleCallback(startSky, { timeout: 1200 }); else setTimeout(startSky, 300);

})();
