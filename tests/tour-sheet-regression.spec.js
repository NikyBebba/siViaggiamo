/**
 * Regressione tour: apertura cartolina dopo movimento completato (hotfix advanceTour).
 * Bug: advanceTour confrontava tokenAtStart con travelToken dopo animateJourneyTo(),
 * ma animateJourneyTo() incrementa travelToken internamente => successo trattato come annullato.
 *
 * Richiede @playwright/test e un server statico sulla root del progetto.
 *   BASE_URL=http://localhost:4173 npx playwright test tests/tour-sheet-regression.spec.js
 */
const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:4173';
const STOPS = ['Dublino', 'Galway', 'Cliffs of Moher', 'Killarney'];

async function openFresh(page) {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear(); } catch {}
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
}

async function startOnMap(page) {
  await openFresh(page);
  await page.click('#start-btn');
  await expect(page.locator('#map-view')).toHaveClass(/active/);
  await expect(page.locator('#guide-next')).toBeVisible();
}

async function discoverNext(page, expectedTitleRe) {
  const sheetOpen = await page.locator('#stop-sheet.open').count();
  if (sheetOpen) await page.locator('#sheet-advance').click();
  else await page.locator('#guide-next').click();
  await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
  if (expectedTitleRe) await expect(page.locator('#sheet-title')).toContainText(expectedTitleRe, { timeout: 20000 });
}

test.describe('Hotfix cartoline tour', () => {
  test('regressione: movimento completato apre la cartolina corrispondente (prima tappa)', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-next').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
    await expect(page.locator('#sheet-title')).toContainText(/Dublino/i);
    await expect(page.locator('#journey-guide')).toBeHidden();
  });

  test('prima e ultima tappa: flusso completo fino al termine', async ({ page }) => {
    await startOnMap(page);
    for (let i = 0; i < STOPS.length; i++) {
      await discoverNext(page, new RegExp(STOPS[i], 'i'));
      if (i < STOPS.length - 1) {
        await page.locator('#sheet-advance').click();
      } else {
        await page.locator('#sheet-advance').click(); // termina scoperta
      }
    }
    await expect(page.locator('#journey-finale')).toBeVisible({ timeout: 15000 });
  });

  test('scopri prossima: chiude cartolina, muove e apre la successiva', async ({ page }) => {
    await startOnMap(page);
    await discoverNext(page, /Dublino/i);
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#sheet-title')).toContainText(/Galway/i, { timeout: 20000 });
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/);
  });

  test('espandi cartolina, mostra meno, chiusura e navigazione libera', async ({ page }) => {
    await startOnMap(page);
    await discoverNext(page, /Dublino/i);
    await page.locator('#sheet-toggle').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);
    await expect(page.locator('#sheet-toggle')).toContainText(/Mostra meno/i);
    await page.locator('#sheet-toggle').click();
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/expanded/);
    await page.locator('#sheet-advance').click();
    await discoverNext(page, /Galway/i);
    await page.locator('#close-sheet').click();
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);
  });

  test('doppi click non causano avanzamenti incoerenti', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-next').dblclick({ delay: 20 }).catch(async () => {
      await page.locator('#guide-next').click({ clickCount: 2, delay: 10 }).catch(() => {});
    });
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
    const title = await page.locator('#sheet-title').textContent();
    expect(/Dublino|Galway/i.test(title || '')).toBeTruthy();
  });

  test('cambio sezione: nessuna cartolina fuori vista e stato riprendibile', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-next').click();
    await page.locator('[data-nav="stops"]').click();
    await expect(page.locator('#stops')).toHaveClass(/active/);
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);
    await expect(page.locator('#journey-guide')).toBeHidden();
    await page.locator('[data-nav="home"]').click();
    await page.locator('#start-btn').click(); // continua
    await expect(page.locator('#map-view')).toHaveClass(/active/);
    await expect(page.locator('#journey-guide')).toBeVisible({ timeout: 15000 });
  });

  test('movimento annullato/interruzione reale non apre cartolina obsoleta', async ({ page }) => {
    await startOnMap(page);
    await page.locator('#guide-next').click();
    // interrompi cambiando sezione rapidamente
    await page.locator('[data-nav="home"]').click();
    await expect(page.locator('#journey-guide')).toBeHidden();
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);
  });

  test('ripetizione della sorpresa e esplorazione libera', async ({ page }) => {
    await startOnMap(page);
    // completa rapidamente via esplora liberamente
    await page.locator('#guide-skip').click();
    await expect(page.locator('#journey-guide')).toContainText(/Mappa libera|Viaggio/i, { timeout: 10000 });
    await page.locator('#guide-skip').click(); // rivivi
    await expect(page.locator('#guide-next')).toContainText(/Scopri la prima tappa/i, { timeout: 10000 });
    await discoverNext(page, /Dublino/i);
  });

  test('ripresa di un tour interrotto', async ({ page }) => {
    await startOnMap(page);
    await discoverNext(page, /Dublino/i);
    await page.locator('[data-nav="home"]').click();
    await expect(page.locator('#start-btn')).toContainText(/Continua/i);
    await page.locator('#start-btn').click();
    await expect(page.locator('#map-view')).toHaveClass(/active/);
    await expect(page.locator('#journey-guide')).toBeVisible({ timeout: 15000 });
  });
});
