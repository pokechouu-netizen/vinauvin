/* ============================================================
   cms.js — Helpers partagés de l'admin LMG Bijoux
   Auth Netlify Identity + lecture/écriture GitHub via git-proxy.
   ============================================================ */
(function (global) {
  'use strict';

  // Netlify Git Gateway : écrit dans GitHub via la connexion Netlify (aucun token manuel requis).
  var GIT = '/.netlify/git/github/contents/';
  var BRANCH = 'main';
  var hookUrl = null;

  function jwt() {
    var u = (global.netlifyIdentity && netlifyIdentity.currentUser());
    return u ? u.jwt() : Promise.reject(new Error('not-logged-in'));
  }

  /* ---- base64 <-> JSON (UTF-8 safe) ---- */
  function b64decode(content) {
    return JSON.parse(decodeURIComponent(escape(atob((content || '').replace(/\n/g, '')))));
  }
  function b64encodeObj(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2))));
  }

  /* ---- low-level proxy calls ---- */
  function gitGetRaw(path) {
    return jwt().then(function (t) {
      return fetch(GIT + path + '?ref=' + BRANCH, { headers: { Authorization: 'Bearer ' + t } }).then(function (r) {
        if (!r.ok) throw new Error('GET ' + path + ' → ' + r.status);
        return r.json();
      });
    });
  }
  function gitPutRaw(path, body) {
    if (body && !body.branch) body.branch = BRANCH;
    return jwt().then(function (t) {
      return fetch(GIT + path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (tx) { throw new Error('PUT ' + path + ' → ' + r.status + ' ' + tx); });
        return r.json();
      });
    });
  }

  /* ---- high-level helpers ---- */
  // Charge un fichier JSON → { data, sha }
  function load(path) {
    return gitGetRaw(path).then(function (d) {
      return { data: b64decode(d.content), sha: d.sha };
    });
  }
  // Enregistre un objet JSON → renvoie le nouveau sha + déclenche le déploiement
  function save(path, obj, sha, message) {
    var body = { message: message || ('Mise à jour ' + path), content: b64encodeObj(obj) };
    if (sha) body.sha = sha;
    return gitPutRaw(path, body).then(function (d) {
      triggerDeploy();
      return d.content.sha;
    });
  }
  // Téléverse une image → renvoie son chemin dans le dépôt (assets/uploads/...)
  // La photo est redimensionnée côté navigateur (max 1600px, JPEG) avant l'envoi :
  // les photos de téléphone (5-10 Mo) dépassent sinon la limite de Git Gateway.
  var IMG_MAX_DIM = 1600;
  var IMG_MAX_RAW = 4 * 1024 * 1024;

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onerror = function () { reject(new Error('Impossible de lire le fichier')); };
      r.onload = function (e) { resolve(e.target.result); };
      r.readAsDataURL(file);
    });
  }

  function downscaleImage(file) {
    return readAsDataURL(file).then(function (dataUrl) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) { reject(new Error('image-invalide')); return; }
          var scale = Math.min(1, IMG_MAX_DIM / Math.max(w, h));
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          var isPng = file.type === 'image/png';
          var out = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.82);
          resolve({ b64: out.split(',')[1], ext: isPng ? '.png' : '.jpg' });
        };
        img.onerror = function () { reject(new Error('decodage-image')); };
        img.src = dataUrl;
      });
    });
  }

  function uploadImage(file, folder) {
    folder = folder || 'assets/uploads';
    return downscaleImage(file)
      .catch(function () {
        // Format que le navigateur ne sait pas décoder → envoi brut si raisonnable
        if (file.size > IMG_MAX_RAW) {
          var err = new Error('Photo trop lourde ou format non pris en charge — choisissez un JPG/PNG de moins de 4 Mo');
          err.friendly = true;
          throw err;
        }
        return readAsDataURL(file).then(function (dataUrl) {
          var m = (file.name.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0];
          return { b64: dataUrl.split(',')[1], ext: m.toLowerCase() };
        });
      })
      .then(function (imgData) {
        var base = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9\-_]/gi, '-').toLowerCase() || 'photo';
        var path = folder + '/' + Date.now() + '_' + base + imgData.ext;
        return gitPutRaw(path, { message: 'Image : ' + path, content: imgData.b64 })
          .then(function () { return path; });
      });
  }

  /* ---- déploiement (build hook stocké dans data/infos.json) ---- */
  function loadHook() {
    return gitGetRaw('data/infos.json').then(function (d) {
      hookUrl = b64decode(d.content).netlify_hook || null;
    }).catch(function () {});
  }
  function triggerDeploy() {
    if (hookUrl) { fetch(hookUrl, { method: 'POST' }).catch(function () {}); }
  }

  /* ---- auth bootstrap : gère #loginScreen / #adminScreen ---- */
  function requireAuth(onReady) {
    function show() {
      var ls = document.getElementById('loginScreen'); if (ls) ls.style.display = 'none';
      var as = document.getElementById('adminScreen'); if (as) as.style.display = 'block';
      loadHook();
      if (onReady) onReady();
    }
    netlifyIdentity.on('init', function (u) { if (u) show(); });
    netlifyIdentity.on('login', function () { netlifyIdentity.close(); show(); });
    netlifyIdentity.on('logout', function () {
      var as = document.getElementById('adminScreen'); if (as) as.style.display = 'none';
      var ls = document.getElementById('loginScreen'); if (ls) ls.style.display = 'flex';
    });
  }

  /* ---- petits utilitaires ---- */
  function esc(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
  function eh(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  // Résout un chemin image relatif au site, pour l'afficher depuis /admin/
  function imgSrc(path) {
    if (!path) return '';
    if (/^(https?:|\/|data:)/.test(path)) return path;
    return '../' + path;
  }
  // Statut visuel (#statusEl)
  function status(type, msg) {
    var el = document.getElementById('statusEl');
    if (!el) return;
    el.className = 'status' + (type ? ' ' + type : '');
    el.textContent = msg || '';
  }

  global.CMS = {
    load: load, save: save, uploadImage: uploadImage,
    requireAuth: requireAuth,
    login: function () { netlifyIdentity.open(); },
    logout: function () { netlifyIdentity.logout(); },
    esc: esc, eh: eh, imgSrc: imgSrc, status: status
  };
})(window);
