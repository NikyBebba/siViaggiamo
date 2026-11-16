(() => {
  'use strict';
  const data = window.TRIP;
  const stops = data.destinations;
  let map, routeLayer, markerLayer;
  let activeStop = 0;
  let revealRunning = false;
  let timers = [];
  const $ = id => document.getElementById(id);

  // Use actual photos automatically as soon as paths are set in destinations.js.
  document.querySelectorAll('.avatar-a').forEach(el => applyAvatar(el, data.travelers[0]));
  document.querySelectorAll('.avatar-b').forEach(el => applyAvatar(el, data.travelers[1]));
  function applyAvatar(el, traveler) {
    el.title = traveler.name;
    if (traveler.image) { el.style.backgroundImage = `url("${traveler.image.replaceAll('"','%22')}")`; el.textContent = ''; }
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function goto(id) {
    closeSheet();
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const selected = btn.dataset.nav === id;
      btn.classList.toggle('selected', selected);
      if (selected) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
    });
    window.scrollTo({top:0,behavior:'instant'});
    if (id === 'map-view') { ensureMap(); setTimeout(() => { map.invalidateSize(); fitRoute(); }, 60); }
  }
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', ev => {ev.preventDefault();goto(el.dataset.nav);}));
  $('start-btn').addEventListener('click', () => startReveal());
  $('view-stops').addEventListener('click', () => goto('stops'));

  function ensureMap() {
    if (map) return;
    if (!window.L) { $('map').innerHTML = '<p style="padding:24px">The map could not load. Please check your internet connection.</p>'; return; }
    map = L.map('map', {zoomControl:true, scrollWheelZoom:false, tap:true}).setView([53.3,-8],7);
    // Community OSM tiles: small personal use only. Keep attribution visible.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:18, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    }).addTo(map);
    const coords = stops.map(s => [s.lat,s.lng]);
    routeLayer = L.polyline(coords,{color:'#fff8ea',weight:9,opacity:.95,lineCap:'round'}).addTo(map);
    L.polyline(coords,{color:'#d39a72',weight:4,dashArray:'3,11',lineCap:'round',opacity:1}).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    stops.forEach((s,index) => {
      const pin = L.divIcon({className:'pin-marker',html:String(index+1),iconSize:[38,38],iconAnchor:[19,19]});
      const marker = L.marker([s.lat,s.lng],{icon:pin,title:s.title}).addTo(markerLayer);
      marker.getElement().style.background=s.color;
      marker.on('click',()=>openSheet(index));
    });
    fitRoute();
  }
  function fitRoute() {
    if (map && routeLayer && stops.length) map.fitBounds(routeLayer.getBounds().pad(.22),{animate:true,maxZoom:8});
  }
  $('fit-map').addEventListener('click',fitRoute);

  function buildTimeline() {
    $('stops-list').innerHTML = stops.map((s,i) => `<div class="timeline-row">
      <div class="timeline-axis"><div class="timeline-number" style="background:${s.color}">${i+1}</div>${i<stops.length-1?'<div class="timeline-line"></div>':''}</div>
      <div class="timeline-content"><h3>${escapeHTML(s.title)} <span aria-hidden="true">${escapeHTML(s.icon)}</span></h3><p>${escapeHTML(s.description)}</p><button class="stop-link" data-stop="${i}">Explore stop →</button></div></div>`).join('');
    $('stops-list').querySelectorAll('[data-stop]').forEach(btn=>btn.addEventListener('click',()=>openSheet(Number(btn.dataset.stop))));
  }
  buildTimeline();
  function openSheet(index) {
    activeStop = (index+stops.length)%stops.length;
    const s=stops[activeStop];
    const mapsURL=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.lat+','+s.lng)}`;
    $('sheet-content').innerHTML = `<div class="sheet-img" style="background:linear-gradient(140deg,${s.color},#a8c89d)">${s.image?`<img src="${escapeHTML(s.image)}" alt="${escapeHTML(s.title)}" loading="lazy"/>`:`<span aria-hidden="true">${escapeHTML(s.icon)}</span><span class="photo-placeholder">PHOTO COMING SOON ✦</span>`}</div>
    <div class="sheet-body"><span class="stop-tag">STOP NO. ${String(activeStop+1).padStart(2,'0')}</span><h3 id="sheet-title">${escapeHTML(s.title)}</h3><p class="region">⌖ ${escapeHTML(s.region)}, Ireland</p>
    <p class="description">${escapeHTML(s.description)}</p><div class="dedication"><strong>♡ A little note for you</strong>${escapeHTML(s.dedication)}</div>
    <div class="sheet-actions"><a href="${mapsURL}" target="_blank" rel="noopener noreferrer">Open in Maps ↗</a><button id="prev-stop">← Previous</button><button id="next-stop">Next →</button></div>
    <p class="sheet-counter">${activeStop+1} of ${stops.length} destinations</p></div>`;
    $('prev-stop').addEventListener('click',()=>openSheet(activeStop-1));
    $('next-stop').addEventListener('click',()=>openSheet(activeStop+1));
    $('sheet-overlay').hidden=false;
    $('stop-sheet').classList.add('open');$('stop-sheet').setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
    if (map && document.getElementById('map-view').classList.contains('active')) map.panTo([s.lat,s.lng],{animate:true});
    $('close-sheet').focus();
  }
  function closeSheet() {
    $('sheet-overlay').hidden=true;
    $('stop-sheet').classList.remove('open');$('stop-sheet').setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }
  $('close-sheet').addEventListener('click',closeSheet);
  $('sheet-overlay').addEventListener('click',closeSheet);
  document.addEventListener('keydown',ev => {
    if (ev.key==='Escape') {if (revealRunning) finishReveal(); else closeSheet();}
    if (ev.key==='ArrowRight' && $('stop-sheet').classList.contains('open')) openSheet(activeStop+1);
    if (ev.key==='ArrowLeft' && $('stop-sheet').classList.contains('open')) openSheet(activeStop-1);
  });

  // Intro runs once per browser session. Navigation remains freely available afterward.
  function startReveal() {
    goto('map-view');
    if (sessionStorage.getItem('irishAdventureRevealed')==='yes' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    revealRunning=true;const overlay=$('reveal-overlay');overlay.hidden=false;overlay.setAttribute('aria-hidden','false');
    stops.forEach((stop,i)=>{
      timers.push(setTimeout(()=>{$('reveal-name').textContent=stop.title;$('reveal-progress').textContent=`Stop ${i+1} of ${stops.length} · The adventure unfolds!`;},i*850));
    });
    timers.push(setTimeout(finishReveal,stops.length*850+500));
  }
  function finishReveal() {
    timers.forEach(clearTimeout);timers=[];revealRunning=false;
    $('reveal-overlay').hidden=true;$('reveal-overlay').setAttribute('aria-hidden','true');
    sessionStorage.setItem('irishAdventureRevealed','yes');
    if(map){map.invalidateSize();fitRoute();}
  }
  if(location.hash==='#map') goto('map-view');
  else if(location.hash==='#stops') goto('stops');
  else if(location.hash==='#message') goto('message');
})();
