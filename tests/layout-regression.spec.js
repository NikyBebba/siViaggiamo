/**
 * Regressione layout v1.7 — avatar fotografici e gerarchia navigazione/pannelli.
 * Verifica che i ritagli siano quadrati (nessuna deformazione), che i pannelli
 * chiusi siano realmente fuori vista e non cliccabili, e che nessun componente
 * flottante resti incastrato sotto la barra di navigazione. Eseguito su desktop e mobile.
 */
const { test, expect } = require('@playwright/test');

async function openFresh(page) {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear(); } catch {}
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const el = document.getElementById('ticket-action');
    return !!el && el.textContent.trim().length > 0;
  });
}

async function geometry(page) {
  return page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: r.top, bottom: r.bottom, left: r.left, right: r.right,
        width: r.width, height: r.height,
        visibility: cs.visibility, pointerEvents: cs.pointerEvents, display: cs.display,
      };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      nav: box('.bottom-nav'),
      sheet: box('#stop-sheet'),
      guide: box('#journey-guide'),
      finale: box('#journey-finale'),
      finaleCard: box('.journey-finale-card'),
    };
  });
}

async function openFirstPostcard(page) {
  // Stato fresco: le tappe sono bloccate, quindi si apre la prima cartolina
  // attraverso il flusso guidato (start → prima tappa).
  await page.click('#start-btn');
  await expect(page.locator('#map-view')).toHaveClass(/active/);
  await page.locator('#guide-next').click();
  await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
}

test.describe('Layout v1.7 — avatar e navigazione pulita', () => {
  test('avatar: riempiono il cerchio, object-fit cover e posizioni individuali', async ({ page }) => {
    await openFresh(page);
    const avatars = await page.locator('#home .travelers .avatar').evaluateAll((els) => els.map((el) => {
      const img = el.querySelector('img');
      const ir = img.getBoundingClientRect();
      const cs = getComputedStyle(img);
      return {
        width: ir.width,
        height: ir.height,
        position: cs.position,
        objectFit: cs.objectFit,
        objectPosition: cs.objectPosition,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      };
    }));

    expect(avatars).toHaveLength(2);
    avatars.forEach((a) => {
      expect(a.naturalWidth, 'immagine avatar non caricata').toBeGreaterThan(0);
      expect(a.naturalHeight, 'immagine avatar non caricata').toBeGreaterThan(0);
      expect(a.position, 'l\'immagine deve essere ancorata al contenitore circolare').toBe('absolute');
      expect(a.objectFit).toBe('cover');
      // Riquadro quadrato = nessuna deformazione dell'immagine sorgente.
      expect(Math.abs(a.width - a.height)).toBeLessThan(1);
      expect(a.width).toBeGreaterThan(20);
    });
    // I due volti richiedono ritagli diversi.
    expect(avatars[0].objectPosition).toBe('50% 41%');
    expect(avatars[1].objectPosition).toBe('50% 47%');
  });

  test('cartolina chiusa: fuori viewport, invisibile e non intercetta click', async ({ page }) => {
    await openFresh(page);
    await expect(page.locator('#stop-sheet')).toBeHidden();

    let g = await geometry(page);
    expect(g.sheet.top).toBeGreaterThanOrEqual(g.viewport.height);
    expect(g.sheet.visibility).toBe('hidden');
    expect(g.sheet.pointerEvents).toBe('none');

    // Dopo apertura e chiusura effettive non deve restare alcuno striscio visibile.
    await openFirstPostcard(page);
    await page.locator('#close-sheet').click();
    await expect(page.locator('#stop-sheet')).toBeHidden();
    g = await geometry(page);
    expect(g.sheet.top).toBeGreaterThanOrEqual(g.viewport.height);
    expect(g.sheet.visibility).toBe('hidden');
    expect(g.sheet.pointerEvents).toBe('none');
  });

  test('cartolina aperta: separata dalla nav e un solo pannello flottante', async ({ page }) => {
    await openFresh(page);
    await openFirstPostcard(page);
    const g = await geometry(page);
    expect(g.sheet.visibility).toBe('visible');
    expect(g.sheet.pointerEvents).toBe('auto');
    expect(g.sheet.top).toBeGreaterThanOrEqual(0);
    expect(g.sheet.bottom, 'la cartolina non deve sovrapporsi alla navigazione').toBeLessThanOrEqual(g.nav.top - 8);
    // La guida si ritira: non due pannelli sovrapposti nella Mappa.
    await expect(page.locator('#journey-guide')).toBeHidden();
  });

  test('guida di viaggio: separata dalla nav e non copre la mappa', async ({ page }) => {
    await openFresh(page);
    await page.locator('.nav-btn[data-nav="map-view"]').click();
    await expect(page.locator('#journey-guide')).toBeVisible();
    const g = await geometry(page);
    expect(g.guide.bottom).toBeLessThanOrEqual(g.nav.top - 8);
    expect(g.guide.top).toBeGreaterThan(0);
    expect(g.sheet.top).toBeGreaterThanOrEqual(g.viewport.height);
  });

  test('Mappa → Dedica → Home: nessun pannello residuo e nav cliccabile', async ({ page }) => {
    await openFresh(page);
    await openFirstPostcard(page);
    await page.locator('.nav-btn[data-nav="message"]').click();
    await expect(page.locator('#message')).toHaveClass(/active/);
    await expect(page.locator('#stop-sheet')).toBeHidden();
    await expect(page.locator('#journey-guide')).toBeHidden();
    await expect(page.locator('#journey-finale')).toBeHidden();
    expect((await page.locator('#sheet-content').textContent()).trim(), 'contenuto cartolina obsoleto').toBe('');

    // Nessun elemento invisibile intercetta i click sulla barra.
    const hit = await page.evaluate(() => {
      const r = document.querySelector('.bottom-nav').getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        tag: el?.tagName || '',
        cls: String(el?.className || ''),
        inNav: !!el?.closest?.('.bottom-nav'),
        inButton: !!el?.closest?.('.nav-btn'),
      };
    });
    expect(hit.inNav, 'sopra la barra non deve esserci alcun overlay').toBe(true);
    expect(hit.inButton, 'il click deve raggiungere un pulsante della nav').toBe(true);

    await page.locator('.nav-btn[data-nav="home"]').click();
    await expect(page.locator('#home')).toHaveClass(/active/);
    const g = await geometry(page);
    expect(g.sheet.top).toBeGreaterThanOrEqual(g.viewport.height);
    expect(g.guide.display).toBe('none');
  });

  test('finale: card separata dalla nav e chiusura completa', async ({ page }) => {
    await openFresh(page);
    await page.click('#start-btn');
    for (let i = 0; i < 5; i++) {
      if (i === 0) await page.locator('#guide-next').click();
      else await page.locator('#sheet-advance').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
    }
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#journey-finale')).toBeVisible({ timeout: 15000 });
    let g = await geometry(page);
    expect(g.finaleCard.bottom).toBeLessThanOrEqual(g.nav.top - 8);

    await page.locator('#finale-close').click();
    await expect(page.locator('#journey-finale')).toBeHidden();
    g = await geometry(page);
    expect(g.finale.display).toBe('none');
  });

  test('nessuno scroll orizzontale in tutte le sezioni', async ({ page }) => {
    await openFresh(page);
    for (const id of ['home', 'map-view', 'stops', 'guide-view', 'message']) {
      await page.locator(`.nav-btn[data-nav="${id}"]`).click();
      const g = await geometry(page);
      expect(g.scrollWidth, `scroll orizzontale in ${id}`).toBeLessThanOrEqual(g.clientWidth);
    }
  });
});
