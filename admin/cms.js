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
  function uploadImage(file, folder) {
    folder = folder || 'assets/uploads';
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onerror = reject;
      r.onload = function (e) {
        var b64 = e.target.result.split(',')[1];
        var name = Date.now() + '_' + file.name.replace(/[^a-z0-9.\-_]/gi, '-').toLowerCase();
        var path = folder + '/' + name;
        gitPutRaw(path, { message: 'Image : ' + name, content: b64 })
          .then(function () { resolve(path); }).catch(reject);
      };
      r.readAsDataURL(file);
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
