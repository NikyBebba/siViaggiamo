/**
 * siViaggiamo v1.7 — Ireland Edition.
 * Verifiche sui contenuti reali, sull'easter egg, sulla migrazione dello stato
 * e sull'assenza di errori JS. Eseguito sia su desktop sia su mobile.
 */
const { test, expect } = require('@playwright/test');

const EXPECTED_STOPS = ['Dublino', 'Glendalough', 'Galway', 'Cliffs of Moher', 'Howth'];
const SIGNATURE = 'dublino|glendalough|galway|cliffs|howth';

const PUBLIC_ASSETS = [
  'assets/images/avatar-martina.webp',
  'assets/images/avatar-lorenza.webp',
  'assets/images/dublino-hapenny-bridge.webp',
  'assets/images/cliffs-of-moher-panorama.webp',
  'assets/images/glendalough-lago-paesaggio.webp',
  'assets/images/galway-quartiere-latino.webp',
  'assets/images/howth-cliff-walk.webp',
  'assets/images/galway-market-insegna.webp',
  'assets/images/howth-east-pier-lighthouse.webp',
  'assets/images/martina-foche-meme.webp',
];

async function openFresh(page) {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear(); } catch {}
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // app.js ha completato l'init (ticket-action viene popolato sincronicamente)
  await page.waitForFunction(() => {
    const el = document.getElementById('ticket-action');
    return !!el && el.textContent.trim().length > 0;
  });
}

async function attachErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console:${msg.text()}`); });
  return errors;
}

async function waitAppReady(page) {
  await page.waitForFunction(() => {
    const el = document.getElementById('ticket-action');
    return !!el && el.textContent.trim().length > 0;
  });
}

async function startOnMap(page) {
  await openFresh(page);
  await page.click('#start-btn');
  await expect(page.locator('#map-view')).toHaveClass(/active/);
}

test.describe('siViaggiamo v1.7 — Ireland Edition', () => {
  test('Home: foto Temple Bar, contenitori reali e CTA dinamico', async ({ page }) => {
    await openFresh(page);
    await expect(page.locator('#home')).toContainText(/Irlanda · 5–10 maggio 2027/);
    await expect(page.locator('#home')).toContainText(/Martina e Lorenza/);
    await expect(page.locator('#start-btn')).toContainText('Scopri la sorpresa');

    // La Home non duplica più i soggetti della foto principale con gli avatar.
    await expect(page.locator('#home .travelers')).toHaveCount(0);
    const photo = await page.locator('.hero-photo').evaluate((img) => ({
      src: img.getAttribute('src'),
      w: img.naturalWidth,
      h: img.naturalHeight,
      fit: getComputedStyle(img).objectFit,
    }));
    expect(photo.src).toMatch(/home-temple-bar\.webp/);
    expect(photo.w).toBe(1536);
    expect(photo.h).toBe(1024);
    expect(photo.fit).toBe('cover');

    // Gli avatar restano nella topbar (e negli asset, riutilizzabili altrove).
    const avatars = await page.locator('.friends .avatar img').evaluateAll((imgs) => imgs.map((img) => ({
      src: img.getAttribute('src') || '',
      width: img.naturalWidth,
      objectFit: getComputedStyle(img).objectFit,
      alt: img.getAttribute('alt') || '',
    })));
    expect(avatars).toHaveLength(2);
    avatars.forEach((a) => {
      expect(a.width, `avatar non caricato: ${a.src}`).toBeGreaterThan(0);
      expect(a.objectFit).toBe('cover');
      expect(a.alt).toMatch(/Martina|Lorenza/);
      expect(a.src).toMatch(/avatar-(martina|lorenza)\.webp/);
    });
  });

  test('Dati: cinque destinazioni, sei giornate, Dublino non duplicata', async ({ page }) => {
    await openFresh(page);
    const model = await page.evaluate(() => ({
      destinations: (window.TRIP.destinations || []).map((d) => d.title),
      dayIds: (window.TRIP.days || []).map((d) => d.destinationId),
    }));
    expect(model.destinations).toEqual(EXPECTED_STOPS);
    expect(model.dayIds).toEqual(['dublino', 'glendalough', 'galway', 'cliffs', 'howth', 'dublino']);
    expect(model.dayIds).toHaveLength(6);
    // Il rientro a Dublino del 9/10 maggio NON crea una sesta destinazione.
    expect(new Set(model.dayIds).size).toBe(5);

    await page.locator('.nav-btn[data-nav="stops"]').click();
    await expect(page.locator('#days-list .day-card')).toHaveCount(6);
    await expect(page.locator('#days-list')).toContainText('5 maggio');
    await expect(page.locator('#days-list')).toContainText('10 maggio');
    await expect(page.locator('#days-list')).toContainText('Glendalough');
    await expect(page.locator('#days-list')).toContainText('Cliffs of Moher');
    await expect(page.locator('#days-list')).toContainText('Howth');
    // Le cartoline restano cinque.
    await expect(page.locator('#stops-list .timeline-card')).toHaveCount(5);
  });

  test('Mappa: esattamente cinque pin in esplorazione libera', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-skip').click(); // Esplora liberamente
    await expect(page.locator('#journey-guide')).toContainText(/Mappa libera|Viaggio · 5\/5/i);
    await expect(page.locator('#map .pin-marker')).toHaveCount(5);
    await expect(page.locator('#trip-progress')).toContainText('5/5');
  });

  test('Guida: contenuti reali, link ufficiali, nessun testo dimostrativo o prezzi', async ({ page }) => {
    await openFresh(page);
    await page.locator('.nav-btn[data-nav="guide-view"]').click();
    await expect(page.locator('#guide-cats .guide-cat')).toHaveCount(5); // Tutte + 4 categorie
    await expect(page.locator('#guide-results')).toContainText(/St\. Patrick/);
    await expect(page.locator('#guide-results')).toContainText(/Journey Planner|Transport for Ireland/i);
    await expect(page.locator('#guide-results')).toContainText(/Leap Card/i);
    await expect(page.locator('#guide-results')).toContainText(/Irish Rail/i);
    await expect(page.locator('#guide-results')).toContainText(/St\. Kevin/);
    await expect(page.locator('#guide-results')).not.toContainText(/dimostrativo|segnaposto/i);
    await expect(page.locator('#guide-results')).not.toContainText(/€|prezzo|tariffa/i);
    await expect(page.locator('#ticket-action')).toContainText(/Biglietto in preparazione/i, { timeout: 10000 });
  });

  test('Collegamento Mappa ↔ Guida dalla cartolina e dalla giornata', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-skip').click();
    await page.locator('#map .pin-marker').nth(2).click(); // Galway
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 15000 });
    await expect(page.locator('#sheet-title')).toContainText(/Galway/i);
    await page.locator('#sheet-toggle').click(); // il link alla Guida è nella cartolina espansa
    await page.locator('#sheet-open-guide').click();
    await expect(page.locator('#guide-view')).toHaveClass(/active/);
    await expect(page.locator('.guide-filter-note')).toContainText(/Galway/i);

    // Dalla Guida si torna alla Mappa tramite "Vedi sulla mappa" (POI con coordinate).
    await page.locator('#guide-search').fill('Ha’penny');
    const mapBtn = page.locator('#guide-results [data-map-item]').first();
    if (await mapBtn.count()) {
      await mapBtn.click();
      await expect(page.locator('#map-view')).toHaveClass(/active/);
    }

    // Dalle Giornate si apre la Guida filtrata per destinazione.
    await page.locator('.nav-btn[data-nav="stops"]').click();
    await page.locator('[data-guide-dest="howth"]').click();
    await expect(page.locator('#guide-view')).toHaveClass(/active/);
    await expect(page.locator('.guide-filter-note')).toContainText(/Howth/i);
  });

  test('Easter egg: solo nella Guida di Howth, copy esatta, tastiera e nessuna nuova tappa', async ({ page }) => {
    await openFresh(page);
    await page.locator('.nav-btn[data-nav="guide-view"]').click();
    await expect(page.locator('#howth-easter-egg')).toBeHidden(); // fuori contesto

    await page.locator('.nav-btn[data-nav="stops"]').click();
    await page.locator('[data-guide-dest="howth"]').click();
    await expect(page.locator('#guide-view')).toHaveClass(/active/);
    await expect(page.locator('#howth-easter-egg')).toBeVisible();
    await expect(page.locator('#easter-egg-title')).toHaveText('Avvistamento raro a Howth 🦭');
    await expect(page.locator('#easter-egg-text')).toHaveText('Le autorità locali segnalano due esemplari particolarmente sospetti sulle coste irlandesi.');
    await expect(page.locator('#easter-egg-toggle')).toHaveText('Ops… chi abbiamo trovato? 🦭');
    await expect(page.locator('#easter-egg-toggle')).toHaveAttribute('aria-controls', 'seal-dialog');
    await expect(page.locator('#easter-egg-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#seal-dialog')).toBeHidden();

    // Rivelazione tramite bottone (accessibile da tastiera) nello stesso dialog della cartolina.
    await page.locator('#easter-egg-toggle').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#seal-dialog')).toBeVisible();
    await expect(page.locator('#easter-egg-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#seal-photo-img')).toHaveAttribute('src', /martina-foche-meme\.webp/);
    await expect(page.locator('#seal-dialog-title')).toHaveText('OPS… BECCATE! 🦭');

    // Escape richiude, nessun overlay permanente.
    await page.keyboard.press('Escape');
    await expect(page.locator('#seal-dialog')).toBeHidden();
    await expect(page.locator('#seal-scrim')).toBeHidden();
    await expect(page.locator('#easter-egg-toggle')).toHaveAttribute('aria-expanded', 'false');

    // Uscendo dalla Guida l'uovo sparisce e non è una destinazione.
    await page.locator('.nav-btn[data-nav="home"]').click();
    await expect(page.locator('#howth-easter-egg')).toBeHidden();
    expect(await page.evaluate(() => window.TRIP.destinations.length)).toBe(5);
  });

  test('sessionStorage: sessione v1.6 scartata, payload v2 valido, firma errata ignorata', async ({ page }) => {
    // Nessun initScript: vogliamo controllare manualmente lo storage.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitAppReady(page);

    await page.evaluate(() => {
      sessionStorage.setItem('siViaggiamoJourneyState', JSON.stringify({ v: 1, revealed: 4, mode: 'free-exploration', activeStop: 3 }));
      sessionStorage.setItem('siViaggiamoIntroduzioneCompletata', 'yes');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitAppReady(page);
    expect(await page.evaluate(() => sessionStorage.getItem('siViaggiamoJourneyState'))).toBeNull();
    expect(await page.evaluate(() => sessionStorage.getItem('siViaggiamoIntroduzioneCompletata'))).toBeNull();
    await expect(page.locator('#start-btn')).toContainText('Scopri la sorpresa');

    // Uno stato scritto dalla v1.7 è versionato e firma le destinazioni.
    await page.locator('#start-btn').click();
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('siViaggiamoJourneyState')));
    expect(saved.v).toBe(2);
    expect(saved.stopSignature).toBe(SIGNATURE);

    // Una firma non corrispondente non può produrre uno stato impossibile.
    await page.evaluate(() => {
      sessionStorage.setItem('siViaggiamoJourneyState', JSON.stringify({ v: 2, stopSignature: 'old|four|stops', revealed: 5, mode: 'free-exploration' }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitAppReady(page);
    expect(await page.evaluate(() => sessionStorage.getItem('siViaggiamoJourneyState'))).toBeNull();
    await expect(page.locator('#start-btn')).toContainText('Scopri la sorpresa');
  });

  test('Preferiti della Guida persistenti dopo ricarica', async ({ page }) => {
    // Nessun initScript che pulisce lo storage: i preferiti devono sopravvivere al reload.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitAppReady(page);
    await page.locator('.nav-btn[data-nav="guide-view"]').click();
    const fav = page.locator('#guide-results [data-fav]').first();
    const id = await fav.getAttribute('data-fav');
    expect(id).toBeTruthy();
    await fav.click();
    await expect(page.locator(`[data-fav="${id}"]`)).toHaveAttribute('aria-pressed', 'true');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitAppReady(page);
    await page.locator('.nav-btn[data-nav="guide-view"]').click();
    await expect(page.locator(`[data-fav="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    // La rimozione funziona e non lascia stati residui.
    await page.locator(`[data-fav="${id}"]`).click();
    await expect(page.locator(`[data-fav="${id}"]`)).toHaveAttribute('aria-pressed', 'false');
  });

  test('Tutti gli asset pubblici sono presenti', async ({ page }) => {
    await openFresh(page);
    for (const asset of PUBLIC_ASSETS) {
      const res = await page.request.get(asset);
      expect(res.ok(), `asset mancante: ${asset}`).toBeTruthy();
      expect(res.headers()['content-type'] || '').toMatch(/image|webp/i);
    }
  });

  test('Nessun errore JS navigando tutte le sezioni', async ({ page }) => {
    const errors = await attachErrors(page);
    await openFresh(page);
    for (const nav of ['map-view', 'stops', 'guide-view', 'message', 'home']) {
      await page.locator(`.nav-btn[data-nav="${nav}"]`).click();
      await expect(page.locator(`#${nav}`)).toHaveClass(/active/);
    }
    // Esplorazione libera + cartolina: nessun errore nemmeno con mappa e sheet attivi.
    await page.locator('.nav-btn[data-nav="map-view"]').click();
    await page.locator('#guide-skip').click();
    await expect(page.locator('#map .pin-marker')).toHaveCount(5);
    const fatal = errors.filter((e) => !/net::ERR_|Failed to load resource|favicon/i.test(e));
    expect(fatal, `errori JS: ${fatal.join(' | ')}`).toEqual([]);
  });
});
