/* NatalProfile — paying for a report by card on the site (YooKassa).
   1) "Pay by card" button: asks the bot's server to create a payment and goes to YooKassa's page.
      Card details are entered there, never on this site.
   2) Return page (/paid/?c=…): asks the server whether the payment went through and shows the link
      that opens the paid report in the Telegram bot. */
(function () {
  'use strict';
  if (!window.fetch) return;

  /* owner's check price: a secret word in the address (?test=…) is kept for this browser tab and sent with the
     payment request; the server ignores it unless it matches its own setting */
  var testKey = '';
  try {
    testKey = new URLSearchParams(window.location.search).get('test') || sessionStorage.getItem('np-test') || '';
    if (testKey) sessionStorage.setItem('np-test', testKey);
  } catch (e) {}

  Array.prototype.forEach.call(document.querySelectorAll('[data-pay]'), function (box) {
    var btn = box.querySelector('[data-pay-btn]'), status = box.querySelector('.pay-status');
    var T = JSON.parse(box.getAttribute('data-i18n'));
    btn.addEventListener('click', function () {
      btn.disabled = true; status.textContent = T.wait; status.classList.remove('bad');
      fetch(box.getAttribute('data-api') + '/api/site/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: box.getAttribute('data-product'), lang: box.getAttribute('data-lang'), test: testKey || undefined,
                               email: (box.querySelector('[data-pay-email]') || {}).value || undefined })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.url) { window.location.href = d.url; return; }
        btn.disabled = false; status.classList.add('bad');
        status.textContent = d.error === 'rate_limited' ? T.limit : T.failed;
      }).catch(function () { btn.disabled = false; status.classList.add('bad'); status.textContent = T.failed; });
    });
  });

  var paid = document.getElementById('paid-box');
  if (paid) {
    var P = JSON.parse(paid.getAttribute('data-i18n'));
    var code = (new URLSearchParams(window.location.search).get('c') || '').replace(/[^a-zA-Z0-9_-]/g, '');
    var title = paid.querySelector('h1'), text = paid.querySelector('.paid-text'), link = paid.querySelector('.paid-link'), tries = 0;
    function show(h, p) { title.textContent = h; text.textContent = p; }
    function check() {
      tries++;
      fetch(paid.getAttribute('data-api') + '/api/site/pay/status?c=' + encodeURIComponent(code))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.status === 'paid' && d.link) {
            show(P.paidH, P.paidP);
            /* say plainly what the money was for: the bank notice shows only the shop name */
            var what = paid.querySelector('.paid-what');
            if (what && d.product) {
              what.textContent = P.what.replace('{product}', P.products[d.product] || d.product).replace('{sum}', d.amount != null ? String(d.amount).replace(/\.0+$/, '') : '');
              what.hidden = false;
            }
            link.href = d.link; link.hidden = false;
            paid.querySelector('.paid-keep').hidden = false;
          } else if (d.status === 'canceled') { show(P.cancelH, P.cancelP); paid.querySelector('.paid-back').hidden = false; }
          else if (d.status === 'unknown' || d.status === 'mismatch') { show(P.unknownH, P.unknownP); }
          else if (tries < 40) { setTimeout(check, 3000); }
          else { show(P.slowH, P.slowP); }
        })
        .catch(function () { if (tries < 40) setTimeout(check, 4000); else show(P.slowH, P.slowP); });
    }
    if (code) check(); else show(P.unknownH, P.unknownP);
  }
})();
