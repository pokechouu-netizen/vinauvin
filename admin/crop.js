/* ============================================================
   crop.js — Recadrage de photo avant envoi (admin Au Vin sur Vin)
   Usage : Crop.open(file, { aspect: 4/3, title: 'Photo d'accueil' })
     → Promise<File|null>  (null = annulé)
   Déplacement à la souris / au doigt + molette ou curseur pour zoomer.
   « Photo entière » renvoie le fichier original sans recadrage.
   ============================================================ */
(function (global) {
  'use strict';

  var css = '\
.crop-overlay{position:fixed;inset:0;z-index:6000;background:rgba(20,12,14,.72);display:flex;align-items:center;justify-content:center;padding:1rem;}\
.crop-modal{background:#fff;border-radius:14px;max-width:600px;width:100%;padding:1.2rem 1.2rem 1rem;box-shadow:0 24px 64px rgba(0,0,0,.4);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}\
.crop-modal h3{font-size:1.05rem;font-weight:700;margin:0 0 .3rem;color:#1c1a17;}\
.crop-modal .crop-hint{font-size:.8rem;color:#8a8275;margin:0 0 .8rem;}\
.crop-stage{position:relative;width:100%;background:#111;border-radius:10px;overflow:hidden;touch-action:none;cursor:grab;user-select:none;}\
.crop-stage.dragging{cursor:grabbing;}\
.crop-stage img{position:absolute;top:0;left:0;transform-origin:0 0;max-width:none;pointer-events:none;-webkit-user-drag:none;}\
.crop-grid{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 0 2px rgba(255,255,255,.85);}\
.crop-grid::before,.crop-grid::after{content:"";position:absolute;background:rgba(255,255,255,.35);}\
.crop-grid::before{left:33.33%;right:33.33%;top:0;bottom:0;border-left:1px solid rgba(255,255,255,.35);border-right:1px solid rgba(255,255,255,.35);background:none;}\
.crop-grid::after{top:33.33%;bottom:33.33%;left:0;right:0;border-top:1px solid rgba(255,255,255,.35);border-bottom:1px solid rgba(255,255,255,.35);background:none;}\
.crop-zoom-row{display:flex;align-items:center;gap:.6rem;margin:.9rem 0 .2rem;}\
.crop-zoom-row span{font-size:1rem;color:#8a8275;}\
.crop-zoom-row input[type=range]{flex:1;accent-color:#7B2D42;}\
.crop-btns{display:flex;gap:.6rem;justify-content:flex-end;margin-top:.9rem;flex-wrap:wrap;}\
.crop-btn{border:none;border-radius:8px;padding:.55rem 1.1rem;font-size:.88rem;font-weight:600;cursor:pointer;}\
.crop-btn-ok{background:#7B2D42;color:#fff;}\
.crop-btn-ok:hover{background:#5e2233;}\
.crop-btn-full{background:#f0ece6;color:#1c1a17;}\
.crop-btn-cancel{background:none;color:#8a8275;text-decoration:underline;font-weight:400;}\
@media(max-width:640px){.crop-modal{padding:.9rem;}.crop-btns{justify-content:stretch;}.crop-btn{flex:1;}}';

  var styleEl = null;
  function ensureStyle() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decodage-image')); };
      img.src = url;
    });
  }

  function open(file, opts) {
    opts = opts || {};
    var aspect = opts.aspect || 4 / 3;
    ensureStyle();

    return loadImage(file).then(function (loaded) {
      return new Promise(function (resolve) {
        var img = loaded.img;
        var iw = img.naturalWidth, ih = img.naturalHeight;

        var overlay = document.createElement('div');
        overlay.className = 'crop-overlay';
        overlay.innerHTML =
          '<div class="crop-modal">' +
          '<h3>Recadrer' + (opts.title ? ' — ' + String(opts.title).replace(/</g, '&lt;') : '') + '</h3>' +
          '<p class="crop-hint">Déplacez la photo avec la souris (ou le doigt), zoomez avec le curseur. La zone visible = ce qui s\'affichera sur le site.</p>' +
          '<div class="crop-stage"><img alt=""><div class="crop-grid"></div></div>' +
          '<div class="crop-zoom-row"><span>🔍−</span><input type="range" min="100" max="300" value="100"><span>🔍+</span></div>' +
          '<div class="crop-btns">' +
          '<button type="button" class="crop-btn crop-btn-cancel">Annuler</button>' +
          '<button type="button" class="crop-btn crop-btn-full">Photo entière</button>' +
          '<button type="button" class="crop-btn crop-btn-ok">Valider le cadrage ✓</button>' +
          '</div></div>';
        document.body.appendChild(overlay);

        var stage = overlay.querySelector('.crop-stage');
        var imEl = overlay.querySelector('.crop-stage img');
        var range = overlay.querySelector('input[type=range]');
        imEl.src = loaded.url;

        // Dimensionne la scène selon le ratio demandé
        var W = Math.min(552, overlay.querySelector('.crop-modal').clientWidth - 2);
        var H = Math.round(W / aspect);
        var maxH = Math.round(window.innerHeight * 0.5);
        if (H > maxH) { H = maxH; W = Math.round(H * aspect); }
        stage.style.width = W + 'px';
        stage.style.height = H + 'px';
        stage.style.margin = '0 auto';

        var s0 = Math.max(W / iw, H / ih); // échelle mini (cover)
        var zoom = 1, tx, ty;

        function clamp() {
          var s = s0 * zoom;
          tx = Math.min(0, Math.max(W - iw * s, tx));
          ty = Math.min(0, Math.max(H - ih * s, ty));
        }
        function center() {
          var s = s0 * zoom;
          tx = (W - iw * s) / 2;
          ty = (H - ih * s) / 2;
        }
        function render() {
          var s = s0 * zoom;
          imEl.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')';
          imEl.style.width = iw + 'px';
          imEl.style.height = ih + 'px';
        }
        center(); render();

        // Drag (souris + tactile via Pointer Events)
        var dragging = false, lastX = 0, lastY = 0;
        stage.addEventListener('pointerdown', function (e) {
          dragging = true; lastX = e.clientX; lastY = e.clientY;
          stage.classList.add('dragging');
          stage.setPointerCapture(e.pointerId);
        });
        stage.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          tx += e.clientX - lastX; ty += e.clientY - lastY;
          lastX = e.clientX; lastY = e.clientY;
          clamp(); render();
        });
        stage.addEventListener('pointerup', function () { dragging = false; stage.classList.remove('dragging'); });
        stage.addEventListener('pointercancel', function () { dragging = false; stage.classList.remove('dragging'); });

        // Zoom : curseur + molette (centré sur le milieu du cadre)
        function setZoom(z) {
          z = Math.min(3, Math.max(1, z));
          var cx = (W / 2 - tx) / (s0 * zoom); // point image au centre du cadre
          var cy = (H / 2 - ty) / (s0 * zoom);
          zoom = z;
          tx = W / 2 - cx * s0 * zoom;
          ty = H / 2 - cy * s0 * zoom;
          clamp(); render();
          range.value = Math.round(zoom * 100);
        }
        range.addEventListener('input', function () { setZoom(this.value / 100); });
        stage.addEventListener('wheel', function (e) {
          e.preventDefault();
          setZoom(zoom * (e.deltaY < 0 ? 1.06 : 0.94));
        }, { passive: false });

        function close(result) {
          URL.revokeObjectURL(loaded.url);
          overlay.remove();
          resolve(result);
        }

        overlay.querySelector('.crop-btn-cancel').onclick = function () { close(null); };
        overlay.querySelector('.crop-btn-full').onclick = function () { close(file); };
        overlay.querySelector('.crop-btn-ok').onclick = function () {
          var s = s0 * zoom;
          var sx = -tx / s, sy = -ty / s, sw = W / s, sh = H / s;
          var outW = Math.min(1600, Math.round(sw));
          var outH = Math.round(outW / aspect);
          var canvas = document.createElement('canvas');
          canvas.width = outW; canvas.height = outH;
          canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
          canvas.toBlob(function (blob) {
            if (!blob) { close(file); return; }
            var name = (file.name || 'photo').replace(/\.[a-z0-9]+$/i, '') + '_recadre.jpg';
            close(new File([blob], name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };

        // Échap = annuler
        overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(null); });
        overlay.tabIndex = -1; overlay.focus();
      });
    }).catch(function () {
      // Format non décodable (ex : HEIC sur certains navigateurs) → pas de recadrage possible
      return file;
    });
  }

  global.Crop = { open: open };
})(window);
