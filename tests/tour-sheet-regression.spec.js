/**
 * Regressione tour: apertura cartolina dopo movimento completato e stabilità flusso.
 * Allineato all'interfaccia/stati attuali (tour guidato, finale, nav a 5 sezioni).
 */
const { test, expect } = require('@playwright/test');

const STOPS = ['Dublino', 'Glendalough', 'Galway', 'Cliffs of Moher', 'Howth'];

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

async function startOnMap(page) {
  await openFresh(page);
  await page.click('#start-btn');
  await expect(page.locator('#map-view')).toHaveClass(/active/);
  await expect(page.locator('#guide-next')).toBeVisible();
}

async function discoverNext(page, expectedTitleRe) {
  const sheetOpen = await page.locator('#stop-sheet.open').count();
  if (sheetOpen) {
    await page.locator('#sheet-advance').click();
  } else {
    await page.locator('#guide-next').click();
  }
  await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
  await expect(page.locator('#sheet-title')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#sheet-content')).not.toBeEmpty();
  if (expectedTitleRe) {
    await expect(page.locator('#sheet-title')).toContainText(expectedTitleRe, { timeout: 20000 });
  }
}

test.describe('Hotfix cartoline tour', () => {
  test('regressione: movimento completato apre la cartolina corrispondente (prima tappa)', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-next').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
    await expect(page.locator('#sheet-title')).toContainText(/Dublino/i);
    await expect(page.locator('#sheet-content')).toContainText(/Dublino/i);
    await expect(page.locator('#journey-guide')).toBeHidden();
  });

  test('prima e ultima tappa: flusso completo fino al termine', async ({ page }) => {
    await startOnMap(page);
    await discoverNext(page, /Dublino/i);
    for (let i = 1; i < STOPS.length; i++) {
      await page.locator('#sheet-advance').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
      await expect(page.locator('#sheet-title')).toContainText(new RegExp(STOPS[i], 'i'), { timeout: 20000 });
      await expect(page.locator('#sheet-content')).not.toBeEmpty();
    }
    await page.locator('#sheet-advance').click(); // termina scoperta
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/, { timeout: 15000 });
    await expect(page.locator('#journey-finale')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#journey-finale')).toContainText(/sorpresa|tappe|esplorare/i);
    await expect(page.locator('#journey-guide')).toContainText(/Viaggio svelato|Mappa libera/i);
  });

  test('scopri prossima: chiude cartolina, muove e apre la successiva', async ({ page }) => {
    await startOnMap(page);
    await discoverNext(page, /Dublino/i);
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#sheet-title')).toContainText(/Glendalough/i, { timeout: 20000 });
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/);
    await expect(page.locator('#sheet-content')).toContainText(/Glendalough/i);
  });

  test('espandi cartolina, mostra meno, chiusura e navigazione libera', async ({ page }) => {
    await startOnMap(page);
    await discoverNext(page, /Dublino/i);

    await page.locator('#sheet-toggle').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);
    await expect(page.locator('#sheet-toggle')).toContainText(/Mostra meno/i);
    await expect(page.locator('#sheet-content')).toContainText(/Dublino/i);

    await page.locator('#sheet-toggle').click();
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/expanded/);
    await expect(page.locator('#sheet-content')).toContainText(/Dublino/i);

    // Passa alla tappa successiva nel tour guidato
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#sheet-title')).toContainText(/Glendalough/i, { timeout: 20000 });
    await expect(page.locator('#sheet-content')).toContainText(/Glendalough/i);

    // Completa il tour per entrare in esplorazione libera
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#sheet-title')).toContainText(/Galway/i, { timeout: 20000 });
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#sheet-title')).toContainText(/Cliffs of Moher/i, { timeout: 20000 });
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#sheet-title')).toContainText(/Howth/i, { timeout: 20000 });
    await page.locator('#sheet-advance').click(); // termina scoperta
    await expect(page.locator('#journey-finale')).toBeVisible({ timeout: 15000 });
    await page.locator('#finale-map').click();
    await expect(page.locator('#journey-finale')).toBeHidden();
    await expect(page.locator('#journey-guide')).toContainText(/Mappa libera|Viaggio svelato/i, { timeout: 15000 });
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);

    // Chiusura e riapertura in navigazione libera
    await page.locator('#map').getByRole('button', { name: '2', exact: true }).click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 15000 });
    await expect(page.locator('#sheet-title')).toContainText(/Glendalough/i);
    await expect(page.locator('#sheet-content')).toContainText(/Glendalough/i);
    await page.locator('#close-sheet').click();
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);
  });

  test('doppi click non causano avanzamenti incoerenti', async ({ page }) => {
    await startOnMap(page);
    const next = page.locator('#guide-next');
    await next.dblclick({ delay: 20 }).catch(async () => {
      await next.click({ clickCount: 2, delay: 10 }).catch(() => {});
    });
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
    const title = (await page.locator('#sheet-title').textContent()) || '';
    expect(/Dublino|Galway/i.test(title)).toBeTruthy();
    // Nessuna seconda cartolina/overlay incoerente: una sola sheet presente e contenuto visibile
    await expect(page.locator('.stop-sheet')).toHaveCount(1);
    await expect(page.locator('#sheet-content')).not.toBeEmpty();
  });

  test('cambio sezione: nessuna cartolina fuori vista e stato riprendibile', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-next').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });

    await page.locator('.nav-btn[data-nav="stops"]').click();
    await expect(page.locator('#stops')).toHaveClass(/active/);
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);
    await expect(page.locator('#journey-guide')).toBeHidden();

    await page.locator('.nav-btn[data-nav="home"]').click();
    await expect(page.locator('#home')).toHaveClass(/active/);
    await expect(page.locator('#start-btn')).toContainText(/Continua|Riprendi|Scopri|Rivedi/i);

    await page.locator('#start-btn').click(); // continua/riprendi
    await expect(page.locator('#map-view')).toHaveClass(/active/);
    await expect(page.locator('#journey-guide')).toBeVisible({ timeout: 15000 });
  });

  test('movimento annullato/interruzione reale non apre cartolina obsoleta', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-next').click();
    // interrompi rapidamente durante il movimento/spostamento contesto
    await page.locator('.nav-btn[data-nav="home"]').click();
    await expect(page.locator('#home')).toHaveClass(/active/);
    await expect(page.locator('#journey-guide')).toBeHidden();
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);
  });

  test('ripetizione della sorpresa e esplorazione libera', async ({ page }) => {
    await startOnMap(page);
    // completa rapidamente passando in esplorazione libera
    await page.locator('#guide-skip').click(); // Esplora liberamente
    await expect(page.locator('#journey-guide')).toContainText(/Mappa libera|Viaggio/i, { timeout: 15000 });

    // ripeti la sorpresa
    await page.locator('#guide-skip').click(); // Rivivi ↺
    await expect(page.locator('#guide-next')).toContainText(/Scopri la prima tappa/i, { timeout: 15000 });
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);

    await discoverNext(page, /Dublino/i);
    await expect(page.locator('#sheet-content')).toContainText(/Dublino/i);
  });

  test('ripresa di un tour interrotto', async ({ page }) => {
    await startOnMap(page);
    await discoverNext(page, /Dublino/i);

    await page.locator('.nav-btn[data-nav="home"]').click();
    await expect(page.locator('#home')).toHaveClass(/active/);
    await expect(page.locator('#start-btn')).toContainText(/Continua|Riprendi/i);

    await page.locator('#start-btn').click();
    await expect(page.locator('#map-view')).toHaveClass(/active/);
    await expect(page.locator('#journey-guide')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#journey-guide')).toContainText(/Scopri la prossima tappa|Continua quando vuoi|Tappa|Sorpresa/i);
  });
});
