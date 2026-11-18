/**
 * siViaggiamo v1.7.1 — Howth Seal Surprise.
 * Copre il richiamo nella cartolina di Howth, il dialog condiviso con la Guida,
 * la preservazione dello stato del viaggio e le regole di overlay/accessibilità.
 * Eseguito sia su desktop sia su mobile.
 */
const { test, expect } = require('@playwright/test');

const MEME = /martina-foche-meme\.webp/;
const STORAGE_KEY = 'siViaggiamoJourneyState';

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

async function reachHowth(page) {
  await openFresh(page);
  await page.click('#start-btn');
  for (let i = 0; i < 5; i++) {
    if (i === 0) await page.locator('#guide-next').click();
    else await page.locator('#sheet-advance').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
  }
  await expect(page.locator('#sheet-title')).toHaveText('Howth');
}

async function journeySnapshot(page) {
  return page.evaluate((key) => {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch {}
    return {
      saved,
      title: document.getElementById('sheet-title')?.textContent || '',
      advance: document.getElementById('sheet-advance')?.textContent || '',
      sheetOpen: document.getElementById('stop-sheet')?.classList.contains('open') || false,
      finaleHidden: document.getElementById('journey-finale')?.hidden ?? true,
      sheetCount: document.querySelectorAll('.stop-sheet').length,
      dialogCount: document.querySelectorAll('.seal-dialog').length,
    };
  }, STORAGE_KEY);
}

test.describe('v1.7.1 — Howth Seal Surprise', () => {
  test('quinta tappa: richiamo compatto visibile senza sostituire "Termina la scoperta"', async ({ page }) => {
    await reachHowth(page);
    await expect(page.locator('#sheet-title')).toHaveText('Howth');
    await expect(page.locator('.seal-teaser-title')).toHaveText('Avvistamento sospetto! 🦭');
    await expect(page.locator('.seal-teaser-text')).toHaveText('Pare che sulle coste di Howth siano stati avvistati due esemplari piuttosto familiari…');
    await expect(page.locator('#sheet-seal-surprise')).toBeVisible();
    await expect(page.locator('#sheet-seal-surprise')).toHaveText('Ops… chi abbiamo trovato? 🦭');
    await expect(page.locator('#sheet-advance')).toBeVisible();
    await expect(page.locator('#sheet-advance')).toHaveText('Termina la scoperta');
    await expect(page.locator('.stop-sheet')).toHaveCount(1);
    await expect(page.locator('#seal-dialog')).toBeHidden();
  });

  test('popup: copy, immagine, ARIA e blocco della navigazione sottostante', async ({ page }) => {
    await reachHowth(page);
    await page.locator('#sheet-seal-surprise').click();

    const dialog = page.locator('#seal-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#seal-scrim')).toBeVisible();
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('#seal-dialog-title')).toHaveText('OPS… BECCATE! 🦭');
    await expect(page.locator('#seal-dialog .eyebrow')).toHaveText('AVVISTAMENTO STRAORDINARIO');
    await expect(page.locator('#seal-dialog-text')).toHaveText('Due rarissime foche sono state individuate sulla costa irlandese. Gli esperti sostengono che somiglino in modo inquietante a Martina e Lorenza.');
    await expect(page.locator('#seal-return')).toHaveText('Torniamo al viaggio →');

    const img = await page.locator('#seal-photo-img').evaluate((el) => ({
      complete: el.complete,
      nw: el.naturalWidth,
      nh: el.naturalHeight,
      // clientWidth/clientHeight escludono bordo e rotazione scrapbook:
      // confrontano il contenuto effettivo dell'immagine, non il rettangolo ruotato.
      w: el.clientWidth,
      h: el.clientHeight,
      fit: getComputedStyle(el).objectFit,
      src: el.getAttribute('src'),
    }));
    expect(img.complete && img.nw > 0, 'meme non caricato').toBeTruthy();
    expect(img.src).toMatch(MEME);
    expect(img.fit).toBe('contain');
    expect(Math.abs((img.w / img.h) - (img.nw / img.nh)), 'proporzioni del meme alterate').toBeLessThan(0.02);
    expect(img.w, 'meme troppo piccolo per essere riconoscibile').toBeGreaterThan(250);

    const hit = await page.evaluate(() => {
      const r = document.querySelector('.bottom-nav').getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        inNav: !!el?.closest?.('.bottom-nav'),
        blocked: el?.id === 'seal-scrim' || !!el?.closest?.('#seal-dialog'),
      };
    });
    expect(hit.inNav, 'la nav non deve essere raggiungibile con il popup aperto').toBe(false);
    expect(hit.blocked).toBe(true);
    await expect(page.locator('.seal-dialog')).toHaveCount(1);
  });

  test('"Torniamo al viaggio" non avanza: cartolina, stato e finale invariati', async ({ page }) => {
    await reachHowth(page);
    const before = await journeySnapshot(page);
    expect(before.saved.revealed).toBe(5);
    expect(before.saved.mode).toBe('stop-revealed');
    expect(before.advance).toBe('Termina la scoperta');

    await page.locator('#sheet-seal-surprise').click();
    await expect(page.locator('#seal-dialog')).toBeVisible();
    await page.locator('#seal-return').click();

    await expect(page.locator('#seal-dialog')).toBeHidden();
    await expect(page.locator('#seal-scrim')).toBeHidden();
    const after = await journeySnapshot(page);
    expect(after).toEqual(before);
    await expect(page.locator('#sheet-title')).toHaveText('Howth');
    await expect(page.locator('#sheet-advance')).toBeVisible();
    await expect(page.locator('#journey-finale')).toBeHidden();

    // Il viaggio può proseguire normalmente.
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#journey-finale')).toBeVisible({ timeout: 15000 });
  });

  test('Escape chiude il popup e restituisce il focus al pulsante di origine', async ({ page }) => {
    await reachHowth(page);
    await page.locator('#sheet-seal-surprise').click();
    await expect(page.locator('#seal-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#seal-dialog')).toBeHidden();
    await expect(page.locator('#seal-scrim')).toBeHidden();
    await expect(page.locator('#sheet-seal-surprise')).toBeFocused();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/);
    const hit = await page.evaluate(() => {
      const r = document.querySelector('.bottom-nav').getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!el?.closest?.('.nav-btn');
    });
    expect(hit, 'overlay residuo sopra la nav').toBe(true);
  });

  test('focus iniziale e trap da tastiera dentro il dialog', async ({ page }) => {
    await reachHowth(page);
    await page.locator('#sheet-seal-surprise').click();
    await expect(page.locator('#seal-return')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#seal-close')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#seal-return')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#seal-close')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#seal-return')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#seal-dialog')).toBeHidden();
    await expect(page.locator('#sheet-seal-surprise')).toBeFocused();
  });

  test('esplorazione libera: il popup si riapre senza duplicare la cartolina', async ({ page }) => {
    await reachHowth(page);
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#journey-finale')).toBeVisible();
    await page.locator('#finale-map').click();
    await expect(page.locator('#journey-finale')).toBeHidden();

    await page.locator('.nav-btn[data-nav="stops"]').click();
    await page.locator('#stops-list [data-stop="4"]').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
    await expect(page.locator('#sheet-title')).toHaveText('Howth');
    const before = await journeySnapshot(page);
    expect(before.saved.mode).toBe('free-exploration');

    await page.locator('#sheet-seal-surprise').click();
    await expect(page.locator('#seal-dialog')).toBeVisible();
    await page.locator('#seal-close').click();
    await expect(page.locator('#seal-dialog')).toBeHidden();

    const after = await journeySnapshot(page);
    expect(after).toEqual(before);
    await expect(page.locator('.stop-sheet')).toHaveCount(1);
    await expect(page.locator('.seal-dialog')).toHaveCount(1);
    await expect(page.locator('#sheet-seal-surprise')).toBeFocused();
  });

  test('Guida di Howth usa lo stesso dialog e non lascia overlay residui', async ({ page }) => {
    await openFresh(page);
    await page.locator('.nav-btn[data-nav="stops"]').click();
    await page.locator('[data-guide-dest="howth"]').click();
    await expect(page.locator('#howth-easter-egg')).toBeVisible();
    await page.locator('#easter-egg-toggle').click();

    await expect(page.locator('#seal-dialog')).toBeVisible();
    await expect(page.locator('#seal-dialog-title')).toHaveText('OPS… BECCATE! 🦭');
    await expect(page.locator('#seal-photo-img')).toHaveAttribute('src', MEME);
    await expect(page.locator('#seal-return')).toBeVisible();
    await page.locator('#seal-return').click();

    await expect(page.locator('#seal-dialog')).toBeHidden();
    await expect(page.locator('#seal-scrim')).toBeHidden();
    await expect(page.locator('#easter-egg-toggle')).toBeFocused();
    await expect(page.locator('#easter-egg-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => window.TRIP.destinations.length)).toBe(5);
  });

  test('mobile: popup dentro il viewport, immagine intera e nessuno scroll orizzontale', async ({ page }) => {
    await reachHowth(page);
    await page.locator('#sheet-seal-surprise').click();
    await expect(page.locator('#seal-dialog')).toBeVisible();

    const geo = await page.evaluate(() => {
      const card = document.querySelector('.seal-card').getBoundingClientRect();
      const img = document.getElementById('seal-photo-img').getBoundingClientRect();
      return {
        vh: innerHeight,
        vw: innerWidth,
        cardTop: card.top,
        cardBottom: card.bottom,
        cardHeight: card.height,
        imgTop: img.top,
        imgBottom: img.bottom,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    expect(geo.cardTop, 'popup tagliato in alto').toBeGreaterThanOrEqual(0);
    expect(geo.cardBottom, 'popup tagliato in basso/sotto la nav').toBeLessThanOrEqual(geo.vh);
    expect(geo.cardHeight).toBeLessThan(geo.vh - 20);
    expect(geo.imgTop).toBeGreaterThanOrEqual(geo.cardTop);
    expect(geo.imgBottom).toBeLessThanOrEqual(geo.cardBottom);
    expect(geo.scrollWidth).toBeLessThanOrEqual(geo.clientWidth);

    await page.locator('#seal-return').click();
    await expect(page.locator('#seal-dialog')).toBeHidden();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/);
    await expect(page.locator('#sheet-advance')).toHaveText('Termina la scoperta');
  });
});
