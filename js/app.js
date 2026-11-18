(() => {
  'use strict';

  const data = window.TRIP;
  const stops = Array.isArray(data?.destinations) ? data.destinations : [];
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'siViaggiamoJourneyState';
  // v1.7: cinque destinazioni contro le quattro della v1.6.
  // Un salvataggio vecchio non può essere riutilizzato: indici e cartoline non corrispondono più.
  const STATE_VERSION = 2;
  const STOP_SIGNATURE = stops.map((s) => s.id).join('|');
  const LEGACY_FLAGS = ['siViaggiamoIntroduzioneCompletata', 'siViaggiamoCompletamentoConfermato', 'siViaggiamoFinaleMostrata'];

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function clearLegacyJourneyFlags() {
    try { LEGACY_FLAGS.forEach((key) => sessionStorage.removeItem(key)); } catch {}
  }

  function loadJourneyState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Migrazione sicura: scarta versioni/strutture incompatibili e riparte da uno stato pulito.
      if (!parsed || typeof parsed !== 'object' || parsed.v !== STATE_VERSION || parsed.stopSignature !== STOP_SIGNATURE) {
        sessionStorage.removeItem(STORAGE_KEY);
        clearLegacyJourneyFlags();
        return null;
      }
      const revealed = clampInt(parsed.revealed, 0, stops.length, 0);
      let mode = typeof parsed.mode === 'string' ? parsed.mode : 'idle';
      const activeStop = clampInt(parsed.activeStop, 0, Math.max(0, stops.length - 1), Math.max(0, revealed - 1));
      const completionAcknowledged = parsed.completionAcknowledged === true;
      const finalShown = parsed.finalShown === true;

      if (revealed >= stops.length) {
        mode = (mode === 'completed' && !completionAcknowledged) ? 'completed' : 'free-exploration';
      } else if (revealed <= 0) {
        mode = 'idle';
      } else {
        // Stati transitori non ripristinabili: si riprende in modo sicuro
        if (!['idle', 'stop-revealed', 'completed', 'free-exploration'].includes(mode) || mode === 'moving') {
          mode = 'stop-revealed';
        }
        if (mode === 'free-exploration' || mode === 'completed') mode = 'stop-revealed';
      }

      return { revealed, mode, activeStop, completionAcknowledged, finalShown };
    } catch {
      return null;
    }
  }

  function getInitialState() {
    const loaded = loadJourneyState();
    if (loaded) return { ...loaded, sheetExpanded: false };
    return {
      mode: 'idle',
      revealed: 0,
      activeStop: 0,
      sheetExpanded: false,
      completionAcknowledged: false,
      finalShown: false,
    };
  }

  const state = getInitialState();

  let map;
  let markerLayer;
  let routeOutline;
  let routeLine;
  let routeRevealLine;
  let tileLayer;
  let resizeObserver;
  let returnFocus = null;
  let tileErrorNotified = false;
  let travelToken = 0;
  let completionTimer = 0;
  let sealReturnFocus = null;
  let sealPreviousOverflow = '';
  const markers = [];
  const coords = stops.map((s) => [s.lat, s.lng]);
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function saveJourneyState() {
    try {
      const payload = {
        v: STATE_VERSION,
        stopSignature: STOP_SIGNATURE,
        mode: state.mode,
        revealed: state.revealed,
        activeStop: state.activeStop,
        completionAcknowledged: state.completionAcknowledged,
        finalShown: state.finalShown,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      // Nessun flag legacy: uno stato v1.6 non deve mai essere riutilizzato dalla v1.7.
      clearLegacyJourneyFlags();
    } catch {
      // storage non disponibile: l'esperienza resta funzionante in memoria
    }
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function applyAvatar(el, traveler) {
    if (!el || !traveler) return;
    el.title = traveler.name || '';
    el.setAttribute('aria-label', traveler.alt ? `${traveler.name} — ritratto` : (traveler.name || 'Viaggiatrice'));
    if (traveler.image) {
      // Foto reale: <img> con object-fit/object-position, ritaglio circolare gestito dal CSS.
      // L'elemento ha già role="img" e aria-label in HTML; il testo alternativo vive sull'immagine.
      el.textContent = '';
      const img = document.createElement('img');
      img.src = traveler.image;
      img.alt = traveler.alt || `Ritratto di ${traveler.name || 'viaggiatrice'}`;
      if (traveler.imagePosition) img.style.objectPosition = traveler.imagePosition;
      img.loading = 'lazy';
      img.decoding = 'async';
      el.appendChild(img);
    } else {
      if (!el.textContent) el.textContent = '☺';
    }
  }
  document.querySelectorAll('.avatar-a').forEach((el) => applyAvatar(el, data?.travelers?.[0]));
  document.querySelectorAll('.avatar-b').forEach((el) => applyAvatar(el, data?.travelers?.[1]));

  function getActiveViewId() {
    return document.querySelector('.view.active')?.id || 'home';
  }
  function isMapViewActive() { return getActiveViewId() === 'map-view'; }
  function canExploreFreely() { return state.mode === 'completed' || state.mode === 'free-exploration'; }
  function isJourneyCompleted() { return state.revealed >= stops.length || canExploreFreely(); }
  function isJourneyStarted() { return state.revealed > 0 || state.mode !== 'idle'; }
  function isJourneyInProgress() { return isJourneyStarted() && !isJourneyCompleted(); }
  function isStopRevealed(index) { return isJourneyCompleted() || index < state.revealed; }
  function sheetIsOpen() { return $('stop-sheet')?.classList.contains('open'); }

  // Unico punto di smontaggio dei pannelli flottanti della Mappa: nessun avanzo
  // può restare visibile o intercettare click quando si cambia sezione.
  function hideMapPanels({ clearContent = false } = {}) {
    closeSheet({ restoreFocus: false, keepState: true });
    closeFinale({ restoreFocus: false });
    const guide = $('journey-guide');
    if (guide) guide.hidden = true;
    if (clearContent) {
      const content = $('sheet-content');
      if (content) content.textContent = '';
    }
  }

  function setMapStatus(message) {
    const el = $('map-status');
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || '';
  }

  function refreshMap() {
    if (!map || !isMapViewActive()) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      map.invalidateSize({ pan: false, animate: false });
    }));
  }

  function cancelTravel() {
    travelToken += 1;
    if (map) map.stop();
  }

  function clearCompletionTimer() {
    if (completionTimer) {
      window.clearTimeout(completionTimer);
      completionTimer = 0;
    }
  }

  function setMode(mode) {
    state.mode = mode;
    saveJourneyState();
    updateUI();
  }

  function updateHomeCta() {
    const btn = $('start-btn');
    if (!btn) return;
    if (isJourneyCompleted()) {
      btn.innerHTML = 'Esplora il viaggio <span aria-hidden="true">☘</span>';
      btn.setAttribute('aria-label', 'Esplora il viaggio sulla mappa');
    } else if (isJourneyInProgress()) {
      btn.innerHTML = 'Continua il viaggio <span aria-hidden="true">→</span>';
      btn.setAttribute('aria-label', 'Continua il viaggio sulla mappa');
    } else {
      btn.innerHTML = 'Scopri la sorpresa <span aria-hidden="true">↗</span>';
      btn.setAttribute('aria-label', 'Scopri la sorpresa');
    }
  }

  function setResumableStateAfterInterruption() {
    if (state.revealed >= stops.length) {
      state.mode = state.completionAcknowledged ? 'free-exploration' : 'completed';
      return;
    }
    if (state.revealed <= 0) {
      state.mode = 'idle';
      return;
    }
    // Ripresa coerente: tappa corrente già svelata, si attende il prossimo avanzamento
    state.mode = 'stop-revealed';
    state.activeStop = Math.min(state.revealed - 1, Math.max(0, stops.length - 1));
  }

  function goto(id) {
    // Il dialog è modale: nessun cambio vista può avvenire mentre è aperto.
    closeSealSurprise({ restoreFocus: false });
    const fromMap = isMapViewActive();
    if (fromMap && id !== 'map-view') {
      cancelTravel();
      clearCompletionTimer();
      if (state.mode === 'moving') {
        setResumableStateAfterInterruption();
      }
    }
    // Uscendo dalla Mappa tutti i pannelli vengono rimossi, anche se non si
    // proveniva dalla Mappa (link dalla Guida, dalle Tappe o dal finale).
    if (id !== 'map-view') hideMapPanels({ clearContent: true });

    document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === id));
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      const selected = btn.dataset.nav === id;
      btn.classList.toggle('selected', selected);
      if (selected) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (id === 'map-view') {
      ensureMap();
      refreshMap();
      setTimeout(() => {
        refreshMap();
        if (canExploreFreely()) fitRoute(false);
        else renderProgress();
      }, 120);
    }
    if (id === 'stops') { updateTimeline(); renderDays(); }
    if (id === 'guide-view') renderGuide();
    updateEasterEgg();
    saveJourneyState();
    updateUI();
  }

  function ensureMap() {
    if (map || !stops.length) return;
    if (!window.L) {
      setMapStatus('Impossibile caricare la mappa in questo momento. Controlla la connessione a Internet e ricarica la pagina.');
      const mapEl = $('map');
      if (mapEl) mapEl.innerHTML = '<p style="padding:24px;color:#617366">Mappa non disponibile.</p>';
      return;
    }

    map = L.map('map', {
      zoomControl: true,
      scrollWheelZoom: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelDebounceTime: 40,
      preferCanvas: true,
      fadeAnimation: false,
      markerZoomAnimation: !reduceMotion(),
    });

    map.setView([53.4, -8.1], 7, { animate: false });
    tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      minZoom: 5,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      crossOrigin: true,
      updateWhenIdle: false,
      keepBuffer: 2,
    });
    tileLayer.on('tileerror', () => {
      if (tileErrorNotified) return;
      tileErrorNotified = true;
      setMapStatus('Alcune tessere della mappa potrebbero non caricarsi correttamente. Verifica la connessione a Internet.');
    });
    tileLayer.on('load', () => { if (!tileErrorNotified) setMapStatus(''); });
    tileLayer.addTo(map);

    routeOutline = L.polyline([], { color: '#fff8ea', weight: 8, opacity: 0.95, lineCap: 'round', interactive: false }).addTo(map);
    routeLine = L.polyline([], { color: '#d39a72', weight: 4, dashArray: '3,11', lineCap: 'round', interactive: false }).addTo(map);
    routeRevealLine = L.polyline([], { color: '#5d9b6d', weight: 5, opacity: 0.95, lineCap: 'round', interactive: false }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);

    stops.forEach((s, index) => {
      const marker = L.marker([s.lat, s.lng], { icon: makePinIcon(index, false), title: s.title || `Tappa ${index + 1}` });
      marker.on('click', () => {
        if (state.mode === 'moving' || !isMapViewActive()) return;
        if (!isStopRevealed(index)) return;
        openSheet(index, { fromMarker: true });
      });
      markers.push(marker);
      markerLayer.addLayer(marker);
    });

    map.whenReady(() => refreshMap());
    if ('ResizeObserver' in window) {
      let previous = { width: 0, height: 0 };
      resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && (Math.abs(width - previous.width) > 1 || Math.abs(height - previous.height) > 1)) {
          previous = { width, height };
          refreshMap();
        }
      });
      resizeObserver.observe($('map'));
    }
    window.addEventListener('resize', refreshMap, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(refreshMap, 180), { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshMap(); });

    renderProgress();
  }

  function pinAnchorFor(index) {
    // Con tutto il percorso a schermo, su mobile Dublino e Howth distano pochi
    // pixel: i loro cerchi da 40px si coprirebbero e uno dei due non sarebbe
    // toccabile. In esplorazione libera li scostiamo appena, senza cambiare
    // la posizione geografica usata per il percorso o per "Vedi sulla mappa".
    if (!canExploreFreely() || !window.matchMedia('(max-width: 759px)').matches) return [20, 20];
    if (index === 0) return [34, 30]; // Dublino: leggermente in alto a sinistra
    if (index === 4) return [6, 10];  // Howth: leggermente in basso a destra
    return [20, 20];
  }

  function makePinIcon(index, active) {
    const stop = stops[index] || {};
    const hidden = !isStopRevealed(index);
    return L.divIcon({
      className: 'pin-marker' + (active ? ' active' : '') + (hidden ? ' locked' : ''),
      html: `<span style="background:${escapeHTML(stop.color || '#295642')}">${index + 1}</span>`,
      iconSize: [40, 40],
      iconAnchor: pinAnchorFor(index),
    });
  }

  function renderProgress({ animateNewSegment = false } = {}) {
    if (!map) return;
    const visibleCount = isJourneyCompleted() ? stops.length : state.revealed;
    const path = coords.slice(0, visibleCount);
    routeOutline.setLatLngs(path);
    routeLine.setLatLngs(path);

    if (animateNewSegment && visibleCount >= 2 && !reduceMotion()) {
      routeRevealLine.setLatLngs(coords.slice(visibleCount - 2, visibleCount));
      animatePolylineReveal(routeRevealLine);
    } else {
      routeRevealLine.setLatLngs([]);
    }

    markers.forEach((marker, index) => {
      const active = index === state.activeStop && (state.mode === 'stop-revealed' || state.mode === 'moving');
      marker.setIcon(makePinIcon(index, active));
      const visible = isStopRevealed(index);
      if (visible) { if (!markerLayer.hasLayer(marker)) marker.addTo(markerLayer); }
      else if (markerLayer.hasLayer(marker)) markerLayer.removeLayer(marker);
    });
    updateTimeline();
  }

  function animatePolylineReveal(polyline) {
    const path = polyline?.getElement?.();
    if (!path || typeof path.getTotalLength !== 'function') return;
    try {
      const length = path.getTotalLength();
      path.style.transition = 'none';
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      void path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 900ms ease-out';
      path.style.strokeDashoffset = '0';
      window.setTimeout(() => {
        if (path.isConnected) {
          path.style.transition = '';
          path.style.strokeDasharray = '';
          path.style.strokeDashoffset = '';
        }
      }, 950);
    } catch {}
  }

  function fitRoute(animate = true) {
    if (!map || !coords.length) return;
    refreshMap();
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(0.22), { animate: animate && !reduceMotion(), maxZoom: 8, padding: [24, 24] });
  }

  function updateTimeline() {
    const list = $('stops-list');
    if (!list) return;
    const progress = $('trip-progress');
    if (progress) {
      const discovered = isJourneyCompleted() ? stops.length : state.revealed;
      const status = isJourneyCompleted() ? 'Svelato' : (state.revealed === 0 ? 'Pronto' : 'In viaggio');
      progress.innerHTML = `<div class="progress-chip"><strong>${discovered}/${stops.length}</strong><span>Tappe scoperte</span></div>
        <div class="progress-chip"><strong>${status}</strong><span>Avventura</span></div>`;
    }

    list.innerHTML = stops.map((s, i) => {
      const revealed = isStopRevealed(i);
      const current = i === state.activeStop && (state.mode === 'stop-revealed' || state.mode === 'moving' || isJourneyCompleted());
      const title = revealed ? escapeHTML(s.title) : 'Destinazione misteriosa';
      const desc = revealed ? escapeHTML(s.description || '') : 'Questa tappa si svelerà durante il viaggio sulla mappa.';
      const badge = revealed ? `Tappa ${i + 1}` : 'Da scoprire';
      const action = revealed
        ? `<button type="button" class="stop-link" data-stop="${i}">Vedi sulla mappa →</button>`
        : `<span class="stop-link muted">Si sblocca proseguendo il viaggio</span>`;
      const thumb = revealed
        ? (s.image ? `<img src="${escapeHTML(s.image)}" alt="" loading="lazy">` : `<span aria-hidden="true">${escapeHTML(s.icon || '☘')}</span>`)
        : '<span aria-hidden="true">?</span>';
      return `<article class="timeline-card ${revealed ? 'revealed' : 'locked'} ${current ? 'current' : ''}">
        <div class="timeline-axis"><div class="timeline-number" style="background:${revealed ? escapeHTML(s.color || '#295642') : '#9fb3a1'}">${revealed ? i + 1 : '•'}</div>${i < stops.length - 1 ? '<div class="timeline-line"></div>' : ''}</div>
        <div class="timeline-content">
          <div class="timeline-thumb" style="${revealed ? `background:linear-gradient(140deg,${escapeHTML(s.color || '#295642')},#b7d3b3)` : ''}">${thumb}</div>
          <div class="timeline-copy">
            <span class="timeline-badge">${badge}${revealed && s.icon ? ` · ${escapeHTML(s.icon)}` : ''}</span>
            <h3>${title}</h3>
            <p>${desc}</p>
            ${action}
          </div>
        </div>
      </article>`;
    }).join('');

    list.querySelectorAll('[data-stop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.stop);
        if (!isStopRevealed(index)) return;
        goto('map-view');
        ensureMap();
        if (!map) return;
        focusStop(index, { open: true });
      });
    });
  }

  function renderDays() {
    const list = $('days-list');
    if (!list) return;
    const days = Array.isArray(data?.days) ? data.days : [];
    if (!days.length) { list.hidden = true; return; }
    list.hidden = false;
    list.innerHTML = days.map((day) => {
      const activities = Array.isArray(day.activities) && day.activities.length
        ? `<div class="day-line"><strong>Da fare</strong><span>${day.activities.map((a) => escapeHTML(a)).join(' · ')}</span></div>`
        : '';
      const travel = Array.isArray(day.travel) && day.travel.length
        ? `<div class="day-line"><strong>Spostamenti</strong><span>${day.travel.map((t) => escapeHTML(t)).join(' · ')}</span></div>`
        : '';
      const guideBtn = day.destinationId && getDestinationById(day.destinationId)
        ? `<button type="button" class="day-guide" data-guide-dest="${escapeHTML(day.destinationId)}">Apri la Guida di ${escapeHTML(day.place || getDestinationById(day.destinationId).title)} ↗</button>`
        : '';
      return `<article class="day-card">
        <div class="day-head">
          <span class="day-date">${escapeHTML(day.date || '')}</span>
          <h3>${escapeHTML(day.title || '')}</h3>
          ${day.place ? `<span class="day-place">⌖ ${escapeHTML(day.place)}</span>` : ''}
        </div>
        <p class="day-desc">${escapeHTML(day.description || '')}</p>
        <div class="day-lines">${activities}${travel}</div>
        ${guideBtn}
      </article>`;
    }).join('');

    list.querySelectorAll('[data-guide-dest]').forEach((btn) => {
      btn.addEventListener('click', () => openGuideForDestination(btn.dataset.guideDest));
    });
  }

  function waitMoveEnd(token) {
    return new Promise((resolve) => {
      if (!map) { resolve(false); return; }
      let settled = false;
      let timer = 0;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (timer) window.clearTimeout(timer);
        try { map.off('moveend', onEnd); } catch {}
        resolve(ok);
      };
      const onEnd = () => {
        if (settled) return;
        if (token !== travelToken) { finish(false); return; }
        // evita completamento spurio: se la mappa risulta ancora in animazione, attendi un successivo moveend
        if (typeof map._animatingZoom === 'boolean' && map._animatingZoom) return;
        finish(true);
      };
      map.on('moveend', onEnd);
      // safety: non considerare completata l'animazione solo per timeout; fallback di non-completamento
      timer = window.setTimeout(() => {
        if (token !== travelToken) finish(false);
        else finish(false);
      }, 8000);
    });
  }

  async function animateJourneyTo(index) {
    if (!map || index < 0 || index >= stops.length) return false;
    const token = ++travelToken;
    const destination = coords[index];
    try { map.stop(); } catch {}
    if (reduceMotion()) {
      try { map.setView(destination, 9, { animate: false }); } catch { return false; }
      return token === travelToken;
    }
    try {
      map.flyTo(destination, 9, { animate: true, duration: 1.9, easeLinearity: 0.22 });
    } catch {
      return false;
    }
    const ok = await waitMoveEnd(token);
    return !!ok && token === travelToken;
  }

  async function focusStop(index, { open = false } = {}) {
    if (!map || index < 0 || index >= stops.length || !isStopRevealed(index)) return;
    cancelTravel();
    state.activeStop = index;
    saveJourneyState();
    renderProgress();
    const ok = await animateJourneyTo(index);
    if (!ok || !isMapViewActive()) return;
    if (open) openSheet(index, { fromMarker: false });
  }

  function sheetHTML(index, expanded) {
    const s = stops[index];
    const mapsURL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.lat},${s.lng}`)}`;
    const inGuidedReveal = state.mode === 'stop-revealed';
    const isLast = state.revealed >= stops.length;
    const dayLabel = s.day ? `<span class="postcard-stamp">Giorno ${escapeHTML(s.day)}</span>` : '<span class="postcard-stamp">Cartolina</span>';
    const hasImage = !!s.image;
    // Standard 16:9: i default contain/center/16:9 valgono per tutte le cartoline.
    // Nessuna destinazione dichiara più un aspect diverso in destinations.js.
    const photo = s.photo || {};
    const photoStyle = [
      `--card-fit:${escapeHTML(photo.fit || 'contain')}`,
      `--card-position:${escapeHTML(photo.position || 'center')}`,
      `--card-aspect:${escapeHTML(photo.aspect || '16 / 9')}`,
    ].join(';');
    const compactPhoto = hasImage
      ? `<img src="${escapeHTML(s.image)}" alt="" loading="lazy">`
      : `<span aria-hidden="true">${escapeHTML(s.icon || '☘')}</span>`;
    const fullPhoto = hasImage
      ? `<img src="${escapeHTML(s.image)}" alt="${escapeHTML(s.title)}" loading="lazy">`
      : `<div class="sheet-placeholder-art"><span aria-hidden="true">${escapeHTML(s.icon || '☘')}</span><span class="photo-placeholder">FOTO IN ARRIVO ✦</span></div>`;

    const primary = inGuidedReveal
      ? `<button type="button" id="sheet-advance" class="primary-sheet-btn">${isLast ? 'Termina la scoperta' : 'Scopri la prossima tappa'}</button>`
      : '';
    const navActions = inGuidedReveal ? '' : `<button type="button" id="prev-stop">← Precedente</button><button type="button" id="next-stop">Successiva →</button>`;
    const toggleLabel = expanded ? 'Mostra meno' : 'Espandi cartolina';
    const brief = escapeHTML((s.description || '').slice(0, 90) + ((s.description || '').length > 90 ? '…' : ''));
    // Solo Howth: richiamo compatto, sempre visibile, senza sostituire l'avanzamento.
    const sealTeaser = s.id === 'howth' ? `<div class="seal-teaser">
          <p class="seal-teaser-title">Avvistamento sospetto! 🦭</p>
          <p class="seal-teaser-text">Pare che sulle coste di Howth siano stati avvistati due esemplari piuttosto familiari…</p>
          <button type="button" id="sheet-seal-surprise" class="seal-teaser-btn" aria-haspopup="dialog" aria-controls="seal-dialog" aria-expanded="false">Ops… chi abbiamo trovato? 🦭</button>
        </div>` : '';

    if (!expanded) {
      return `<div class="sheet-postcard compact">
        <div class="sheet-compact">
          <div class="sheet-compact-thumb" data-icon="${escapeHTML(s.icon || '☘')}" style="background:linear-gradient(140deg,${escapeHTML(s.color || '#295642')},#b7d3b3);${photoStyle}">${compactPhoto}</div>
          <div class="sheet-compact-body">
            <div class="postcard-meta">${dayLabel}<span class="stop-tag">TAPPA ${index + 1}</span></div>
            <h3 id="sheet-title">${escapeHTML(s.title)}</h3>
            <p class="sheet-brief">${brief}</p>
          </div>
        </div>
        ${sealTeaser}
        <div class="sheet-compact-actions">
          ${primary}
          <button type="button" id="sheet-toggle" class="sheet-toggle-btn" aria-expanded="false">${toggleLabel} ↓</button>
        </div>
      </div>`;
    }

    return `<div class="sheet-postcard expanded">
      <div class="sheet-img" data-icon="${escapeHTML(s.icon || '☘')}" style="background:linear-gradient(140deg,${escapeHTML(s.color || '#295642')},#b7d3b3);${photoStyle}">
        ${fullPhoto}
      </div>
      <div class="sheet-body">
        <div class="postcard-meta">${dayLabel}<span class="stop-tag">TAPPA N. ${String(index + 1).padStart(2, '0')}</span><span class="sheet-sticker" aria-hidden="true">✦</span></div>
        <h3 id="sheet-title">${escapeHTML(s.title)}</h3>
        <p class="region">⌖ ${escapeHTML(s.region || 'Irlanda')}, Irlanda</p>
        <p class="description">${escapeHTML(s.description || '')}</p>
        <div class="dedication"><span class="dedication-tape" aria-hidden="true"></span><strong>♡ Una dedica per te</strong>${escapeHTML(s.dedication || '')}</div>
        ${sealTeaser}
        ${primary}
        <div class="sheet-secondary-actions">
          <a href="${mapsURL}" target="_blank" rel="noopener noreferrer">Apri su Google Maps ↗</a>
          <button type="button" id="sheet-open-guide" class="sheet-guide-btn" data-dest-id="${escapeHTML(s.id)}">Cosa fare qui ◫</button>
          <button type="button" id="sheet-toggle" class="sheet-toggle-btn secondary" aria-expanded="true">${toggleLabel} ↑</button>
        </div>
        ${navActions ? `<div class="sheet-actions">${navActions}</div>` : ''}
        <p class="sheet-counter">Tappa ${index + 1} di ${stops.length}</p>
      </div>
    </div>`;
  }

  function bindSheetEvents(index) {
    const img = $('sheet-content')?.querySelector('img');
    if (img) {
      img.addEventListener('error', () => {
        const wrap = img.closest('.sheet-img, .sheet-compact-thumb');
        if (!wrap) return;
        img.remove();
        wrap.innerHTML = `<span aria-hidden="true">${escapeHTML(stops[index]?.icon || '☘')}</span>`;
      }, { once: true });
    }
    $('sheet-advance')?.addEventListener('click', () => { closeSheet({ restoreFocus: false }); advanceTour(); });
    $('sheet-seal-surprise')?.addEventListener('click', (ev) => openSealSurprise(ev.currentTarget));
    $('prev-stop')?.addEventListener('click', () => { state.sheetExpanded = false; openSheet((index - 1 + stops.length) % stops.length, { rerender: true }); });
    $('next-stop')?.addEventListener('click', () => { state.sheetExpanded = false; openSheet((index + 1) % stops.length, { rerender: true }); });
    $('sheet-toggle')?.addEventListener('click', () => {
      state.sheetExpanded = !state.sheetExpanded;
      $('sheet-content').innerHTML = sheetHTML(index, state.sheetExpanded);
      const sheet = $('stop-sheet');
      sheet?.classList.toggle('expanded', state.sheetExpanded);
      bindSheetEvents(index);
      // Il focus senza preventScroll faceva scorrere la sheet fino al pulsante
      // in fondo, nascondendo quasi tutta la fotografia: si riparte sempre dall'alto.
      $('sheet-toggle')?.focus({ preventScroll: true });
      if (sheet) sheet.scrollTop = 0;
    });
    $('sheet-open-guide')?.addEventListener('click', () => {
      const destId = $('sheet-open-guide')?.dataset.destId;
      closeSheet({ restoreFocus: false });
      openGuideForDestination(destId);
    });
  }

  function renderSheetFallback(index, reason) {
    const safeIndex = Number.isInteger(index) && index >= 0 && index < stops.length ? index : null;
    const title = safeIndex != null ? (stops[safeIndex]?.title || `Tappa ${safeIndex + 1}`) : 'Tappa';
    return `<div class="sheet-postcard compact"><div class="sheet-compact" style="grid-template-columns:1fr"><div class="sheet-compact-body"><h3 id="sheet-title">${escapeHTML(title)}</h3><p class="sheet-brief">Impossibile mostrare tutti i dettagli in questo momento. Puoi chiudere e riprovare.</p></div></div><div class="sheet-compact-actions"><button type="button" id="sheet-close-fallback" class="sheet-toggle-btn">Chiudi</button></div></div>`;
  }

  function openSheet(index, { fromMarker = false, rerender = false } = {}) {
    if (index < 0 || index >= stops.length || !isStopRevealed(index)) return;
    if (state.mode === 'moving' || !isMapViewActive()) return;
    const sheet = $('stop-sheet');
    const content = $('sheet-content');
    const overlay = $('sheet-overlay');
    if (!sheet || !content || !overlay) return;

    state.activeStop = index;
    if (!rerender) state.sheetExpanded = false;
    const inGuidedReveal = state.mode === 'stop-revealed';

    let html = '';
    try {
      html = sheetHTML(index, state.sheetExpanded);
    } catch (err) {
      html = '';
    }
    const valid = typeof html === 'string' && html.includes('sheet-postcard') && html.includes('id="sheet-title"') && html.replace(/<[^>]*>/g, '').trim().length > 10;
    if (!valid) {
      html = renderSheetFallback(index);
      state.sheetExpanded = false;
    }

    try {
      content.innerHTML = html;
      bindSheetEvents(index);
      // fallback button wiring if present
      content.querySelector('#sheet-close-fallback')?.addEventListener('click', () => closeSheet());
    } catch (err) {
      content.innerHTML = renderSheetFallback(index);
      content.querySelector('#sheet-close-fallback')?.addEventListener('click', () => closeSheet());
    }

    // ultima verifica: mai aprire un pannello vuoto
    // textContent, non innerText: il pannello è ancora visibility:hidden quando
    // il contenuto viene preparato, e innerText risulterebbe vuoto a torto.
    if ((content.textContent || '').trim().length < 4) {
      content.innerHTML = renderSheetFallback(index);
      content.querySelector('#sheet-close-fallback')?.addEventListener('click', () => closeSheet());
    }

    if (!sheetIsOpen()) returnFocus = document.activeElement;
    overlay.hidden = inGuidedReveal;
    sheet.classList.toggle('tour-mode', inGuidedReveal);
    sheet.classList.toggle('expanded', state.sheetExpanded);
    sheet.classList.add('open');
    sheet.scrollTop = 0;
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = inGuidedReveal ? '' : 'hidden';

    if (map && !inGuidedReveal && !fromMarker) {
      try { map.panTo(coords[index], { animate: !reduceMotion() }); } catch {}
    }
    if (!rerender) $('close-sheet')?.focus();
    saveJourneyState();
    updateUI();
  }

  function closeSheet({ restoreFocus = true, keepState = false } = {}) {
    const sheet = $('stop-sheet');
    if (!sheet || !sheet.classList.contains('open')) return;
    $('sheet-overlay').hidden = true;
    sheet.classList.remove('open', 'tour-mode', 'expanded');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (!keepState) state.sheetExpanded = false;
    if (restoreFocus && returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
      returnFocus.focus();
    }
    updateUI();
  }

  function showFinale() {
    if (state.finalShown) return;
    state.finalShown = true;
    saveJourneyState();
    const el = $('journey-finale');
    if (!el) return;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
  }
  function closeFinale({ restoreFocus = true } = {}) {
    const el = $('journey-finale');
    if (!el || el.hidden) return;
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    if (restoreFocus && isMapViewActive()) $('guide-next')?.focus?.();
  }

  // Sorpresa delle foche: un solo dialog, aperto sia dalla cartolina di Howth
  // sia dalla Guida. Non tocca mai lo stato del viaggio né la cartolina aperta.
  function sealIsOpen() {
    const dialog = $('seal-dialog');
    return !!dialog && !dialog.hidden;
  }

  function sealFocusables() {
    const dialog = $('seal-dialog');
    if (!dialog) return [];
    return Array.from(dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter((el) => !el.disabled && el.getClientRects().length > 0);
  }

  function openSealSurprise(trigger) {
    const dialog = $('seal-dialog');
    const scrim = $('seal-scrim');
    if (!dialog || !scrim || sealIsOpen()) return;
    sealReturnFocus = trigger && typeof trigger.focus === 'function' ? trigger : document.activeElement;
    sealPreviousOverflow = document.body.style.overflow;
    scrim.hidden = false;
    dialog.hidden = false;
    dialog.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trigger?.setAttribute?.('aria-expanded', 'true');
    ($('seal-return') || $('seal-close') || dialog).focus?.();
  }

  function closeSealSurprise({ restoreFocus = true } = {}) {
    const dialog = $('seal-dialog');
    const scrim = $('seal-scrim');
    if (!dialog || !scrim || !sealIsOpen()) return;
    dialog.hidden = true;
    scrim.hidden = true;
    dialog.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = sealPreviousOverflow;
    sealReturnFocus?.setAttribute?.('aria-expanded', 'false');
    const target = sealReturnFocus;
    sealReturnFocus = null;
    sealPreviousOverflow = '';
    if (restoreFocus && target && target.isConnected && typeof target.focus === 'function') target.focus();
  }

  function trapSealFocus(ev) {
    const dialog = $('seal-dialog');
    const items = sealFocusables();
    if (!dialog || !items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const outside = !dialog.contains(document.activeElement);
    if (ev.shiftKey && (document.activeElement === first || outside)) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && (document.activeElement === last || outside)) {
      ev.preventDefault();
      first.focus();
    }
  }

  function acknowledgeCompletion() {
    if (state.mode !== 'completed' || state.completionAcknowledged) return;
    state.completionAcknowledged = true;
    saveJourneyState();
    updateUI();
  }

  function updateUI() {
    updateHomeCta();
    updateGuide();
    // In esplorazione libera tutti i pin sono già visibili: il pulsante
    // "Mostra tutto il percorso" e l'aiuto non servono più sulla mappa.
    const free = canExploreFreely() || isJourneyCompleted();
    const fit = $('fit-map');
    if (fit) fit.hidden = free;
    const help = document.querySelector('.map-help');
    if (help) help.hidden = free;
    renderProgress();
    if (sheetIsOpen()) $('stop-sheet')?.classList.toggle('expanded', state.sheetExpanded);
  }

  function updateGuide() {
    const guide = $('journey-guide');
    if (!guide) return;
    const next = $('guide-next');
    const skip = $('guide-skip');
    const title = $('guide-title');
    const text = $('guide-text');
    const label = $('guide-label');
    const progress = $('guide-progress');

    // Visibile esclusivamente nella sezione Mappa
    if (!isMapViewActive()) {
      guide.hidden = true;
      return;
    }

    // Durante movimento mappa: nessun pannello invasivo.
    if (state.mode === 'moving') {
      guide.hidden = true;
      guide.className = 'journey-guide';
      return;
    }

    // Un solo pannello flottante alla volta: la guida si ritira con la cartolina aperta.
    if (sheetIsOpen()) {
      guide.hidden = true;
      return;
    }

    if (canExploreFreely() || isJourneyCompleted()) {
      // v1.8: nessun pannello "Mappa libera" e nessun "Mostra tutto".
      // Dopo la scoperta resta solo il controllo discreto "Rivivi ↺".
      guide.hidden = false;
      guide.className = 'journey-guide compact replay-only';
      label.textContent = `${stops.length} tappe scoperte`;
      title.textContent = '';
      text.textContent = '';
      progress.innerHTML = '';
      next.hidden = true;
      next.disabled = true;
      skip.hidden = false;
      skip.textContent = 'Rivivi ↺';
      skip.setAttribute('aria-label', 'Rivivi la scoperta guidata');
      return;
    }
    next.hidden = false;
    next.disabled = false;

    const show = state.mode === 'idle' || state.mode === 'stop-revealed';
    guide.hidden = !show;
    guide.className = 'journey-guide compact';
    label.textContent = `Sorpresa · ${state.revealed}/${stops.length}`;
    progress.innerHTML = stops.map((_, i) => `<span class="${i < state.revealed ? 'done' : ''}" aria-hidden="true"></span>`).join('');
    skip.hidden = false;
    skip.setAttribute('aria-label', 'Esplora liberamente la mappa');

    if (state.mode === 'idle') {
      title.textContent = 'Martina, pronta a partire?';
      text.textContent = 'Scopri il viaggio una tappa alla volta.';
      next.textContent = 'Scopri la prima tappa';
      next.disabled = false;
      skip.textContent = 'Esplora liberamente ×';
      return;
    }

    if (state.mode === 'stop-revealed') {
      const isLast = state.revealed >= stops.length;
      title.textContent = `${stops[state.activeStop]?.title || 'Tappa'} scoperta`;
      text.textContent = 'Continua quando vuoi.';
      next.textContent = isLast ? 'Termina la scoperta' : 'Scopri la prossima tappa';
      next.disabled = false;
      skip.textContent = 'Esplora liberamente ×';
    }
  }

  function startTour() {
    if (!stops.length) return;
    ensureMap();
    if (!map) return;
    clearCompletionTimer();
    cancelTravel();
    closeSheet({ restoreFocus: false });
    closeFinale({ restoreFocus: false });
    state.revealed = 0;
    state.activeStop = 0;
    state.sheetExpanded = false;
    state.completionAcknowledged = false;
    state.finalShown = false;
    clearLegacyJourneyFlags();
    state.mode = 'idle';
    saveJourneyState();
    renderProgress();
    map.stop();
    map.setView([53.5, -8.1], 6.6, { animate: false });
    refreshMap();
    updateUI();
  }

  function resumeJourneyOnMap() {
    ensureMap();
    if (!map) return;
    if (state.mode === 'moving') {
      // sicurezza: nessuna animazione in sospeso deve restare attiva
      cancelTravel();
      setResumableStateAfterInterruption();
    }
    saveJourneyState();
    renderProgress();
    updateUI();
    if (isJourneyCompleted()) {
      fitRoute(false);
    } else if (state.revealed > 0) {
      const idx = Math.min(Math.max(0, state.revealed - 1), stops.length - 1);
      map.setView(coords[idx], 9, { animate: false });
      refreshMap();
    } else {
      map.setView([53.5, -8.1], 6.6, { animate: false });
      refreshMap();
    }
  }

  function finishTour({ fromReveal = false } = {}) {
    clearCompletionTimer();
    state.revealed = stops.length;
    state.activeStop = Math.max(0, stops.length - 1);
    state.completionAcknowledged = false;
    state.mode = 'completed';
    saveJourneyState();
    renderProgress();
    updateUI();
    if (isMapViewActive()) fitRoute(true);
    if (fromReveal) showFinale();
    if (!reduceMotion()) {
      completionTimer = window.setTimeout(() => { acknowledgeCompletion(); }, 2200);
    }
  }

  async function advanceTour() {
    if (!map || state.mode === 'moving') return;

    // In stop-revealed sull'ultima tappa già svelata, il prossimo avanzamento chiude il tour.
    if (state.mode === 'stop-revealed' && state.revealed >= stops.length) {
      closeSheet({ restoreFocus: false });
      finishTour({ fromReveal: true });
      return;
    }

    // Post-completamento: azioni di esplorazione/ripresa, non avanzamento tappe.
    if (canExploreFreely() || (state.mode === 'completed' && state.revealed >= stops.length)) {
      if (state.mode === 'completed' && !state.completionAcknowledged) { acknowledgeCompletion(); return; }
      if (state.mode === 'completed') state.mode = 'free-exploration';
      saveJourneyState();
      updateUI();
      if (isMapViewActive()) fitRoute(true);
      return;
    }

    if (state.mode === 'stop-revealed') {
      closeSheet({ restoreFocus: false });
      if (state.revealed >= stops.length) { finishTour({ fromReveal: true }); return; }
    }

    if (state.mode !== 'idle' && state.mode !== 'stop-revealed') return;
    if (state.revealed >= stops.length) { finishTour({ fromReveal: false }); return; }

    const index = state.revealed;
    state.revealed += 1;
    state.activeStop = index;
    state.mode = 'moving';
    saveJourneyState();
    closeSheet({ restoreFocus: false });
    closeFinale({ restoreFocus: false });
    renderProgress({ animateNewSegment: index > 0 });
    updateUI();

    const ok = await animateJourneyTo(index);
    if (!ok || !isMapViewActive()) {
      setResumableStateAfterInterruption();
      saveJourneyState();
      updateUI();
      return;
    }
    state.mode = 'stop-revealed';
    saveJourneyState();
    renderProgress();
    updateUI();
    openSheet(index, { fromMarker: false });
  }

  function skipToExplore() {
    cancelTravel();
    clearCompletionTimer();
    closeSheet({ restoreFocus: false });
    closeFinale({ restoreFocus: false });
    state.revealed = stops.length;
    state.activeStop = Math.max(0, stops.length - 1);
    state.completionAcknowledged = true;
    state.finalShown = true;
    state.mode = 'free-exploration';
    saveJourneyState();
    renderProgress();
    updateUI();
    if (isMapViewActive()) fitRoute(true);
  }

  // --- Guida (v1.6) ---
  const guideData = window.GUIDE || { categories: [], items: [], ticket: {} };
  const guideItems = Array.isArray(guideData.items) ? guideData.items : [];
  const FAV_KEY = 'siViaggiamoGuideFavorites';
  const guideState = { category: 'all', city: 'all', search: '', destinationId: null };

  function getValidItemIds() {
    return new Set(guideItems.map((it) => it && it.id).filter(Boolean));
  }
  function loadFavorites() {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return new Set();
      const valid = getValidItemIds();
      const cleaned = arr.filter((id) => typeof id === 'string' && valid.has(id));
      const set = new Set(cleaned);
      if (cleaned.length !== arr.length) localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
      return set;
    } catch { return new Set(); }
  }
  function saveFavorites(set) {
    try {
      const valid = getValidItemIds();
      const cleaned = [...set].filter((id) => valid.has(id));
      localStorage.setItem(FAV_KEY, JSON.stringify(cleaned));
    } catch { /* preferenze locali non disponibili */ }
  }
  let favoriteIds = loadFavorites();

  function getDestinationById(id) {
    return stops.find((s) => s.id === id) || null;
  }
  function getDestinationIndexById(id) {
    return stops.findIndex((s) => s.id === id);
  }

  function openGuideForDestination(destinationId) {
    guideState.destinationId = destinationId || null;
    guideState.category = 'all';
    guideState.city = 'all';
    guideState.search = '';
    goto('guide-view');
  }

  async function showPlaceOnMap({ destinationId = null, lat = null, lng = null, itemId = null } = {}) {
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const stopIndex = destinationId ? getDestinationIndexById(destinationId) : -1;
    goto('map-view');
    ensureMap();
    if (!map) return;
    if (hasCoords) {
      // POI opzionale o luogo con coordinate: centro senza aggiungere pin all'itinerario
      cancelTravel();
      map.stop();
      closeSheet({ restoreFocus: false, keepState: false });
      const target = [lat, lng];
      if (reduceMotion()) map.setView(target, 12, { animate: false });
      else map.flyTo(target, 12, { animate: true, duration: 1.2, easeLinearity: 0.25 });
      return;
    }
    if (stopIndex >= 0) {
      if (isStopRevealed(stopIndex)) {
        focusStop(stopIndex, { open: true });
      } else {
        // tappa principale non ancora svelata: mostra area generale senza rivelare pin
        fitRoute(true);
        setMapStatus('Questa tappa si svelerà durante il viaggio sulla mappa. Puoi comunque esplorare la guida!');
        window.setTimeout(() => { if (getActiveViewId() === 'map-view') setMapStatus(''); }, 3500);
      }
    }
  }

  function getGuideCities() {
    const set = new Set();
    guideItems.forEach((it) => { if (it && it.city) set.add(it.city); });
    return ['all', ...Array.from(set)];
  }

  // Easter egg: solo nella Guida filtrata per Howth, mai immagine principale né nuova tappa.
  // Il contenuto vivo è l'unico dialog condiviso con la cartolina di Howth.
  function resetEasterEggReveal() {
    $('easter-egg-toggle')?.setAttribute('aria-expanded', 'false');
  }

  function updateEasterEgg() {
    const egg = $('howth-easter-egg');
    if (!egg) return;
    const show = getActiveViewId() === 'guide-view' && guideState.destinationId === 'howth';
    egg.hidden = !show;
    if (!show) resetEasterEggReveal();
  }

  function renderGuide() {
    const catWrap = $('guide-cats');
    const citySel = $('guide-city');
    const results = $('guide-results');
    if (!results) return;
    // difensivo: la guida non deve mai mostrare overlay della mappa
    $('journey-guide') && ($('journey-guide').hidden = true);
    if (catWrap) {
      const cats = [{ id: 'all', label: 'Tutte', icon: '✳' }, ...(guideData.categories || [])];
      catWrap.innerHTML = cats.map((c) => {
        const active = guideState.category === c.id;
        return `<button type="button" role="tab" class="guide-cat ${active ? 'active' : ''}" data-cat="${escapeHTML(c.id)}" aria-selected="${active}"><span aria-hidden="true">${escapeHTML(c.icon || '•')}</span> ${escapeHTML(c.label)}</button>`;
      }).join('');
      catWrap.querySelectorAll('[data-cat]').forEach((btn) => {
        btn.addEventListener('click', () => { guideState.category = btn.dataset.cat || 'all'; renderGuide(); });
      });
    }
    if (citySel) {
      const cities = getGuideCities();
      if (!cities.includes(guideState.city)) guideState.city = 'all';
      citySel.innerHTML = cities.map((c) => `<option value="${escapeHTML(c)}">${c === 'all' ? 'Tutte le città' : escapeHTML(c)}</option>`).join('');
      citySel.value = guideState.city;
    }

    const q = guideState.search.trim().toLowerCase();
    let items = guideItems.filter((it) => it && it.id);
    // sincronizza preferiti con dati correnti
    favoriteIds = loadFavorites();
    if (guideState.destinationId) items = items.filter((it) => it.destinationId === guideState.destinationId);
    if (guideState.category && guideState.category !== 'all') items = items.filter((it) => it.category === guideState.category);
    if (guideState.city && guideState.city !== 'all') items = items.filter((it) => it.city === guideState.city);
    if (q) {
      items = items.filter((it) => {
        const hay = [it.title, it.description, it.notes, it.city, it.linkLabel].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    const destFilter = guideState.destinationId ? getDestinationById(guideState.destinationId) : null;
    const filterNote = destFilter ? `<div class="guide-filter-note"><span>Stai vedendo: <strong>${escapeHTML(destFilter.title)}</strong></span><button type="button" class="text-btn small" id="guide-clear-dest">Mostra tutta la guida</button></div>` : '';

    if (!items.length) {
      results.innerHTML = `${filterNote}<div class="guide-empty"><span aria-hidden="true">◫</span><h3>Nessun contenuto qui</h3><p>Prova a cambiare categoria, città o ricerca per trovare altri spunti.</p></div>`;
    } else {
      results.innerHTML = `${filterNote}<div class="guide-grid">${items.map((it) => {
        const fav = favoriteIds.has(it.id);
        const cat = (guideData.categories || []).find((c) => c.id === it.category);
        const dest = it.destinationId ? getDestinationById(it.destinationId) : null;
        const coords = it.coords && Number.isFinite(it.coords.lat) && Number.isFinite(it.coords.lng) ? it.coords : null;
        const canMap = coords || (dest && Number.isFinite(dest.lat) && Number.isFinite(dest.lng));
        const mapBtn = canMap ? `<button type="button" class="guide-btn secondary" data-map-item="${escapeHTML(it.id)}">Vedi sulla mappa</button>` : '';
        const linkBtn = it.url ? `<a class="guide-btn link" href="${escapeHTML(it.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(it.linkLabel || 'Apri link ↗')}</a>` : '';
        const notes = it.notes ? `<p class="guide-notes"><strong>Nota:</strong> ${escapeHTML(it.notes)}</p>` : '';
        const poiTag = coords ? '<span class="guide-poi">Punto facoltativo</span>' : '';
        const destTag = dest ? `<span class="guide-dest-tag">⌖ ${escapeHTML(dest.title)}</span>` : (it.city ? `<span class="guide-dest-tag">⌖ ${escapeHTML(it.city)}</span>` : '');
        return `<article class="guide-card" data-item="${escapeHTML(it.id)}">
          <div class="guide-card-top">
            <div class="guide-tags"><span class="guide-cat-tag">${escapeHTML(cat?.icon || '•')} ${escapeHTML(cat?.label || 'Guida')}</span>${destTag}${poiTag}</div>
            <button type="button" class="fav-btn ${fav ? 'active' : ''}" data-fav="${escapeHTML(it.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Rimuovi dai preferiti' : 'Salva nei preferiti'}" title="${fav ? 'Rimuovi dai preferiti' : 'Salva nei preferiti'}">${fav ? '♥' : '♡'}</button>
          </div>
          <h3>${escapeHTML(it.title)}</h3>
          <p>${escapeHTML(it.description || '')}</p>
          ${notes}
          <div class="guide-card-actions">${mapBtn}${linkBtn}</div>
        </article>`;
      }).join('')}</div>`;
    }

    $('guide-clear-dest')?.addEventListener('click', () => { guideState.destinationId = null; renderGuide(); });
    results.querySelectorAll('[data-fav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.fav;
        if (!id || !getValidItemIds().has(id)) return;
        if (favoriteIds.has(id)) favoriteIds.delete(id); else favoriteIds.add(id);
        saveFavorites(favoriteIds);
        renderGuide();
      });
    });
    results.querySelectorAll('[data-map-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.mapItem;
        const item = guideItems.find((it) => it.id === id);
        if (!item) return;
        const coords = item.coords && Number.isFinite(item.coords.lat) && Number.isFinite(item.coords.lng) ? item.coords : null;
        showPlaceOnMap({ destinationId: item.destinationId || null, lat: coords?.lat ?? null, lng: coords?.lng ?? null, itemId: item.id });
      });
    });
    updateEasterEgg();
  }

  function renderTicketAction(id, available, path) {
    const wrap = $(id);
    if (!wrap) return;
    wrap.innerHTML = available
      ? `<a class="primary-btn ticket-download" href="${escapeHTML(path)}" download>Scarica il tuo biglietto</a><p class="ticket-status ok">PDF verificato: pronto per il download.</p>`
      : `<button type="button" class="primary-btn ticket-download" disabled aria-disabled="true">Scarica il tuo biglietto</button><p class="ticket-status pending">Biglietto in preparazione — il file verrà aggiunto in seguito.</p>`;
  }

  async function updateTicketUI() {
    const t = guideData.ticket || {};
    const copy = {
      'ticket-name': t.title || 'Il tuo biglietto per l’Irlanda 🇮🇪',
      'ticket-sub': t.subtitle || 'Regalo di laurea · Martina & Lorenza',
      'ticket-message': t.message || 'La prossima avventura comincia da qui.',
      'ticket-note': t.note || 'Biglietto regalo simbolico — non valido come titolo di viaggio.',
      'gift-ticket-occasion': t.occasion || 'Regalo di laurea',
      'gift-ticket-recipients': t.recipients || 'Martina & Lorenza',
      'gift-ticket-destination': t.destination || 'Irlanda',
      'gift-ticket-dates': t.dates || '05–10 maggio 2027',
      'gift-ticket-message': t.message || 'La prossima avventura comincia da qui.',
    };
    Object.entries(copy).forEach(([id, value]) => {
      const el = $(id);
      if (el) el.textContent = value;
    });

    const path = t.pdfPath || 'assets/downloads/biglietto-martina.pdf';
    ['ticket-action', 'gift-ticket-action'].forEach((id) => {
      const wrap = $(id);
      if (wrap) wrap.innerHTML = `<span class="ticket-status">Verifica disponibilità…</span>`;
    });

    let available = false;
    try {
      // Non basta il nome del file: verifichiamo risposta HTTP, content-type e magic bytes.
      const res = await fetch(path, { cache: 'no-store' });
      if (res.ok && /pdf/i.test(res.headers.get('content-type') || '')) {
        const magic = await (await res.blob()).slice(0, 5).text();
        available = magic === '%PDF-';
      }
    } catch { available = false; }
    renderTicketAction('ticket-action', available, path);
    renderTicketAction('gift-ticket-action', available, path);
  }

  function initGuide() {
    const citySel = $('guide-city');
    const search = $('guide-search');
    if (citySel) citySel.addEventListener('change', () => { guideState.city = citySel.value || 'all'; renderGuide(); });
    if (search) search.addEventListener('input', () => { guideState.search = search.value || ''; renderGuide(); });
    updateTicketUI();
  }

  // Wiring
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (ev) => { ev.preventDefault(); goto(el.dataset.nav); });
  });

  $('start-btn')?.addEventListener('click', () => {
    if (isJourneyCompleted()) {
      goto('map-view');
      resumeJourneyOnMap();
      if (state.mode === 'completed') { state.mode = 'free-exploration'; state.completionAcknowledged = true; saveJourneyState(); updateUI(); }
      fitRoute(true);
      return;
    }
    if (isJourneyInProgress()) {
      goto('map-view');
      resumeJourneyOnMap();
      return;
    }
    // mai iniziato
    goto('map-view');
    startTour();
  });

  $('fit-map')?.addEventListener('click', () => fitRoute(true));

  $('guide-next')?.addEventListener('click', () => {
    if (!isMapViewActive()) return;
    if (state.mode === 'completed' && !state.completionAcknowledged) { acknowledgeCompletion(); return; }
    advanceTour();
  });
  $('guide-skip')?.addEventListener('click', () => {
    if (!isMapViewActive()) return;
    if (canExploreFreely() || isJourneyCompleted()) startTour();
    else skipToExplore();
  });

  $('close-sheet')?.addEventListener('click', () => closeSheet());
  $('sheet-overlay')?.addEventListener('click', () => closeSheet());

  $('easter-egg-toggle')?.addEventListener('click', (ev) => openSealSurprise(ev.currentTarget));
  $('seal-close')?.addEventListener('click', () => closeSealSurprise());
  $('seal-return')?.addEventListener('click', () => closeSealSurprise());
  $('seal-scrim')?.addEventListener('click', () => closeSealSurprise());

  $('finale-close')?.addEventListener('click', () => closeFinale());
  $('finale-ticket')?.addEventListener('click', () => {
    // Il regalo è l'ultimo passo dell'esperienza: chiude il finale, mantiene il
    // viaggio completato e porta direttamente all'anteprima nella Dedica.
    closeFinale({ restoreFocus: false });
    acknowledgeCompletion();
    if (state.mode === 'completed') { state.completionAcknowledged = true; state.mode = 'free-exploration'; saveJourneyState(); }
    updateUI();
    goto('message');
    const section = $('gift-ticket-section');
    if (!section) return;
    section.scrollIntoView({ behavior: reduceMotion() ? 'instant' : 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
  });
  $('finale-map')?.addEventListener('click', () => {
    closeFinale({ restoreFocus: false });
    acknowledgeCompletion();
    if (state.mode === 'completed') { state.completionAcknowledged = true; state.mode = 'free-exploration'; saveJourneyState(); }
    updateUI();
    if (isMapViewActive()) fitRoute(true);
    $('guide-skip')?.focus?.({ preventScroll: true });
  });
  $('gift-back-map')?.addEventListener('click', () => {
    goto('map-view');
    resumeJourneyOnMap();
    $('guide-skip')?.focus?.({ preventScroll: true });
  });

  document.addEventListener('keydown', (ev) => {
    // Il dialog delle foche ha priorità assoluta: trap del focus e Escape dedicato.
    if (sealIsOpen()) {
      if (ev.key === 'Escape') { ev.preventDefault(); closeSealSurprise(); }
      else if (ev.key === 'Tab') trapSealFocus(ev);
      return;
    }
    const open = sheetIsOpen();
    const finaleOpen = $('journey-finale') && !$('journey-finale').hidden;
    if (ev.key === 'Escape') {
      if (open) closeSheet();
      else if (finaleOpen) closeFinale();
      return;
    }
    if (open && isMapViewActive() && isJourneyCompleted() && state.mode !== 'stop-revealed') {
      if (ev.key === 'ArrowRight') { state.sheetExpanded = false; openSheet((state.activeStop + 1) % stops.length, { rerender: true }); }
      if (ev.key === 'ArrowLeft') { state.sheetExpanded = false; openSheet((state.activeStop - 1 + stops.length) % stops.length, { rerender: true }); }
    }
  });

  // init
  $('journey-finale')?.setAttribute('aria-hidden', 'true');
  $('seal-dialog')?.setAttribute('aria-hidden', 'true');
  // normalizza stato caricato
  if (isJourneyCompleted()) {
    state.revealed = stops.length;
    if (state.mode !== 'completed') state.mode = 'free-exploration';
  } else if (state.revealed > 0) {
    setResumableStateAfterInterruption();
  } else {
    state.mode = 'idle';
    state.revealed = 0;
  }

  initGuide();
  updateTimeline();
  renderDays();
  updateHomeCta();

  if (location.hash === '#map' || location.hash === '#map-view') {
    goto('map-view');
    resumeJourneyOnMap();
  } else if (location.hash === '#stops') {
    goto('stops');
  } else if (location.hash === '#guide' || location.hash === '#guide-view') {
    goto('guide-view');
  } else if (location.hash === '#message') {
    goto('message');
  } else {
    updateUI();
  }
})();
