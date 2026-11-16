(() => {
  'use strict';

  const data = window.TRIP;
  const stops = Array.isArray(data?.destinations) ? data.destinations : [];
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'siViaggiamoJourneyState';

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function loadJourneyState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // Compatibilità con v1.5: solo flag di completamento
        if (sessionStorage.getItem('siViaggiamoIntroduzioneCompletata') === 'yes') {
          return { revealed: stops.length, mode: 'free-exploration', activeStop: Math.max(0, stops.length - 1), completionAcknowledged: true, finalShown: true };
        }
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
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
  const markers = [];
  const coords = stops.map((s) => [s.lat, s.lng]);
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function saveJourneyState() {
    try {
      const payload = {
        v: 1,
        mode: state.mode,
        revealed: state.revealed,
        activeStop: state.activeStop,
        completionAcknowledged: state.completionAcknowledged,
        finalShown: state.finalShown,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      // flag legacy per compatibilità
      if (state.revealed >= stops.length || canExploreFreely()) {
        sessionStorage.setItem('siViaggiamoIntroduzioneCompletata', 'yes');
      } else {
        sessionStorage.removeItem('siViaggiamoIntroduzioneCompletata');
      }
      sessionStorage.setItem('siViaggiamoCompletamentoConfermato', state.completionAcknowledged ? 'yes' : 'no');
      sessionStorage.setItem('siViaggiamoFinaleMostrata', state.finalShown ? 'yes' : 'no');
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
    el.setAttribute('aria-label', traveler.name || 'Viaggiatrice');
    if (traveler.image) {
      el.style.backgroundImage = `url("${String(traveler.image).replaceAll('"', '%22')}")`;
      el.textContent = '';
    } else {
      el.style.backgroundImage = '';
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
    const fromMap = isMapViewActive();
    if (fromMap && id !== 'map-view') {
      cancelTravel();
      clearCompletionTimer();
      closeSheet({ restoreFocus: false, keepState: true });
      closeFinale({ restoreFocus: false });
      if (state.mode === 'moving') {
        setResumableStateAfterInterruption();
      }
    }

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
    if (id === 'stops') updateTimeline();
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

  function makePinIcon(index, active) {
    const stop = stops[index] || {};
    const hidden = !isStopRevealed(index);
    return L.divIcon({
      className: 'pin-marker' + (active ? ' active' : '') + (hidden ? ' locked' : ''),
      html: `<span style="background:${escapeHTML(stop.color || '#295642')}">${index + 1}</span>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
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

  function waitMoveEnd(token) {
    return new Promise((resolve) => {
      if (!map) { resolve(); return; }
      const done = () => { map.off('moveend', done); resolve(); };
      map.once('moveend', done);
      window.setTimeout(() => { if (token === travelToken) { map.off('moveend', done); resolve(); } }, 3500);
    });
  }

  async function animateJourneyTo(index) {
    if (!map || index < 0 || index >= stops.length) return false;
    const token = ++travelToken;
    const destination = coords[index];
    map.stop();
    if (reduceMotion()) {
      map.setView(destination, 9, { animate: false });
      return token === travelToken;
    }
    map.flyTo(destination, 9, { animate: true, duration: 1.9, easeLinearity: 0.22 });
    await waitMoveEnd(token);
    return token === travelToken;
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

    if (!expanded) {
      return `<div class="sheet-postcard compact">
        <div class="sheet-compact">
          <div class="sheet-compact-thumb" data-icon="${escapeHTML(s.icon || '☘')}" style="background:linear-gradient(140deg,${escapeHTML(s.color || '#295642')},#b7d3b3)">${compactPhoto}</div>
          <div class="sheet-compact-body">
            <div class="postcard-meta">${dayLabel}<span class="stop-tag">TAPPA ${index + 1}</span></div>
            <h3 id="sheet-title">${escapeHTML(s.title)}</h3>
            <p class="sheet-brief">${brief}</p>
          </div>
        </div>
        <div class="sheet-compact-actions">
          ${primary}
          <button type="button" id="sheet-toggle" class="sheet-toggle-btn" aria-expanded="false">${toggleLabel} ↓</button>
        </div>
      </div>`;
    }

    return `<div class="sheet-postcard expanded">
      <div class="sheet-img" data-icon="${escapeHTML(s.icon || '☘')}" style="background:linear-gradient(140deg,${escapeHTML(s.color || '#295642')},#b7d3b3)">
        ${fullPhoto}
        <span class="sheet-sticker" aria-hidden="true">✦</span>
      </div>
      <div class="sheet-body">
        <div class="postcard-meta">${dayLabel}<span class="stop-tag">TAPPA N. ${String(index + 1).padStart(2, '0')}</span></div>
        <h3 id="sheet-title">${escapeHTML(s.title)}</h3>
        <p class="region">⌖ ${escapeHTML(s.region || 'Irlanda')}, Irlanda</p>
        <p class="description">${escapeHTML(s.description || '')}</p>
        <div class="dedication"><span class="dedication-tape" aria-hidden="true"></span><strong>♡ Una dedica per te</strong>${escapeHTML(s.dedication || '')}</div>
        ${primary}
        <div class="sheet-secondary-actions">
          <a href="${mapsURL}" target="_blank" rel="noopener noreferrer">Apri su Google Maps ↗</a>
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
    $('prev-stop')?.addEventListener('click', () => { state.sheetExpanded = false; openSheet((index - 1 + stops.length) % stops.length, { rerender: true }); });
    $('next-stop')?.addEventListener('click', () => { state.sheetExpanded = false; openSheet((index + 1) % stops.length, { rerender: true }); });
    $('sheet-toggle')?.addEventListener('click', () => {
      state.sheetExpanded = !state.sheetExpanded;
      $('sheet-content').innerHTML = sheetHTML(index, state.sheetExpanded);
      bindSheetEvents(index);
      $('sheet-toggle')?.focus();
    });
  }

  function openSheet(index, { fromMarker = false, rerender = false } = {}) {
    if (index < 0 || index >= stops.length || !isStopRevealed(index)) return;
    if (state.mode === 'moving' || !isMapViewActive()) return;
    state.activeStop = index;
    if (!rerender) state.sheetExpanded = false;
    const inGuidedReveal = state.mode === 'stop-revealed';

    $('sheet-content').innerHTML = sheetHTML(index, state.sheetExpanded);
    bindSheetEvents(index);

    if (!sheetIsOpen()) returnFocus = document.activeElement;
    $('sheet-overlay').hidden = inGuidedReveal;
    $('stop-sheet').classList.toggle('tour-mode', inGuidedReveal);
    $('stop-sheet').classList.toggle('expanded', state.sheetExpanded);
    $('stop-sheet').classList.add('open');
    $('stop-sheet').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = inGuidedReveal ? '' : 'hidden';

    if (map && !inGuidedReveal && !fromMarker) {
      map.panTo(coords[index], { animate: !reduceMotion() });
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
  }
  function closeFinale({ restoreFocus = true } = {}) {
    const el = $('journey-finale');
    if (!el || el.hidden) return;
    el.hidden = true;
    if (restoreFocus && isMapViewActive()) $('guide-next')?.focus?.();
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

    if (canExploreFreely() || isJourneyCompleted()) {
      const discovered = stops.length;
      const compact = state.mode === 'free-exploration' || state.completionAcknowledged;
      guide.hidden = false;
      guide.className = 'journey-guide compact ' + (compact ? 'compact-ui' : 'celebrate');
      label.textContent = `Viaggio · ${discovered}/${stops.length}`;
      progress.innerHTML = stops.map(() => '<span class="done" aria-hidden="true"></span>').join('');
      if (!compact && state.mode === 'completed') {
        title.textContent = 'Viaggio svelato!';
        text.textContent = 'Tutte le tappe sono state scoperte. Ora puoi esplorare la mappa in libertà.';
        next.textContent = 'Continua';
        next.disabled = false;
        skip.textContent = 'Rivivi ↺';
        skip.hidden = false;
      } else {
        title.textContent = 'Mappa libera';
        text.textContent = 'Tocca un pin o apri il diario.';
        next.textContent = 'Mostra tutto';
        next.disabled = false;
        skip.textContent = 'Rivivi ↺';
        skip.hidden = false;
      }
      return;
    }

    const sheetOpen = sheetIsOpen();
    const show = state.mode === 'idle' || (state.mode === 'stop-revealed' && !sheetOpen);
    guide.hidden = !show;
    guide.className = 'journey-guide compact';
    label.textContent = `Sorpresa · ${state.revealed}/${stops.length}`;
    progress.innerHTML = stops.map((_, i) => `<span class="${i < state.revealed ? 'done' : ''}" aria-hidden="true"></span>`).join('');
    skip.hidden = false;

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
    sessionStorage.removeItem('siViaggiamoFinaleMostrata');
    sessionStorage.removeItem('siViaggiamoCompletamentoConfermato');
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

    if (isJourneyCompleted()) {
      if (state.mode === 'completed' && !state.completionAcknowledged) { acknowledgeCompletion(); return; }
      if (state.mode === 'completed') state.mode = 'free-exploration';
      saveJourneyState();
      updateUI();
      fitRoute(true);
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

    const tokenAtStart = travelToken;
    const ok = await animateJourneyTo(index);
    if (tokenAtStart !== travelToken) return; // interrotto/annullato
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

  $('finale-close')?.addEventListener('click', () => closeFinale());
  $('finale-map')?.addEventListener('click', () => { closeFinale({ restoreFocus: false }); if (state.mode === 'completed') { state.completionAcknowledged = true; state.mode = 'free-exploration'; saveJourneyState(); } updateUI(); if (isMapViewActive()) fitRoute(true); });
  $('finale-message')?.addEventListener('click', () => { closeFinale({ restoreFocus: false }); goto('message'); });

  document.addEventListener('keydown', (ev) => {
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

  updateTimeline();
  updateHomeCta();

  if (location.hash === '#map' || location.hash === '#map-view') {
    goto('map-view');
    resumeJourneyOnMap();
  } else if (location.hash === '#stops') {
    goto('stops');
  } else if (location.hash === '#message') {
    goto('message');
  } else {
    updateUI();
  }
})();
