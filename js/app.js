(() => {
  'use strict';

  const data = window.TRIP;
  const stops = Array.isArray(data?.destinations) ? data.destinations : [];
  const $ = (id) => document.getElementById(id);

  const state = {
    mode: 'idle', // idle | moving | stop-revealed | completed | free-exploration
    activeStop: 0,
    revealed: 0,
  };

  let map;
  let markerLayer;
  let routeOutline;
  let routeLine;
  let tileLayer;
  let returnFocus = null;
  let resizeObserver;
  let tileErrorNotified = false;
  const markers = [];
  const coords = stops.map((s) => [s.lat, s.lng]);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    }
  }

  document.querySelectorAll('.avatar-a').forEach((el) => applyAvatar(el, data?.travelers?.[0]));
  document.querySelectorAll('.avatar-b').forEach((el) => applyAvatar(el, data?.travelers?.[1]));

  function setMapStatus(message) {
    const el = $('map-status');
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function isMapViewActive() {
    return $('map-view')?.classList.contains('active');
  }

  function refreshMap() {
    if (!map || !isMapViewActive()) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, animate: false });
      });
    });
  }

  function canExploreFreely() {
    return state.mode === 'completed' || state.mode === 'free-exploration';
  }

  function setMode(mode) {
    state.mode = mode;
    updateGuide();
  }

  function goto(id) {
    const fromMap = isMapViewActive();
    if (fromMap && id !== 'map-view' && state.mode === 'stop-revealed') {
      // Manteniamo la scheda aperta solo nel contesto mappa durante la scoperta.
      closeSheet({ restoreFocus: false });
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
      }, 120);
    }
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
      markerZoomAnimation: !reduceMotion,
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
    tileLayer.on('load', () => {
      if (tileErrorNotified) return;
      setMapStatus('');
    });
    tileLayer.addTo(map);

    routeOutline = L.polyline([], { color: '#fff8ea', weight: 8, opacity: 0.95, lineCap: 'round', interactive: false }).addTo(map);
    routeLine = L.polyline([], { color: '#d39a72', weight: 4, dashArray: '3,11', lineCap: 'round', interactive: false }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);

    stops.forEach((s, index) => {
      const icon = L.divIcon({
        className: 'pin-marker',
        html: `<span style="background:${escapeHTML(s.color || '#295642')}">${index + 1}</span>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      const marker = L.marker([s.lat, s.lng], { icon, title: s.title || `Tappa ${index + 1}` });
      marker.on('click', () => {
        if (state.mode === 'moving') return;
        if (canExploreFreely()) openSheet(index, { fromMarker: true });
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
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshMap();
    });

    renderProgress();
    fitRoute(false);
  }

  function renderProgress() {
    if (!map) return;
    const visibleCount = canExploreFreely() ? stops.length : state.revealed;
    const path = coords.slice(0, visibleCount);
    routeOutline.setLatLngs(path);
    routeLine.setLatLngs(path);

    markers.forEach((marker, index) => {
      const icon = L.divIcon({
        className: 'pin-marker' + (index === state.activeStop && state.mode === 'stop-revealed' ? ' active' : ''),
        html: `<span style="background:${escapeHTML(stops[index].color || '#295642')}">${index + 1}</span>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      marker.setIcon(icon);
      const visible = canExploreFreely() || index < visibleCount;
      if (visible) {
        if (!markerLayer.hasLayer(marker)) marker.addTo(markerLayer);
      } else if (markerLayer.hasLayer(marker)) {
        markerLayer.removeLayer(marker);
      }
    });
  }

  function fitRoute(animate = true) {
    if (!map || !coords.length) return;
    map.invalidateSize({ pan: false });
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(0.22), { animate: animate && !reduceMotion, maxZoom: 8, padding: [24, 24] });
  }

  function buildTimeline() {
    const list = $('stops-list');
    if (!list) return;
    list.innerHTML = stops.map((s, i) => `<div class="timeline-row">
      <div class="timeline-axis"><div class="timeline-number" style="background:${escapeHTML(s.color || '#295642')}">${i + 1}</div>${i < stops.length - 1 ? '<div class="timeline-line"></div>' : ''}</div>
      <div class="timeline-content"><h3>${escapeHTML(s.title)} <span aria-hidden="true">${escapeHTML(s.icon || '')}</span></h3><p>${escapeHTML(s.description || '')}</p><button type="button" class="stop-link" data-stop="${i}">Scopri la tappa →</button></div></div>`).join('');

    list.querySelectorAll('[data-stop]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = Number(btn.dataset.stop);
        goto('map-view');
        ensureMap();
        if (!map) return;
        if (!canExploreFreely()) return;
        focusStop(index, { open: true });
      });
    });
  }

  function focusStop(index, { open = false } = {}) {
    if (!map || index < 0 || index >= stops.length) return;
    state.activeStop = index;
    renderProgress();
    map.stop();
    const destination = coords[index];
    const done = () => {
      if (open) openSheet(index, { fromMarker: false });
    };
    if (reduceMotion) {
      map.setView(destination, 9, { animate: false });
      done();
    } else {
      map.once('moveend', done);
      map.flyTo(destination, 9, { animate: true, duration: 1.1, easeLinearity: 0.3 });
    }
  }

  function openSheet(index, { fromMarker = false } = {}) {
    if (index < 0 || index >= stops.length) return;
    state.activeStop = index;
    const s = stops[index];
    const mapsURL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.lat},${s.lng}`)}`;
    const inGuidedReveal = state.mode === 'stop-revealed';
    const isLast = state.revealed >= stops.length;

    const action = inGuidedReveal
      ? `<button type="button" id="sheet-advance" class="guide-next" style="margin:14px 0 8px">${isLast ? 'Termina la scoperta' : 'Scopri la prossima tappa'}</button>`
      : '';

    const navActions = inGuidedReveal
      ? ''
      : `<button type="button" id="prev-stop">← Precedente</button><button type="button" id="next-stop">Successiva →</button>`;

    $('sheet-content').innerHTML = `<div class="sheet-img" style="background:linear-gradient(140deg,${escapeHTML(s.color || '#295642')},#a8c89d)">${s.image ? `<img src="${escapeHTML(s.image)}" alt="${escapeHTML(s.title)}" loading="lazy">` : `<span aria-hidden="true">${escapeHTML(s.icon || '☘')}</span><span class="photo-placeholder">FOTO IN ARRIVO ✦</span>`}</div>
      <div class="sheet-body"><span class="stop-tag">TAPPA N. ${String(index + 1).padStart(2, '0')}</span><h3 id="sheet-title">${escapeHTML(s.title)}</h3><p class="region">⌖ ${escapeHTML(s.region || 'Irlanda')}, Irlanda</p>
      <p class="description">${escapeHTML(s.description || '')}</p><div class="dedication"><strong>♡ Una dedica per te</strong>${escapeHTML(s.dedication || '')}</div>
      ${action}<div class="sheet-actions"><a href="${mapsURL}" target="_blank" rel="noopener noreferrer">Apri su Google Maps ↗</a>${navActions}</div>
      <p class="sheet-counter">Tappa ${index + 1} di ${stops.length}</p></div>`;

    const prev = $('prev-stop');
    const next = $('next-stop');
    if (prev) prev.addEventListener('click', () => openSheet((index - 1 + stops.length) % stops.length));
    if (next) next.addEventListener('click', () => openSheet((index + 1) % stops.length));

    const advance = $('sheet-advance');
    if (advance) {
      advance.addEventListener('click', () => {
        closeSheet({ restoreFocus: false });
        advanceTour();
      });
    }

    returnFocus = document.activeElement;
    $('sheet-overlay').hidden = inGuidedReveal; // nessuna copertura scura sulla mappa durante scoperta guidata
    $('stop-sheet').classList.toggle('tour-mode', inGuidedReveal);
    $('stop-sheet').classList.add('open');
    $('stop-sheet').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = inGuidedReveal ? '' : 'hidden';

    if (map && isMapViewActive() && !inGuidedReveal && !fromMarker && state.mode !== 'moving') {
      map.panTo(coords[index], { animate: !reduceMotion });
    }
    $('close-sheet').focus();
    updateGuide();
  }

  function closeSheet({ restoreFocus = true } = {}) {
    const sheet = $('stop-sheet');
    if (!sheet || !sheet.classList.contains('open')) return;
    $('sheet-overlay').hidden = true;
    sheet.classList.remove('open', 'tour-mode');
    sheet.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (restoreFocus && returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
      returnFocus.focus();
    }
    updateGuide();
  }

  function updateGuide() {
    const guide = $('journey-guide');
    if (!guide) return;

    if (canExploreFreely()) {
      guide.hidden = false;
      guide.classList.remove('is-moving');
      $('guide-label').textContent = `Viaggio completo · ${stops.length}/${stops.length}`;
      $('guide-progress').innerHTML = stops.map(() => '<span class="done" aria-hidden="true"></span>').join('');
      $('guide-title').textContent = state.mode === 'completed' ? 'Hai scoperto tutto! ♡' : 'Esplora liberamente la mappa';
      $('guide-text').textContent = state.mode === 'completed'
        ? 'Ora tutte le tappe sono tue: apri i pin, rileggi le dediche o rivivi la sorpresa quando vuoi.'
        : 'Tocca i pin numerati o usa la timeline per tornare dove preferisci.';
      $('guide-next').textContent = state.mode === 'completed' ? 'Esplora tutta la mappa' : 'Mostra tutto il percorso';
      $('guide-next').disabled = false;
      $('guide-skip').textContent = 'Rivivi la sorpresa ↺';
      return;
    }

    const sheetOpen = $('stop-sheet')?.classList.contains('open');
    const showGuide = state.mode === 'idle' || state.mode === 'moving' || (state.mode === 'stop-revealed' && !sheetOpen);
    guide.hidden = !showGuide;
    guide.classList.toggle('is-moving', state.mode === 'moving');
    $('guide-progress').innerHTML = stops.map((_, i) => `<span class="${i < state.revealed ? 'done' : ''}" aria-hidden="true"></span>`).join('');
    $('guide-label').textContent = `La sorpresa di Martina · ${state.revealed}/${stops.length}`;
    $('guide-skip').textContent = 'Esplora liberamente ×';
    $('guide-next').disabled = state.mode === 'moving';

    if (state.mode === 'moving') {
      $('guide-title').textContent = 'Stiamo viaggiando…';
      $('guide-text').textContent = 'La mappa si sta spostando verso la prossima destinazione.';
      $('guide-next').textContent = 'In viaggio…';
      return;
    }

    if (state.mode === 'stop-revealed') {
      const isLast = state.revealed >= stops.length;
      $('guide-title').textContent = `${stops[state.activeStop]?.title || 'Tappa'} scoperta`;
      $('guide-text').textContent = 'Quando vuoi, continua il viaggio con il pulsante qui sotto.';
      $('guide-next').textContent = isLast ? 'Termina la scoperta' : 'Scopri la prossima tappa';
      return;
    }

    $('guide-title').textContent = 'Martina, pronta a partire?';
    $('guide-text').textContent = 'Premi il pulsante per scoprire la prima tappa: la mappa ti accompagnerà nel viaggio.';
    $('guide-next').textContent = 'Scopri la prima tappa';
  }

  function startTour() {
    if (!stops.length) return;
    ensureMap();
    if (!map) return;
    closeSheet({ restoreFocus: false });
    state.revealed = 0;
    state.activeStop = 0;
    setMode('idle');
    renderProgress();
    map.stop();
    map.setView([53.5, -8.1], 6.7, { animate: false });
    refreshMap();
    updateGuide();
  }

  function finishTour() {
    state.revealed = stops.length;
    sessionStorage.setItem('siViaggiamoIntroduzioneCompletata', 'yes');
    renderProgress();
    setMode('completed');
    fitRoute(true);
  }

  function advanceTour() {
    if (!map || state.mode === 'moving') return;

    if (canExploreFreely()) {
      if (state.mode === 'completed') setMode('free-exploration');
      fitRoute(true);
      return;
    }

    if (state.mode === 'stop-revealed') {
      // Dopo l'ultima tappa, la CTA conclude la scoperta.
      if (state.revealed >= stops.length) {
        closeSheet({ restoreFocus: false });
        finishTour();
        return;
      }
      // Se l'utente chiude la scheda, il controllo resta nel pannello guida: si prosegue da lì.
      closeSheet({ restoreFocus: false });
      if (state.revealed >= stops.length) return;
      // Passa alla tappa successiva dal punto di avanzamento corrente.
      setMode('idle');
    }

    if (state.mode !== 'idle') return;
    if (state.revealed >= stops.length) {
      finishTour();
      return;
    }

    const index = state.revealed;
    state.revealed += 1;
    state.activeStop = index;
    closeSheet({ restoreFocus: false });
    setMode('moving');
    renderProgress();

    const destination = coords[index];
    map.stop();
    const arrived = () => {
      map.off('moveend', arrived);
      renderProgress();
      setMode('stop-revealed');
      openSheet(index, { fromMarker: false });
    };

    refreshMap();
    if (reduceMotion) {
      map.setView(destination, 9, { animate: false });
      arrived();
    } else {
      map.once('moveend', arrived);
      map.flyTo(destination, 9, { animate: true, duration: 1.7, easeLinearity: 0.28 });
    }
  }

  function skipOrRestart() {
    if (canExploreFreely()) {
      startTour();
      return;
    }
    closeSheet({ restoreFocus: false });
    finishTour();
  }

  // Event wiring
  document.querySelectorAll('[data-nav]').forEach((el) => {
    el.addEventListener('click', (ev) => {
      ev.preventDefault();
      goto(el.dataset.nav);
    });
  });

  $('start-btn')?.addEventListener('click', () => {
    goto('map-view');
    if (!sessionStorage.getItem('siViaggiamoIntroduzioneCompletata')) startTour();
    else {
      finishTour();
      setMode('free-exploration');
    }
  });

  $('view-stops')?.addEventListener('click', () => goto('stops'));
  $('fit-map')?.addEventListener('click', () => fitRoute(true));
  $('restart-tour')?.addEventListener('click', () => {
    goto('map-view');
    startTour();
  });

  $('guide-next')?.addEventListener('click', () => {
    if (state.mode === 'completed') {
      setMode('free-exploration');
      fitRoute(true);
      return;
    }
    if (state.mode === 'free-exploration') {
      fitRoute(true);
      return;
    }
    advanceTour();
  });
  $('guide-skip')?.addEventListener('click', skipOrRestart);

  $('close-sheet')?.addEventListener('click', () => closeSheet());
  $('sheet-overlay')?.addEventListener('click', () => closeSheet());

  document.addEventListener('keydown', (ev) => {
    const sheetOpen = $('stop-sheet')?.classList.contains('open');
    if (ev.key === 'Escape' && sheetOpen) closeSheet();
    if (sheetOpen && canExploreFreely()) {
      if (ev.key === 'ArrowRight') openSheet((state.activeStop + 1) % stops.length);
      if (ev.key === 'ArrowLeft') openSheet((state.activeStop - 1 + stops.length) % stops.length);
    }
  });

  buildTimeline();
  if (location.hash === '#map' || location.hash === '#map-view') goto('map-view');
  else if (location.hash === '#stops') goto('stops');
  else if (location.hash === '#message') goto('message');
})();
