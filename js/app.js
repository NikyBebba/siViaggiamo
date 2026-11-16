(() => {
  'use strict';
  const data = window.TRIP;
  const stops = data.destinations;
  const $ = id => document.getElementById(id);
  let map, markerLayer, routeLine, routeOutline;
  let activeStop = 0;
  let tourActive = false;
  let revealed = 0;
  let moving = false;
  let returnFocus = null;
  const markers = [];
  const coords = stops.map(s => [s.lat, s.lng]);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applyAvatar(el, traveler) {
    el.title = traveler.name;
    el.setAttribute('aria-label', traveler.name);
    if (traveler.image) {
      el.style.backgroundImage = `url("${traveler.image.replaceAll('"', '%22')}")`;
      el.textContent = '';
    }
  }
  document.querySelectorAll('.avatar-a').forEach(el => applyAvatar(el, data.travelers[0]));
  document.querySelectorAll('.avatar-b').forEach(el => applyAvatar(el, data.travelers[1]));
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function refreshMap() {
    if (!map) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      map.invalidateSize({pan: false, animate: false});
    }));
  }
  function goto(id) {
    closeSheet();
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const selected = btn.dataset.nav === id;
      btn.classList.toggle('selected', selected);
      if (selected) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
    window.scrollTo({top:0, behavior:'instant'});
    if (id === 'map-view') {
      ensureMap();
      refreshMap();
      // Quando la mappa diventa visibile, sincronizziamo le dimensioni prima di animarla.
      setTimeout(refreshMap, 120);
      setTimeout(refreshMap, 420);
    }
  }
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', ev => {
    ev.preventDefault();
    goto(el.dataset.nav);
  }));
  $('start-btn').addEventListener('click', () => {
    goto('map-view');
    if (!sessionStorage.getItem('siViaggiamoIntroduzioneCompletata')) startTour();
    else fitRoute();
  });
  $('view-stops').addEventListener('click', () => goto('stops'));

  function ensureMap() {
    if (map) return;
    if (!window.L) {
      $('map').innerHTML = '<p style="padding:24px">Impossibile caricare la mappa. Controlla la connessione a Internet.</p>';
      return;
    }
    map = L.map('map', {zoomControl: true, scrollWheelZoom: false, zoomSnap: 0.5, preferCanvas: true});
    map.setView([53.4, -8.1], 6.5, {animate:false});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      crossOrigin: true
    }).addTo(map);
    // La linea rappresenta la sequenza delle destinazioni, non il percorso in auto.
    routeOutline = L.polyline([], {color:'#fff8ea', weight:8, opacity:.95, lineCap:'round', interactive:false}).addTo(map);
    routeLine = L.polyline([], {color:'#d39a72', weight:4, dashArray:'3,11', lineCap:'round', interactive:false}).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    stops.forEach((s, index) => {
      const icon = L.divIcon({className:'pin-marker', html:`<span style="background:${s.color}">${index+1}</span>`, iconSize:[40,40], iconAnchor:[20,20]});
      const marker = L.marker([s.lat,s.lng], {icon, title:s.title});
      marker.on('click', () => openSheet(index));
      markers.push(marker);
    });
    renderMapProgress(stops.length);
    fitRoute(false);
    if ('ResizeObserver' in window) new ResizeObserver(refreshMap).observe($('map'));
    window.addEventListener('resize', refreshMap);
  }
  function renderMapProgress(count) {
    if (!map) return;
    markerLayer.clearLayers();
    markers.slice(0, count).forEach(marker => marker.addTo(markerLayer));
    const path = coords.slice(0, count);
    routeOutline.setLatLngs(path);
    routeLine.setLatLngs(path);
  }
  function fitRoute(animate=true) {
    if (!map || !coords.length) return;
    map.invalidateSize({pan:false});
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds.pad(.22), {animate:animate && !reduceMotion, maxZoom: 8, padding:[24,24]});
  }
  $('fit-map').addEventListener('click', () => fitRoute());
  $('restart-tour').addEventListener('click', () => {
    goto('map-view');
    startTour();
  });

  function buildTimeline() {
    $('stops-list').innerHTML = stops.map((s,i) => `<div class="timeline-row">
      <div class="timeline-axis"><div class="timeline-number" style="background:${s.color}">${i+1}</div>${i<stops.length-1?'<div class="timeline-line"></div>':''}</div>
      <div class="timeline-content"><h3>${escapeHTML(s.title)} <span aria-hidden="true">${escapeHTML(s.icon)}</span></h3><p>${escapeHTML(s.description)}</p><button type="button" class="stop-link" data-stop="${i}">Scopri la tappa →</button></div></div>`).join('');
    $('stops-list').querySelectorAll('[data-stop]').forEach(btn => btn.addEventListener('click', () => {
      goto('map-view');
      const i = Number(btn.dataset.stop);
      map.flyTo(coords[i], 9, {animate:!reduceMotion,duration:1.1});
      map.once('moveend',()=>openSheet(i));
      if (reduceMotion) openSheet(i);
    }));
  }
  buildTimeline();

  function openSheet(index) {
    activeStop = (index + stops.length) % stops.length;
    const s = stops[activeStop];
    const mapsURL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.lat},${s.lng}`)}`;
    const action = tourActive && activeStop === revealed - 1
      ? `<button type="button" id="sheet-tour-next" class="sheet-tour-next">${revealed===stops.length?'Termina la sorpresa ✓':'Scopri la prossima tappa →'}</button>` : '';
    $('sheet-content').innerHTML = `<div class="sheet-img" style="background:linear-gradient(140deg,${s.color},#a8c89d)">${s.image?`<img src="${escapeHTML(s.image)}" alt="${escapeHTML(s.title)}" loading="lazy">`:`<span aria-hidden="true">${escapeHTML(s.icon)}</span><span class="photo-placeholder">FOTO IN ARRIVO ✦</span>`}</div>
      <div class="sheet-body"><span class="stop-tag">TAPPA N. ${String(activeStop+1).padStart(2,'0')}</span><h3 id="sheet-title">${escapeHTML(s.title)}</h3><p class="region">⌖ ${escapeHTML(s.region)}, Irlanda</p>
      <p class="description">${escapeHTML(s.description)}</p><div class="dedication"><strong>♡ Una dedica per te</strong>${escapeHTML(s.dedication)}</div>
      ${action}<div class="sheet-actions"><a href="${mapsURL}" target="_blank" rel="noopener noreferrer">Apri su Google Maps ↗</a><button type="button" id="prev-stop">← Precedente</button><button type="button" id="next-stop">Successiva →</button></div>
      <p class="sheet-counter">Tappa ${activeStop+1} di ${stops.length}</p></div>`;
    $('prev-stop').addEventListener('click', () => openSheet(activeStop-1));
    $('next-stop').addEventListener('click', () => openSheet(activeStop+1));
    if ($('sheet-tour-next')) $('sheet-tour-next').addEventListener('click', () => {
      closeSheet();
      advanceTour();
    });
    returnFocus = document.activeElement;
    $('sheet-overlay').hidden = false;
    $('stop-sheet').classList.add('open');
    $('stop-sheet').setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    if (map && $('map-view').classList.contains('active') && !moving) map.panTo(coords[activeStop], {animate:!reduceMotion});
    $('close-sheet').focus();
  }
  function closeSheet() {
    if (!$('stop-sheet').classList.contains('open')) return;
    $('sheet-overlay').hidden = true;
    $('stop-sheet').classList.remove('open');
    $('stop-sheet').setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus();
  }
  $('close-sheet').addEventListener('click', closeSheet);
  $('sheet-overlay').addEventListener('click', closeSheet);
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') closeSheet();
    if ($('stop-sheet').classList.contains('open')) {
      if (ev.key === 'ArrowRight') openSheet(activeStop+1);
      if (ev.key === 'ArrowLeft') openSheet(activeStop-1);
    }
  });

  function updateGuide() {
    $('journey-guide').hidden = !tourActive;
    if (!tourActive) return;
    $('guide-progress').innerHTML = stops.map((_,i) => `<span class="${i<revealed?'done':''}" aria-hidden="true"></span>`).join('');
    $('guide-label').textContent = `La sorpresa di Martina · ${revealed}/${stops.length}`;
    if (revealed === 0) {
      $('guide-title').textContent = 'Pronta a partire, Martina? ☘';
      $('guide-text').textContent = 'Scopriremo il viaggio insieme, una tappa alla volta. Sei tu a decidere quando andare avanti!';
      $('guide-next').textContent = 'Scopri la prima tappa ↗';
    } else if (revealed < stops.length) {
      $('guide-title').textContent = `${stops[revealed-1].title} svelata! ✨`;
      $('guide-text').textContent = 'Quando vuoi, andiamo alla destinazione successiva.';
      $('guide-next').textContent = 'Prossima tappa →';
    } else {
      $('guide-title').textContent = 'Hai scoperto tutto! ♡';
      $('guide-text').textContent = 'Il tuo viaggio è pronto per essere esplorato liberamente.';
      $('guide-next').textContent = 'Esplora tutta la mappa ✓';
    }
    $('guide-next').disabled = moving;
  }
  function startTour() {
    if (!stops.length) return;
    closeSheet();
    ensureMap();
    if (!map) return;
    tourActive = true;
    revealed = 0;
    moving = false;
    renderMapProgress(0);
    map.setView([53.5,-8.1], 6.5, {animate:false});
    refreshMap();
    updateGuide();
  }
  function finishTour() {
    tourActive = false;
    moving = false;
    sessionStorage.setItem('siViaggiamoIntroduzioneCompletata','yes');
    renderMapProgress(stops.length);
    updateGuide();
    fitRoute();
  }
  function advanceTour() {
    if (!tourActive || moving) return;
    if (revealed >= stops.length) { finishTour(); return; }
    moving = true;
    updateGuide();
    closeSheet();
    const index = revealed;
    revealed++;
    renderMapProgress(revealed);
    const destination = coords[index];
    // Nessun timeout per passare alla tappa successiva: solo il click di Martina.
    // moveend segnala esclusivamente la conclusione dell'animazione geografica.
    map.once('moveend', () => {
      moving = false;
      updateGuide();
      openSheet(index);
    });
    map.flyTo(destination, 9, {animate:!reduceMotion, duration:1.35, easeLinearity:0.28});
  }
  $('guide-next').addEventListener('click', advanceTour);
  $('guide-skip').addEventListener('click', () => {closeSheet();finishTour();});

  if (location.hash === '#map') goto('map-view');
  else if (location.hash === '#stops') goto('stops');
  else if (location.hash === '#message') goto('message');
})();
