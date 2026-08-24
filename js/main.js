/* ============================================
   AU VIN SUR VIN — Main JS v4
   Contenu géré via /admin (fichiers data/*.json sur GitHub)
   Language switch · Modal · Burger · Scroll reveal
   Parallax · Carousel autoplay · Scroll effects
   ============================================ */

(function () {
  'use strict';

  /* =============================================
     STATE
     ============================================= */
  var currentLang = 'fr';
  var sheetData = {
    vins: [],
    horaires: [],
    carte: []
  };
  var imageConfig = {};

  /* =============================================
     FETCH DATA (data/*.json — gérés via /admin)
     ============================================= */
  function fetchJSON(path) {
    return fetch(path, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function loadAllData() {
    Promise.all([
      fetchJSON('data/vins.json'),
      fetchJSON('data/horaires.json'),
      fetchJSON('data/suggestions.json'),
      fetchJSON('data/infos.json'),
      fetchJSON('data/photos.json')
    ]).then(function (results) {
      processVins(results[0]);
      processHoraires(results[1]);
      processSuggestions(results[2]);
      processInfos(results[3]);
      processPhotos(results[4]);
      applyDynamicImages();
      renderVinsCarousel();
      renderHoraires();
      renderSuggestions();
    }).catch(function () {
      showVinsFallback();
      showSuggestionsFallback();
    });
  }

  /* =============================================
     PROCESS DATA
     ============================================= */

  // data/vins.json → { vins: [{nom, appellation, image}] }
  function processVins(d) {
    if (!d || !Array.isArray(d.vins)) return;
    d.vins.forEach(function (v) {
      if (!v || !v.nom || !String(v.nom).trim()) return;
      sheetData.vins.push({
        nom: v.nom,
        appellation: v.appellation || '',
        image: v.image || '',
        description: ''
      });
    });
  }

  // data/horaires.json → { horaires: [{jour, midi, soir, note}] }
  function processHoraires(d) {
    if (!d || !Array.isArray(d.horaires)) return;
    d.horaires.forEach(function (h) {
      if (!h || !h.jour) return;
      sheetData.horaires.push({
        jour: h.jour,
        ouverture: h.midi || '',
        fermeture: h.soir || '',
        jour_fr: h.jour,
        jour_en: h.jour,
        note_fr: h.note || '',
        note_en: (h.note_en && String(h.note_en).trim()) || h.note || ''
      });
    });
  }

  // data/suggestions.json → { suggestions: [{nom, description, nom_en, description_en}] }
  // Les champs *_en sont optionnels : repli sur le français s'ils sont vides.
  function processSuggestions(d) {
    if (!d || !Array.isArray(d.suggestions)) return;
    d.suggestions.forEach(function (s) {
      if (!s || !s.nom || !String(s.nom).trim()) return;
      sheetData.carte.push({
        nom_fr: s.nom,
        nom_en: (s.nom_en && String(s.nom_en).trim()) || s.nom,
        desc_fr: s.description || '',
        desc_en: (s.description_en && String(s.description_en).trim()) || s.description || '',
        prix: ''
      });
    });
  }

  // data/infos.json → { telephone, prix_entrees, prix_plats, prix_desserts }
  function processInfos(d) {
    if (!d) return;
    if (d.telephone) applyPhone(d.telephone);
    if (d.prix_entrees) applyPrix('prixEntrees', 'Entrées', 'Starters', d.prix_entrees);
    if (d.prix_plats) applyPrix('prixPlats', 'Plats', 'Mains', d.prix_plats);
    if (d.prix_desserts) applyPrix('prixDesserts', 'Desserts', 'Desserts', d.prix_desserts);
  }

  // data/photos.json → { photos: {img_clé: chemin} }
  function processPhotos(d) {
    if (!d || !d.photos) return;
    Object.keys(d.photos).forEach(function (key) {
      if (key.indexOf('img_') === 0 && d.photos[key]) {
        imageConfig[key] = d.photos[key];
      }
    });
  }

  function applyPhone(phone) {
    if (!phone) return;
    // Format pour le lien tel: (enlever espaces et points)
    var telLink = phone.replace(/[\s.()-]/g, '');
    if (telLink.indexOf('+') !== 0 && telLink.indexOf('0') === 0) {
      telLink = '0' + telLink.substring(1);
    }

    // Mettre à jour le numéro affiché dans la section contact
    var contactPhone = document.getElementById('contactPhone');
    if (contactPhone) contactPhone.textContent = phone;

    // Mettre à jour la modale téléphone
    var phoneNumber = document.querySelector('.phone-number');
    if (phoneNumber) phoneNumber.textContent = phone;

    // Mettre à jour le lien tel:
    var phoneLink = document.querySelector('.btn-modal-call');
    if (phoneLink) phoneLink.setAttribute('href', 'tel:' + telLink);
  }

  function applyPrix(id, labelFr, labelEn, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.setAttribute('data-fr', labelFr + ' ' + value);
    el.setAttribute('data-en', labelEn + ' ' + value);
    el.textContent = (currentLang === 'fr') ? labelFr + ' ' + value : labelEn + ' ' + value;
  }

  // Applique les images dynamiques depuis data/photos.json
  function applyDynamicImages() {
    var els = document.querySelectorAll('[data-img-key]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-img-key');
      if (imageConfig[key]) {
        // Sauvegarder le src original comme fallback
        if (!el.getAttribute('data-fallback-src')) {
          el.setAttribute('data-fallback-src', el.getAttribute('src'));
        }
        el.setAttribute('src', imageConfig[key]);
        // Fallback si l'image ne charge pas
        el.onerror = function () {
          var fallback = this.getAttribute('data-fallback-src');
          if (fallback) {
            this.setAttribute('src', fallback);
            this.onerror = null;
          }
        };
      }
    }
    // Mettre a jour le lightbox avec les nouveaux src
    updateLightboxSources();
  }

  // Resynchronise les src du lightbox apres changement dynamique d'images
  function updateLightboxSources() {
    for (var i = 0; i < _lightboxPhotos.length; i++) {
      if (_lightboxPhotos[i].el) {
        _lightboxPhotos[i].src = _lightboxPhotos[i].el.src;
      }
    }
  }

  /* =============================================
     RENDER HORAIRES
     ============================================= */
  function renderHoraires() {
    if (sheetData.horaires.length === 0) return;

    var container = document.getElementById('horairesContent');
    if (!container) return;

    var labelMidi = currentLang === 'fr' ? 'Midi' : 'Lunch';
    var labelSoir = currentLang === 'fr' ? 'Soir' : 'Evening';

    var html = '<table class="horaires-table">';
    html += '<thead><tr><th></th><th>' + labelMidi + '</th><th>' + labelSoir + '</th></tr></thead>';
    html += '<tbody>';
    sheetData.horaires.forEach(function (h) {
      var midi = h.ouverture ? h.ouverture.trim() : '';
      var soir = h.fermeture ? h.fermeture.trim() : '';
      var midiOuvert = midi && midi.toLowerCase() !== 'fermé' && midi.toLowerCase() !== 'ferme';
      var soirOuvert = soir && soir.toLowerCase() !== 'fermé' && soir.toLowerCase() !== 'ferme' && soir.toUpperCase() !== 'NON';

      var midiText = midiOuvert ? midi : (currentLang === 'fr' ? 'Fermé' : 'Closed');
      var soirText = soirOuvert ? soir : (currentLang === 'fr' ? 'Fermé' : 'Closed');

      // Si les deux sont fermés, afficher "Fermé" sur toute la ligne
      var toutFerme = !midiOuvert && !soirOuvert;

      var note = currentLang === 'fr' ? (h.note_fr || '') : (h.note_en || '');

      html += '<tr>';
      html += '<td>' + escapeHTML(h.jour) + '</td>';
      if (toutFerme) {
        html += '<td colspan="2" class="horaires-ferme">' + (currentLang === 'fr' ? 'Fermé' : 'Closed');
      } else {
        html += '<td>' + escapeHTML(midiText) + '</td>';
        html += '<td>' + escapeHTML(soirText);
      }
      if (note) {
        html += ' <span class="horaires-note-exc">' + escapeHTML(note) + '</span>';
      }
      html += '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';

    container.innerHTML = html;
  }

  /* =============================================
     RENDER AU GRE DES SAISONS (from SUGGESTIONS)
     ============================================= */

  /* =============================================
     RENDER SUGGESTIONS DU MOMENT
     ============================================= */
  function renderSuggestions() {
    var container = document.getElementById('suggestionsContent');
    if (!container) return;

    if (sheetData.carte.length === 0) {
      showSuggestionsFallback();
      return;
    }

    var html = '';
    sheetData.carte.forEach(function (item) {
      html += '<div class="suggestion-card">';
      html += '<h4>' + escapeHTML(currentLang === 'fr' ? item.nom_fr : item.nom_en) + '</h4>';
      var desc = currentLang === 'fr' ? item.desc_fr : item.desc_en;
      if (desc) {
        html += '<p>' + escapeHTML(desc) + '</p>';
      }
      if (item.prix) {
        html += '<span class="suggestion-prix">' + escapeHTML(item.prix) + '</span>';
      }
      html += '</div>';
    });
    container.innerHTML = html;
  }

  function showSuggestionsFallback() {
    var container = document.getElementById('suggestionsContent');
    if (!container) return;

    var msg = currentLang === 'fr'
      ? 'Les suggestions du moment arrivent bientôt.'
      : 'Current suggestions coming soon.';

    container.innerHTML = '<div style="text-align:center;padding:2rem 1rem;">' +
      '<p style="color:rgba(248,243,235,.5);font-size:1rem;font-style:italic;">' + msg + '</p>' +
      '</div>';
  }

  /* =============================================
     RENDER VINS CAROUSEL (Photo + Titre + Appellation only)
     ============================================= */
  // Photos locales des bouteilles
  var localVins = [
    { nom: 'Clos du Mont-Olivet', appellation: 'Châteauneuf-du-Pape', image: 'assets/img/32.jpg' },
    { nom: 'Christophe Pichon — Tess', appellation: 'Côte-Rôtie', image: 'assets/img/37.jpg' },
    { nom: 'Domaine Cros de Romet — Affrountaire', appellation: 'Cairanne', image: 'assets/img/33.jpg' },
    { nom: 'Gigondas', appellation: 'Vallée du Rhône', image: 'assets/img/39.jpg' },
    { nom: 'Viognier', appellation: 'IGP Drôme', image: 'assets/img/28.jpg' },
    { nom: 'Rosé Côtes du Rhône', appellation: 'Vallée du Rhône', image: 'assets/img/30.jpg' }
  ];

  function renderVinsCarousel() {
    var container = document.getElementById('vinsCarousel');
    if (!container) return;

    // Toujours utiliser les données du Sheet si elles existent, sinon les photos locales
    var vins = sheetData.vins.length > 0 ? sheetData.vins : localVins;

    if (vins.length === 0) {
      showVinsFallback();
      return;
    }

    // Images de remplacement quand le Sheet n'a pas d'URL d'image
    var defaultImages = [
      'assets/img/32.jpg',
      'assets/img/37.jpg',
      'assets/img/33.jpg',
      'assets/img/39.jpg',
      'assets/img/28.jpg',
      'assets/img/30.jpg'
    ];

    var html = '';

    vins.forEach(function (vin, index) {
      var imgSrc = vin.image || defaultImages[index % defaultImages.length];
      html += '<div class="vin-card">';
      html += '<div class="vin-card-img">';
      html += '<img src="' + escapeHTML(imgSrc) + '" alt="' + escapeHTML(vin.nom) + '" loading="lazy">';
      html += '</div>';
      html += '<div class="vin-card-body">';
      html += '<div class="vin-card-name">' + escapeHTML(vin.nom) + '</div>';
      if (vin.appellation) {
        html += '<div class="vin-card-region">' + escapeHTML(vin.appellation) + '</div>';
      }
      if (vin.description) {
        html += '<div class="vin-card-desc">' + escapeHTML(vin.description) + '</div>';
      }
      html += '</div>';
      html += '</div>';
    });

    container.innerHTML = html;
    initVinsIndicators();
    startVinsAutoplay();
    // Add vin images to lightbox
    addToLightbox('.vin-card-img img');
  }

  function showVinsFallback() {
    var container = document.getElementById('vinsCarousel');
    if (!container) return;

    var msg = currentLang === 'fr'
      ? 'Notre sélection de vins est en cours de mise à jour.'
      : 'Our wine selection is being updated.';

    container.innerHTML = '<div style="text-align:center;padding:3rem 1rem;width:100%;">' +
      '<p style="color:rgba(248,243,235,.5);font-size:1rem;font-style:italic;">' + msg + '</p>' +
      '</div>';
  }

  /* =============================================
     CAROUSEL NAVIGATION + AUTOPLAY
     ============================================= */
  var vinsAutoplayTimer = null;
  var vinsAutoplayBound = false;

  function getCarouselScrollAmount(carousel) {
    var card = carousel.querySelector('.vin-card, .produit-carousel-card, .galerie-card, .saison-card');
    if (card) {
      var gap = parseFloat(getComputedStyle(carousel).gap) || 0;
      return card.offsetWidth + gap;
    }
    return 300;
  }

  function initCarousel() {
    // Vins carousel
    setupCarousel('vinsCarousel', 'vinsPrev', 'vinsNext');
    // Produits carousel
    setupCarousel('produitsCarousel', 'produitsPrev', 'produitsNext');
    // Galerie plats carousel
    setupCarousel('galerieCarousel', 'galeriePrev', 'galerieNext');
    initGalerieIndicators();
    startGalerieAutoplay();
  }

  // Cache DOM refs for galerie indicators (avoid re-querying on every scroll)
  var _galerieCarousel = null;
  var _galerieCards = null;
  var _galerieIndicators = null;
  var _galerieScrollTicking = false;

  function initGalerieIndicators() {
    _galerieCarousel = document.getElementById('galerieCarousel');
    var container = document.getElementById('galerieIndicators');
    if (!_galerieCarousel || !container) return;
    _galerieCards = _galerieCarousel.querySelectorAll('.galerie-card');
    container.innerHTML = '';
    for (var i = 0; i < _galerieCards.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'galerie-indicator' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', 'Photo ' + (i + 1));
      btn.dataset.index = i;
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        var lastIndex = _galerieCards.length - 1;
        var maxScroll = _galerieCarousel.scrollWidth - _galerieCarousel.clientWidth;
        var scrollTarget = lastIndex > 0 ? (idx / lastIndex) * maxScroll : 0;
        _galerieCarousel.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      });
      container.appendChild(btn);
    }
    _galerieIndicators = container.querySelectorAll('.galerie-indicator');
    // Throttle scroll with rAF to avoid layout thrashing
    _galerieCarousel.addEventListener('scroll', function () {
      if (!_galerieScrollTicking) {
        _galerieScrollTicking = true;
        requestAnimationFrame(function () {
          updateGalerieIndicators();
          _galerieScrollTicking = false;
        });
      }
    });
  }

  function updateGalerieIndicators() {
    if (!_galerieCarousel || !_galerieIndicators || !_galerieCards.length) return;
    var scrollLeft = _galerieCarousel.scrollLeft;
    var maxScroll = _galerieCarousel.scrollWidth - _galerieCarousel.clientWidth;
    var lastIndex = _galerieCards.length - 1;
    var activeIndex = maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * lastIndex) : 0;
    activeIndex = Math.max(0, Math.min(lastIndex, activeIndex));
    for (var j = 0; j < _galerieIndicators.length; j++) {
      _galerieIndicators[j].classList.toggle('active', j === activeIndex);
    }
  }

  function setupCarousel(carouselId, prevId, nextId) {
    var carousel = document.getElementById(carouselId);
    var prevBtn = document.getElementById(prevId);
    var nextBtn = document.getElementById(nextId);

    if (!carousel || !prevBtn || !nextBtn) return;

    prevBtn.addEventListener('click', function () {
      carousel.scrollBy({ left: -getCarouselScrollAmount(carousel), behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', function () {
      carousel.scrollBy({ left: getCarouselScrollAmount(carousel), behavior: 'smooth' });
    });
  }

  // Vins indicators
  var _vinsCarousel = null;
  var _vinsIndicators = null;
  var _vinsScrollTicking = false;

  function initVinsIndicators() {
    _vinsCarousel = document.getElementById('vinsCarousel');
    var container = document.getElementById('vinsIndicators');
    if (!_vinsCarousel || !container) return;
    var cards = _vinsCarousel.querySelectorAll('.vin-card');
    if (!cards.length) return;
    container.innerHTML = '';
    for (var i = 0; i < cards.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'vins-indicator' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', 'Vin ' + (i + 1));
      btn.dataset.index = i;
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        var allCards = _vinsCarousel.querySelectorAll('.vin-card');
        var lastIndex = allCards.length - 1;
        var maxScroll = _vinsCarousel.scrollWidth - _vinsCarousel.clientWidth;
        var scrollTarget = lastIndex > 0 ? (idx / lastIndex) * maxScroll : 0;
        _vinsCarousel.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      });
      container.appendChild(btn);
    }
    _vinsIndicators = container.querySelectorAll('.vins-indicator');
    _vinsCarousel.addEventListener('scroll', function () {
      if (!_vinsScrollTicking) {
        _vinsScrollTicking = true;
        requestAnimationFrame(function () {
          updateVinsIndicators();
          _vinsScrollTicking = false;
        });
      }
    });
  }

  function updateVinsIndicators() {
    if (!_vinsCarousel || !_vinsIndicators || !_vinsIndicators.length) return;
    var scrollLeft = _vinsCarousel.scrollLeft;
    var maxScroll = _vinsCarousel.scrollWidth - _vinsCarousel.clientWidth;
    var lastIndex = _vinsIndicators.length - 1;
    var activeIndex = maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * lastIndex) : 0;
    activeIndex = Math.max(0, Math.min(lastIndex, activeIndex));
    for (var j = 0; j < _vinsIndicators.length; j++) {
      _vinsIndicators[j].classList.toggle('active', j === activeIndex);
    }
  }

  // Autoplay for vins carousel — always running
  function startVinsAutoplay() {
    stopVinsAutoplay();
    var carousel = document.getElementById('vinsCarousel');
    if (!carousel) return;

    vinsAutoplayTimer = setInterval(function () {
      var scrollAmount = getCarouselScrollAmount(carousel);
      var maxScroll = carousel.scrollWidth - carousel.clientWidth;

      if (carousel.scrollLeft >= maxScroll - 5) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 7000);
  }

  function stopVinsAutoplay() {
    if (vinsAutoplayTimer) {
      clearInterval(vinsAutoplayTimer);
      vinsAutoplayTimer = null;
    }
  }

  // Autoplay for galerie carousel
  var galerieAutoplayTimer = null;
  var _galerieScrollAmount = 0;
  function startGalerieAutoplay() {
    if (galerieAutoplayTimer) clearInterval(galerieAutoplayTimer);
    var carousel = document.getElementById('galerieCarousel');
    if (!carousel) return;
    // Cache scroll amount once (recalculated on resize via initCarousel)
    _galerieScrollAmount = getCarouselScrollAmount(carousel);
    galerieAutoplayTimer = setInterval(function () {
      var maxScroll = carousel.scrollWidth - carousel.clientWidth;
      if (carousel.scrollLeft >= maxScroll - 5) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: _galerieScrollAmount, behavior: 'smooth' });
      }
    }, 9000);
  }

  // Autoplay for produits carousel (mobile only)
  var produitsAutoplayTimer = null;
  function startProduitsAutoplay() {
    if (produitsAutoplayTimer) clearInterval(produitsAutoplayTimer);
    if (window.innerWidth > 1024) return; // Desktop: all 3 cards visible, no autoplay
    var carousel = document.getElementById('produitsCarousel');
    if (!carousel) return;
    var scrollAmount = getCarouselScrollAmount(carousel);
    produitsAutoplayTimer = setInterval(function () {
      var maxScroll = carousel.scrollWidth - carousel.clientWidth;
      if (carousel.scrollLeft >= maxScroll - 5) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 9000);
    // Pause on touch
    carousel.addEventListener('touchstart', function () {
      if (produitsAutoplayTimer) { clearInterval(produitsAutoplayTimer); produitsAutoplayTimer = null; }
    }, { passive: true, once: true });
  }

  /* =============================================
     PARALLAX EFFECT
     ============================================= */
  function initParallax() {
    var isMobile = window.innerWidth <= 768;
    if (isMobile) return;

    var parallaxElements = document.querySelectorAll('[data-parallax]');

    function updateParallax() {
      var scrollTop = window.pageYOffset;

      parallaxElements.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-speed')) || 0.1;
        var rect = el.getBoundingClientRect();
        var elementTop = rect.top + scrollTop;
        var offset = (scrollTop - elementTop) * speed;

        if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
          el.style.transform = 'translate3d(0,' + offset + 'px,0)';
        }
      });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          updateParallax();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    updateParallax();
  }

  /* =============================================
     PHONE MODAL
     ============================================= */
  function initPhoneModal() {
    var overlay = document.getElementById('phoneOverlay');
    if (!overlay) return;

    var bg = overlay.querySelector('.phone-overlay-bg');
    var closeBtn = overlay.querySelector('.phone-overlay-close');
    var copyBtn = document.getElementById('btnCopyPhone');
    var copiedEl = document.getElementById('modalCopied');

    function openModal(e) {
      e.preventDefault();
      overlay.classList.add('active');
    }

    function closeModal() {
      overlay.classList.remove('active');
    }

    document.querySelectorAll('[data-modal="phone"]').forEach(function (btn) {
      btn.addEventListener('click', openModal);
    });

    closeBtn.addEventListener('click', closeModal);
    bg.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });

    copyBtn.addEventListener('click', function () {
      var numEl = document.querySelector('.phone-number');
      var num = numEl ? numEl.textContent.trim() : '04 75 98 34 43';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(num).then(showCopied);
      } else {
        var ta = document.createElement('textarea');
        ta.value = num;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopied();
      }
    });

    function showCopied() {
      copiedEl.classList.add('show');
      setTimeout(function () { copiedEl.classList.remove('show'); }, 2000);
    }
  }

  /* =============================================
     LANGUAGE SWITCH
     ============================================= */
  function switchLanguage(lang) {
    currentLang = lang;

    document.querySelectorAll('[data-fr][data-en]').forEach(function (el) {
      var text = lang === 'fr' ? el.getAttribute('data-fr') : el.getAttribute('data-en');
      if (text) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = text;
        } else {
          el.innerHTML = text;
        }
      }
    });

    document.documentElement.lang = lang;

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    // Re-render dynamic content
    renderHoraires();
    renderSuggestions();
    renderVinsCarousel();
  }

  function initLangSwitch() {
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var lang = this.getAttribute('data-lang');
        if (lang && lang !== currentLang) {
          switchLanguage(lang);
        }
      });
    });
  }

  /* =============================================
     BURGER MENU
     ============================================= */
  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');

  if (burger && navLinks) {
    burger.addEventListener('click', function () {
      burger.classList.toggle('active');
      navLinks.classList.toggle('open');
      burger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });

    navLinks.querySelectorAll('a, button').forEach(function (link) {
      link.addEventListener('click', function () {
        burger.classList.remove('active');
        navLinks.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* =============================================
     NAVBAR SCROLL
     ============================================= */
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.pageYOffset > 50) { navbar.classList.add('scrolled'); }
      else { navbar.classList.remove('scrolled'); }
    }, { passive: true });
  }

  /* =============================================
     SCROLL REVEAL
     ============================================= */
  function initReveal() {
    var reveals = document.querySelectorAll('.reveal:not(.visible)');
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
      reveals.forEach(function (el) { observer.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('visible'); });
    }
  }

  /* =============================================
     SMOOTH SCROLL
     ============================================= */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var id = this.getAttribute('href');
      if (id === '#') return;
      var target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        var navH = navbar ? navbar.offsetHeight : 56;
        var top = target.getBoundingClientRect().top + window.pageYOffset - navH - 10;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  /* =============================================
     UTILITY
     ============================================= */
  function escapeHTML(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* =============================================
     INIT
     ============================================= */
  /* =============================================
     LIGHTBOX (galerie photos)
     ============================================= */
  var _lightboxPhotos = [];
  var _lightboxCurrentIndex = 0;
  var _lightboxOverlay, _lightboxImg, _lightboxCounter;

  function openLightbox(index) {
    _lightboxCurrentIndex = index;
    showLightboxPhoto();
    _lightboxOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    _lightboxOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showLightboxPhoto() {
    _lightboxImg.src = _lightboxPhotos[_lightboxCurrentIndex].src;
    _lightboxImg.alt = _lightboxPhotos[_lightboxCurrentIndex].alt;
    _lightboxCounter.textContent = (_lightboxCurrentIndex + 1) + ' / ' + _lightboxPhotos.length;
  }

  function nextLightboxPhoto() {
    _lightboxCurrentIndex = (_lightboxCurrentIndex + 1) % _lightboxPhotos.length;
    showLightboxPhoto();
  }

  function prevLightboxPhoto() {
    _lightboxCurrentIndex = (_lightboxCurrentIndex - 1 + _lightboxPhotos.length) % _lightboxPhotos.length;
    showLightboxPhoto();
  }

  // Add images to lightbox dynamically (used after carousel renders)
  function addToLightbox(selector) {
    var imgs = document.querySelectorAll(selector);
    imgs.forEach(function (cardImg) {
      // Skip if already added
      if (cardImg.dataset.lightboxBound) return;
      cardImg.dataset.lightboxBound = '1';
      var idx = _lightboxPhotos.length;
      _lightboxPhotos.push({ src: cardImg.src, alt: cardImg.alt, el: cardImg });
      cardImg.style.cursor = 'pointer';

      // Wrap standalone images (saison, produit, vin) in a lightbox-hover container
      var parent = cardImg.parentElement;
      if (!parent.classList.contains('galerie-card') &&
          !parent.classList.contains('terrasse-img-wrap') &&
          !parent.classList.contains('philo-img')) {
        var wrapper = document.createElement('div');
        wrapper.className = 'lightbox-hover-wrap';
        cardImg.parentNode.insertBefore(wrapper, cardImg);
        wrapper.appendChild(cardImg);
      }

      cardImg.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openLightbox(idx);
      });
    });
  }

  function initLightbox() {
    _lightboxOverlay = document.getElementById('lightbox');
    _lightboxImg = document.getElementById('lightboxImg');
    _lightboxCounter = document.getElementById('lightboxCounter');
    var closeBtn = _lightboxOverlay.querySelector('.lightbox-close');
    var prevBtn = _lightboxOverlay.querySelector('.lightbox-prev');
    var nextBtn = _lightboxOverlay.querySelector('.lightbox-next');
    if (!_lightboxOverlay || !_lightboxImg) return;

    // Collect all clickable photos (galerie, saisons, produits, philosophie, terrasse)
    addToLightbox('.galerie-card img, .saison-card-img, .produit-card-img, .philo-img img, .terrasse-img-wrap img');

    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', nextLightboxPhoto);
    prevBtn.addEventListener('click', prevLightboxPhoto);

    // Close on background click
    _lightboxOverlay.addEventListener('click', function (e) {
      if (e.target === _lightboxOverlay) closeLightbox();
    });

    // Keyboard navigation
    document.addEventListener('keydown', function (e) {
      if (!_lightboxOverlay.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextLightboxPhoto();
      if (e.key === 'ArrowLeft') prevLightboxPhoto();
    });

    // Swipe on mobile
    var touchStartX = 0;
    _lightboxImg.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    _lightboxImg.addEventListener('touchend', function (e) {
      var diff = e.changedTouches[0].screenX - touchStartX;
      if (Math.abs(diff) > 50) {
        if (diff < 0) nextLightboxPhoto();
        else prevLightboxPhoto();
      }
    }, { passive: true });
  }

  /* =============================================
     SAISONS CAROUSEL (mobile only)
     ============================================= */
  var _saisonsCarousel = null;
  var _saisonsIndicators = null;
  var _saisonsScrollTicking = false;

  function initSaisonsCarousel() {
    if (window.innerWidth > 768) return;
    _saisonsCarousel = document.querySelector('.saisons-grid');
    var container = document.getElementById('saisonsIndicators');
    if (!_saisonsCarousel || !container) return;
    var cards = _saisonsCarousel.querySelectorAll('.saison-card');
    if (!cards.length) return;
    container.innerHTML = '';
    for (var i = 0; i < cards.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'saisons-indicator' + (i === 0 ? ' active' : '');
      btn.setAttribute('aria-label', 'Saison ' + (i + 1));
      btn.dataset.index = i;
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.index);
        var allCards = _saisonsCarousel.querySelectorAll('.saison-card');
        var lastIndex = allCards.length - 1;
        var maxScroll = _saisonsCarousel.scrollWidth - _saisonsCarousel.clientWidth;
        var scrollTarget = lastIndex > 0 ? (idx / lastIndex) * maxScroll : 0;
        _saisonsCarousel.scrollTo({ left: scrollTarget, behavior: 'smooth' });
      });
      container.appendChild(btn);
    }
    _saisonsIndicators = container.querySelectorAll('.saisons-indicator');
    _saisonsCarousel.addEventListener('scroll', function () {
      if (!_saisonsScrollTicking) {
        _saisonsScrollTicking = true;
        requestAnimationFrame(function () {
          updateSaisonsIndicators();
          _saisonsScrollTicking = false;
        });
      }
    }, { passive: true });

    // Autoplay
    startSaisonsAutoplay();
  }

  function updateSaisonsIndicators() {
    if (!_saisonsCarousel || !_saisonsIndicators || !_saisonsIndicators.length) return;
    var scrollLeft = _saisonsCarousel.scrollLeft;
    var maxScroll = _saisonsCarousel.scrollWidth - _saisonsCarousel.clientWidth;
    var lastIndex = _saisonsIndicators.length - 1;
    var activeIndex = maxScroll > 0 ? Math.round((scrollLeft / maxScroll) * lastIndex) : 0;
    activeIndex = Math.max(0, Math.min(lastIndex, activeIndex));
    for (var j = 0; j < _saisonsIndicators.length; j++) {
      _saisonsIndicators[j].classList.toggle('active', j === activeIndex);
    }
  }

  // Autoplay saisons — meme approche que vins carousel
  var saisonsAutoplayTimer = null;

  function startSaisonsAutoplay() {
    stopSaisonsAutoplay();
    if (!_saisonsCarousel) return;

    saisonsAutoplayTimer = setInterval(function () {
      var scrollAmount = getCarouselScrollAmount(_saisonsCarousel);
      var maxScroll = _saisonsCarousel.scrollWidth - _saisonsCarousel.clientWidth;
      if (_saisonsCarousel.scrollLeft >= maxScroll - 5) {
        _saisonsCarousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        _saisonsCarousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, 7000);

    // Pause au touch
    _saisonsCarousel.addEventListener('touchstart', function () {
      stopSaisonsAutoplay();
    }, { passive: true, once: true });
  }

  function stopSaisonsAutoplay() {
    if (saisonsAutoplayTimer) {
      clearInterval(saisonsAutoplayTimer);
      saisonsAutoplayTimer = null;
    }
  }

  /* =============================================
     GLOBAL PARTICLE CANVAS (wine-themed)
     ============================================= */
  function initParticleCanvas() {
    var canvas = document.getElementById('particlesCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var particles = [];
    var maxParticles = window.innerWidth <= 768 ? 25 : 50;
    var mouse = { x: -1000, y: -1000 };

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('mousemove', function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });

    // Colors: corail, or, creme translucent
    var colors = [
      'rgba(123,45,66,.2)',
      'rgba(123,45,66,.12)',
      'rgba(212,176,64,.15)',
      'rgba(212,176,64,.08)',
      'rgba(248,243,235,.08)',
      'rgba(154,69,96,.1)'
    ];

    function Particle() {
      this.reset();
    }
    Particle.prototype.reset = function () {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 3 + 1;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3 - 0.15;
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.life = Math.random() * 200 + 100;
      this.maxLife = this.life;
    };
    Particle.prototype.update = function () {
      // Gentle mouse repulsion
      var dx = this.x - mouse.x;
      var dy = this.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        var force = (120 - dist) / 120 * 0.3;
        this.x += (dx / dist) * force;
        this.y += (dy / dist) * force;
      }
      this.x += this.speedX;
      this.y += this.speedY;
      this.life--;
      if (this.life <= 0 || this.x < -10 || this.x > canvas.width + 10 || this.y < -10 || this.y > canvas.height + 10) {
        this.reset();
      }
    };
    Particle.prototype.draw = function () {
      var alpha = Math.min(1, this.life / (this.maxLife * 0.2), (this.maxLife - this.life) / (this.maxLife * 0.2));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    for (var i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    var animating = true;
    function animate() {
      if (!animating) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections between nearby particles
      for (var i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(123,45,66,' + (0.04 * (1 - dist / 100)) + ')';
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }

    // Only animate when page is visible
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        animating = false;
      } else {
        animating = true;
        animate();
      }
    });
    animate();
  }

  /* =============================================
     SECTION PARTICLES (wine drops + sparkles)
     ============================================= */
  function initSectionParticles() {
    var containers = document.querySelectorAll('.section-particles');
    containers.forEach(function (container) {
      var count = window.innerWidth <= 768 ? 6 : 12;
      for (var i = 0; i < count; i++) {
        var particle = document.createElement('span');
        var isSparkle = Math.random() > 0.5;
        particle.className = isSparkle ? 'sparkle' : 'wine-drop';
        particle.style.left = (Math.random() * 100) + '%';
        particle.style.top = (Math.random() * 100) + '%';
        particle.style.animationDuration = (Math.random() * 6 + 4) + 's';
        particle.style.animationDelay = (Math.random() * 5) + 's';
        if (isSparkle) {
          particle.style.width = (Math.random() * 4 + 2) + 'px';
          particle.style.height = particle.style.width;
        }
        container.appendChild(particle);
      }
    });
  }

  /* =============================================
     FLOATING LOGO — scroll-reactive
     ============================================= */
  function initFloatingLogos() {
    var logos = document.querySelectorAll('.floating-logo');
    if (!logos.length || window.innerWidth <= 768) return;

    // Show logos via IntersectionObserver
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('visible', entry.isIntersecting);
      });
    }, { threshold: 0.15 });
    logos.forEach(function (logo) { observer.observe(logo.parentElement); });

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var scrollY = window.pageYOffset;
          logos.forEach(function (logo) {
            var section = logo.parentElement;
            var rect = section.getBoundingClientRect();
            if (rect.top > window.innerHeight || rect.bottom < 0) return;

            var dir = logo.getAttribute('data-float-dir') || 'diagonal-right';
            var progress = (window.innerHeight - rect.top) / (window.innerHeight + section.offsetHeight);
            progress = Math.max(0, Math.min(1, progress));

            var tx = 0, ty = 0, rot = 0;

            switch (dir) {
              case 'diagonal-right':
                tx = progress * 80;
                ty = progress * -60;
                rot = progress * 15;
                break;
              case 'diagonal-left':
                tx = progress * -80;
                ty = progress * -50;
                rot = progress * -12;
                break;
              case 'horizontal-right':
                tx = progress * 120;
                ty = Math.sin(progress * Math.PI * 2) * 20;
                rot = progress * 20;
                break;
              case 'vertical-up':
                tx = Math.sin(progress * Math.PI * 2) * 25;
                ty = progress * -100;
                rot = progress * -10;
                break;
            }

            logo.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) rotate(' + rot + 'deg) scale(' + (0.8 + progress * 0.4) + ')';
          });
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* =============================================
     ENHANCED REVEAL — stagger children
     ============================================= */
  function initEnhancedReveal() {
    // Add staggered delays to grid children
    var grids = document.querySelectorAll('.saisons-grid, .contact-grid, .philo-grid, .terrasse-images');
    grids.forEach(function (grid) {
      var children = grid.children;
      for (var i = 0; i < children.length; i++) {
        if (!children[i].classList.contains('reveal')) {
          children[i].classList.add('reveal');
        }
        children[i].style.transitionDelay = (i * 0.12) + 's';
      }
    });

    // Add directional reveals to specific elements
    var philoImg = document.querySelector('.philo-img');
    if (philoImg) philoImg.classList.add('reveal-left');
    var philoText = document.querySelector('.philo-text');
    if (philoText) philoText.classList.add('reveal-right');
    var terrasseText = document.querySelector('.terrasse-text');
    if (terrasseText) terrasseText.classList.add('reveal-right');

    // Re-observe new reveal elements
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
        obs.observe(el);
      });
    }
  }

  /* =============================================
     PARALLAX BACKGROUND IMAGES
     ============================================= */
  function initAdvancedParallax() {
    if (window.innerWidth <= 768) return;
    var heroImg = document.querySelector('.hero-bg-img');
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var scrollY = window.pageYOffset;

          // Hero image parallax
          if (heroImg) {
            heroImg.style.transform = 'translate3d(0,' + (scrollY * 0.35) + 'px,0) scale(1.1)';
          }

          // Section headers float
          document.querySelectorAll('.saisons-header, .vins-header, .carte-exemples-header').forEach(function (header) {
            var rect = header.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
              var offset = (window.innerHeight - rect.top) * 0.03;
              header.style.transform = 'translate3d(0,' + (-offset) + 'px,0)';
            }
          });

          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* =============================================
     INIT ALL
     ============================================= */
  initPhoneModal();
  initLangSwitch();
  initReveal();
  initCarousel();
  initParallax();
  initLightbox();
  startProduitsAutoplay();
  initSaisonsCarousel();
  loadAllData();

  // New wow effects
  initParticleCanvas();
  initSectionParticles();
  initFloatingLogos();
  initEnhancedReveal();
  initAdvancedParallax();

})();
