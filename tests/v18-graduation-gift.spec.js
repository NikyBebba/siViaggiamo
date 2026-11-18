/**
 * siViaggiamo v1.8 — Graduation Gift & Final Experience.
 *
 * Copre il nuovo finale, la mappa libera essenziale, il biglietto regalo
 * nella Dedica, il PDF realmente scaricabile e il pulsante Rivivi.
 * Eseguito su chromium-desktop e chromium-mobile.
 */
const { test, expect } = require('@playwright/test');

const STORAGE_KEY = 'siViaggiamoJourneyState';
const FAV_KEY = 'siViaggiamoGuideFavorites';
const PDF_PATH = '/assets/downloads/biglietto-martina.pdf';

async function waitReady(page) {
  await page.waitForFunction(() => {
    const a = document.getElementById('gift-ticket-action');
    const b = document.getElementById('ticket-action');
    return !!a && !!b && a.textContent.trim().length > 0 && b.textContent.trim().length > 0;
  });
}

// Nessun addInitScript: i test che ricaricano la pagina devono conservare lo stato.
async function openFresh(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try { sessionStorage.clear(); localStorage.clear(); } catch (_) {}
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitReady(page);
}

function attachErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console:${msg.text()}`); });
  return errors;
}

function fatalErrors(errors) {
  return errors.filter((e) => !/net::ERR_|Failed to load resource|favicon|tile\.openstreetmap/i.test(e));
}

async function completeTour(page) {
  await openFresh(page);
  await page.locator('#start-btn').click();
  await expect(page.locator('#map-view')).toHaveClass(/active/);
  for (let i = 0; i < 5; i++) {
    if (i === 0) await page.locator('#guide-next').click();
    else await page.locator('#sheet-advance').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
  }
  await page.locator('#sheet-advance').click();
  await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/, { timeout: 15000 });
  await expect(page.locator('#journey-finale')).toBeVisible({ timeout: 15000 });
}

async function savedState(page) {
  return page.evaluate((key) => {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) { return null; }
  }, STORAGE_KEY);
}

test.describe('v1.8 — Graduation Gift & Final Experience', () => {
  test('finale: copy esatta, due CTA, nessun Continua/Rivivi e mostrato una sola volta', async ({ page }) => {
    const errors = attachErrors(page);
    await completeTour(page);

    const finale = page.locator('#journey-finale');
    await expect(finale.locator('#finale-title')).toHaveText('Viaggio svelato! 🇮🇪');
    await expect(finale).toContainText("Cinque destinazioni, sei giorni e un'avventura tutta da vivere. Ma la sorpresa non finisce qui…");
    await expect(finale.locator('#finale-ticket')).toHaveText('Scopri il tuo biglietto 🎟️');
    await expect(finale.locator('#finale-map')).toHaveText('Esplora la mappa');
    await expect(finale).not.toContainText(/Continua|Rivivi/i);
    await expect(finale.locator('#finale-message')).toHaveCount(0);

    await finale.locator('#finale-ticket').click();
    await expect(finale).toBeHidden();
    await expect(page.locator('#message')).toHaveClass(/active/);

    // Navigazione e refresh: il finale non deve riaprirsi.
    for (const nav of ['map-view', 'home', 'message', 'map-view']) {
      await page.locator(`.nav-btn[data-nav="${nav}"]`).click();
      await expect(finale).toBeHidden();
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await expect(finale).toBeHidden();
    // Dopo il refresh si ricomincia dalla Home: lo stato completato resta, ma
    // il controllo "Rivivi" è visibile solo entrando nella Mappa.
    await page.locator('.nav-btn[data-nav="map-view"]').click();
    await expect(page.locator('#map-view')).toHaveClass(/active/);
    await expect(page.locator('#guide-skip')).toBeVisible();
    await expect(page.locator('#guide-skip')).toHaveText('Rivivi ↺');
    expect(fatalErrors(errors)).toEqual([]);
  });

  test('CTA principale: apre la Dedica, porta al biglietto, gestisce il focus e non scarica nulla', async ({ page }) => {
    const errors = attachErrors(page);
    await completeTour(page);
    const pagesBefore = page.context().pages().length;
    const downloads = [];
    page.on('download', (d) => downloads.push(d));

    await page.locator('#finale-ticket').click();
    await expect(page.locator('#message')).toHaveClass(/active/);
    await expect(page.locator('#gift-ticket-preview')).toBeInViewport({ ratio: 0.2 });
    const focusInside = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.id === 'gift-ticket-section' || !!el?.closest?.('#gift-ticket-section');
    });
    expect(focusInside, 'il focus deve essere sul componente biglietto').toBe(true);

    expect(page.context().pages().length, 'nessuna nuova scheda').toBe(pagesBefore);
    await page.waitForTimeout(400);
    expect(downloads, 'nessun download automatico').toEqual([]);

    const state = await savedState(page);
    expect(state.revealed).toBe(5);
    expect(state.mode).toBe('free-exploration');
    expect(state.completionAcknowledged).toBe(true);
    expect(fatalErrors(errors)).toEqual([]);
  });

  test('CTA secondaria: mappa libera senza pannello ridondante e cinque pin utilizzabili', async ({ page }) => {
    const errors = attachErrors(page);
    await completeTour(page);
    await page.locator('#finale-map').click();

    await expect(page.locator('#journey-finale')).toBeHidden();
    await expect(page.locator('#map-view')).toHaveClass(/active/);
    await expect(page.locator('#guide-skip')).toHaveText('Rivivi ↺');
    await expect(page.locator('#guide-skip')).toHaveAttribute('aria-label', 'Rivivi la scoperta guidata');
    await expect(page.locator('#guide-next')).toBeHidden();
    await expect(page.locator('#fit-map')).toBeHidden();
    await expect(page.locator('.map-help')).toBeHidden();
    await expect(page.locator('#journey-guide')).not.toContainText(/Mappa libera|Mostra tutto/i);
    // preferCanvas: true → il percorso è disegnato su canvas, non come path SVG.
    const routeCanvas = page.locator('#map .leaflet-overlay-pane canvas').first();
    await expect(routeCanvas).toBeVisible();
    const routePainted = await routeCanvas.evaluate((canvas) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
      return false;
    });
    expect(routePainted, 'il percorso deve essere disegnato sulla mappa').toBe(true);

    const pins = page.locator('#map .pin-marker');
    await expect(pins).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await pins.nth(i).click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 15000 });
      await expect(page.locator('#sheet-title')).not.toHaveText('');
      await page.locator('#close-sheet').click();
      await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);
    }
    expect(fatalErrors(errors)).toEqual([]);
  });

  test('Rivivi: resetta la scoperta, conserva preferiti e biglietto', async ({ page }) => {
    const errors = attachErrors(page);
    await completeTour(page);
    await page.locator('#finale-map').click();
    await expect(page.locator('#guide-skip')).toHaveText('Rivivi ↺');

    // Un preferito deve sopravvivere al riavvio della scoperta.
    await page.locator('.nav-btn[data-nav="guide-view"]').click();
    const fav = page.locator('#guide-results [data-fav]').first();
    const favId = await fav.getAttribute('data-fav');
    await fav.click();
    const favoritesBefore = await page.evaluate((key) => localStorage.getItem(key), FAV_KEY);
    const ticketHref = await page.locator('#ticket-action .ticket-download').getAttribute('href');
    await page.locator('.nav-btn[data-nav="map-view"]').click();

    await page.locator('#guide-skip').click();
    await expect(page.locator('#guide-next')).toHaveText('Scopri la prima tappa');
    await expect(page.locator('#guide-skip')).toHaveText('Esplora liberamente ×');
    await expect(page.locator('#guide-skip')).toHaveAttribute('aria-label', 'Esplora liberamente la mappa');
    // I pin bloccati non sono nel DOM: verifichiamo che non sia rimasto nessun
    // marker sbloccato e che lo stato guidato sia tornato a 0.
    await expect(page.locator('#map .pin-marker')).toHaveCount(0);
    const state = await savedState(page);
    expect(state.revealed).toBe(0);
    expect(state.mode).toBe('idle');
    expect(state.finalShown).toBe(false);

    expect(await page.evaluate((key) => localStorage.getItem(key), FAV_KEY)).toBe(favoritesBefore);
    expect(await page.locator('#ticket-action .ticket-download').getAttribute('href')).toBe(ticketHref);
    expect(fatalErrors(errors)).toEqual([]);
  });

  test('persistenza: refresh e ritorno dalla Dedica portano direttamente alla mappa libera', async ({ page }) => {
    await completeTour(page);
    await page.locator('#finale-map').click();
    await page.locator('.nav-btn[data-nav="message"]').click();
    await expect(page.locator('#gift-ticket-preview')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitReady(page);
    await expect(page.locator('#journey-finale')).toBeHidden();
    await page.locator('.nav-btn[data-nav="map-view"]').click();
    await expect(page.locator('#map-view')).toHaveClass(/active/);
    await expect(page.locator('#journey-finale')).toBeHidden();
    await expect(page.locator('#guide-skip')).toHaveText('Rivivi ↺');
    await expect(page.locator('#map .pin-marker')).toHaveCount(5);
    await expect(page.locator('#start-btn')).toContainText('Esplora il viaggio');
  });

  test('biglietto: anteprima nella Dedica, dati corretti, nessuno scroll orizzontale', async ({ page }) => {
    await openFresh(page);
    await page.locator('.nav-btn[data-nav="message"]').click();
    await expect(page.locator('#gift-ticket-section')).toBeVisible();
    await expect(page.locator('#gift-ticket-title')).toHaveText('Il tuo biglietto per l’Irlanda 🇮🇪');
    await expect(page.locator('#gift-ticket-occasion')).toHaveText('Regalo di laurea');
    await expect(page.locator('#gift-ticket-recipients')).toHaveText('Martina & Lorenza');
    await expect(page.locator('#gift-ticket-destination')).toHaveText('Irlanda');
    await expect(page.locator('#gift-ticket-dates')).toHaveText('05–10 maggio 2027');
    await expect(page.locator('#gift-ticket-message')).toHaveText('La prossima avventura comincia da qui.');
    await expect(page.locator('#gift-ticket-section .gift-ticket-note')).toContainText('Biglietto regalo simbolico');
    await expect(page.locator('.letter-note')).toContainText('provvisorio');

    const geo = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      ticketWidth: document.getElementById('gift-ticket-preview').getBoundingClientRect().width,
    }));
    expect(geo.scrollWidth).toBeLessThanOrEqual(geo.clientWidth);
    expect(geo.ticketWidth).toBeGreaterThan(200);
  });

  test('PDF: link reale, risposta HTTP valida e struttura PDF', async ({ page }) => {
    await openFresh(page);
    await page.locator('.nav-btn[data-nav="message"]').click();
    const link = page.locator('#gift-ticket-action .ticket-download');
    await expect(link).toBeEnabled();
    await expect(link).toHaveAttribute('href', /biglietto-martina\.pdf$/);
    await expect(link).toHaveAttribute('download', '');
    await expect(page.locator('#gift-ticket-action')).toContainText(/PDF verificato/i);

    const res = await page.request.get(PDF_PATH);
    expect(res.ok(), 'PDF non raggiungibile via HTTP').toBeTruthy();
    expect(res.headers()['content-type'] || '').toMatch(/pdf/i);
    const body = Buffer.from(await res.body());
    expect(body.length, 'PDF vuoto o fittizio').toBeGreaterThan(10000);
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(body.subarray(-1024).toString()).toContain('%%EOF');
  });

  test('popup foche: il finale resta raggiungibile e lo stato non viene alterato', async ({ page }) => {
    await openFresh(page);
    await page.locator('#start-btn').click();
    for (let i = 0; i < 5; i++) {
      if (i === 0) await page.locator('#guide-next').click();
      else await page.locator('#sheet-advance').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
      if (i === 4) {
        await expect(page.locator('#sheet-seal-surprise')).toBeVisible();
        await page.locator('#sheet-seal-surprise').click();
        await expect(page.locator('#seal-dialog')).toBeVisible();
        await page.locator('#seal-return').click();
        await expect(page.locator('#seal-dialog')).toBeHidden();
        await expect(page.locator('#sheet-advance')).toHaveText('Termina la scoperta');
      }
    }
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#journey-finale')).toBeVisible({ timeout: 15000 });
    expect((await savedState(page)).revealed).toBe(5);
  });
});
