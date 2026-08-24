/* ============================================================
   tour.js — Tutoriel guidé à bulles pour l'admin Au Vin sur Vin
   Usage : Tour.start(steps)
   step = { el: '#selecteur' (ou null = bulle centrée), title, text }
   ============================================================ */
(function (global) {
  'use strict';

  var css = '\
.tour-overlay{position:fixed;inset:0;z-index:5000;pointer-events:none;}\
.tour-highlight{position:absolute;border-radius:10px;box-shadow:0 0 0 4px rgba(123,45,66,.85),0 0 0 9999px rgba(20,12,14,.62);transition:all .3s ease;pointer-events:none;}\
.tour-bubble{position:absolute;pointer-events:auto;background:#fff;color:#1c1a17;border-radius:14px;padding:1.1rem 1.2rem 1rem;max-width:340px;min-width:250px;box-shadow:0 16px 48px rgba(0,0,0,.35);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:tourPop .25s ease;}\
@keyframes tourPop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}\
.tour-bubble::after{content:"";position:absolute;width:14px;height:14px;background:#fff;transform:rotate(45deg);}\
.tour-bubble.arrow-top::after{top:-7px;left:28px;}\
.tour-bubble.arrow-bottom::after{bottom:-7px;left:28px;}\
.tour-bubble.arrow-none::after{display:none;}\
.tour-step-num{display:inline-block;font-size:.68rem;font-weight:700;color:#7B2D42;background:rgba(123,45,66,.1);padding:.15rem .55rem;border-radius:50px;margin-bottom:.5rem;}\
.tour-bubble h3{font-size:1rem;font-weight:700;margin:0 0 .4rem;}\
.tour-bubble p{font-size:.85rem;line-height:1.6;color:#5c554d;margin:0 0 .9rem;white-space:pre-line;}\
.tour-btns{display:flex;gap:.5rem;justify-content:flex-end;align-items:center;}\
.tour-btns .tour-count{margin-right:auto;font-size:.72rem;color:#a09889;}\
.tour-btn{border:none;border-radius:7px;padding:.42rem .85rem;font-size:.8rem;font-weight:600;cursor:pointer;}\
.tour-btn-next{background:#7B2D42;color:#fff;}\
.tour-btn-next:hover{background:#5e2233;}\
.tour-btn-prev{background:#f0ece6;color:#1c1a17;}\
.tour-btn-quit{background:none;color:#a09889;text-decoration:underline;font-weight:400;padding:.42rem .3rem;}\
@media(max-width:480px){.tour-bubble{max-width:calc(100vw - 24px);min-width:0;}}';

  var styleEl = null, overlay = null, steps = [], idx = 0, onEnd = null;

  function ensureStyle() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function destroy() {
    if (overlay) { overlay.remove(); overlay = null; }
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
    if (onEnd) { var f = onEnd; onEnd = null; f(); }
  }

  function reposition() {
    if (overlay) show(idx, true);
  }

  function show(i, noScroll) {
    idx = i;
    var step = steps[i];
    if (!step) { destroy(); return; }

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'tour-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = '';

    var target = step.el ? document.querySelector(step.el) : null;
    var hl = document.createElement('div');
    hl.className = 'tour-highlight';
    overlay.appendChild(hl);

    var bubble = document.createElement('div');
    bubble.className = 'tour-bubble';
    bubble.innerHTML =
      '<span class="tour-step-num">Étape ' + (i + 1) + ' / ' + steps.length + '</span>' +
      '<h3>' + esc(step.title) + '</h3>' +
      '<p>' + esc(step.text) + '</p>' +
      '<div class="tour-btns">' +
      '<span class="tour-count"></span>' +
      '<button type="button" class="tour-btn tour-btn-quit">Quitter</button>' +
      (i > 0 ? '<button type="button" class="tour-btn tour-btn-prev">← Précédent</button>' : '') +
      '<button type="button" class="tour-btn tour-btn-next">' + (i === steps.length - 1 ? 'Terminer ✓' : 'Suivant →') + '</button>' +
      '</div>';
    overlay.appendChild(bubble);

    bubble.querySelector('.tour-btn-next').onclick = function () { show(idx + 1); };
    var prev = bubble.querySelector('.tour-btn-prev');
    if (prev) prev.onclick = function () { show(idx - 1); };
    bubble.querySelector('.tour-btn-quit').onclick = destroy;

    function place() {
      var vw = window.innerWidth, vh = window.innerHeight;
      var bw = bubble.offsetWidth, bh = bubble.offsetHeight;
      if (target) {
        var r = target.getBoundingClientRect();
        hl.style.display = 'block';
        hl.style.left = (r.left - 6) + 'px';
        hl.style.top = (r.top - 6) + 'px';
        hl.style.width = (r.width + 12) + 'px';
        hl.style.height = (r.height + 12) + 'px';
        var left = Math.max(12, Math.min(r.left, vw - bw - 12));
        // Sous la cible si la place le permet, sinon au-dessus
        if (r.bottom + bh + 20 < vh) {
          bubble.className = 'tour-bubble arrow-top';
          bubble.style.top = (r.bottom + 14) + 'px';
        } else if (r.top - bh - 20 > 0) {
          bubble.className = 'tour-bubble arrow-bottom';
          bubble.style.top = (r.top - bh - 14) + 'px';
        } else {
          bubble.className = 'tour-bubble arrow-none';
          bubble.style.top = Math.max(12, (vh - bh) / 2) + 'px';
        }
        bubble.style.left = left + 'px';
      } else {
        hl.style.display = 'none';
        hl.style.boxShadow = 'none';
        overlay.style.background = 'rgba(20,12,14,.62)';
        overlay.style.pointerEvents = 'auto';
        bubble.className = 'tour-bubble arrow-none';
        bubble.style.left = Math.max(12, (vw - bw) / 2) + 'px';
        bubble.style.top = Math.max(12, (vh - bh) / 2 - 40) + 'px';
      }
      if (target && !noScroll) {
        var rr = target.getBoundingClientRect();
        if (rr.top < 70 || rr.bottom > vh - 120) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(function () { show(idx, true); }, 350);
        }
      }
    }
    // L'overlay sans cible bloque les clics ; avec cible il laisse passer
    overlay.style.pointerEvents = target ? 'none' : 'auto';
    overlay.style.background = 'transparent';
    place();
  }

  global.Tour = {
    start: function (tourSteps, options) {
      if (!tourSteps || !tourSteps.length) return;
      ensureStyle();
      steps = tourSteps.filter(function (s) { return !s.el || document.querySelector(s.el); });
      onEnd = options && options.onEnd || null;
      show(0);
    },
    stop: destroy
  };

  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
})(window);
