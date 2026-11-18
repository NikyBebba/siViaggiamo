/**
 * siViaggiamo v1.7.2 — Home Photography & Postcard Visual QA
 *
 * Copre gli interventi di rifinitura fotografica senza toccare la progressione:
 *  - foto Temple Bar in Home (caricamento, proporzioni, etichetta);
 *  - assenza di asset mancanti;
 *  - configurazione `contain` + aspect ratio su tutte le cartoline, compatte ed espanse;
 *  - X sempre raggiungibile e stella decorativa ben distante;
 *  - assenza di sovrapposizioni e scroll orizzontale;
 *  - popup foche e completamento del viaggio invariati.
 *
 * Eseguito su chromium-desktop (1280x800) e chromium-mobile (390x844).
 */
const { test, expect } = require('@playwright/test');

const HOME_PHOTO = /home-temple-bar\.webp/;

const STOPS = [
  { title: 'Dublino', aspect: 16 / 9, natural: [1600, 900] },
  { title: 'Glendalough', aspect: 4 / 3, natural: [1412, 1051] },
  { title: 'Galway', aspect: 3 / 2, natural: [547, 365] },
  { title: 'Cliffs of Moher', aspect: 16 / 9, natural: [1600, 900] },
  { title: 'Howth', aspect: 16 / 10, natural: [1428, 895] },
];

async function openFresh(page) {
  await page.addInitScript(() => {
    try { sessionStorage.clear(); localStorage.clear(); } catch (_) {}
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const el = document.getElementById('ticket-action');
    return !!el && el.textContent.trim().length > 0;
  });
}

function watchAssets(page) {
  const bad = [];
  // Solo asset serviti dal sito: i tile OSM sono esterni e non pertinenti al QA.
  const local = (url) => {
    try { return new URL(url).port === '4173'; } catch (_) { return false; }
  };
  page.on('response', (r) => {
    if (local(r.url()) && r.status() >= 400 && /\.(webp|png|jpe?g|css|js)(\?|$)/i.test(r.url())) {
      bad.push(`${r.status()} ${r.url()}`);
    }
  });
  page.on('requestfailed', (r) => {
    if (local(r.url()) && /\.(webp|png|jpe?g)(\?|$)/i.test(r.url())) bad.push(`FAILED ${r.url()}`);
  });
  return bad;
}

async function firstStop(page) {
  await openFresh(page);
  await page.click('#start-btn');
  await page.locator('#guide-next').click();
  await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
}

async function expectTitle(page, title) {
  await expect(page.locator('#sheet-title')).toHaveText(title, { timeout: 20000 });
}

test.describe('v1.7.2 — Visual polish', () => {
  test('Home: foto Temple Bar caricata, proporzioni integre ed etichetta fuori dai volti', async ({ page }) => {
    const bad = watchAssets(page);
    await openFresh(page);
    await page.waitForFunction(() => {
      const img = document.querySelector('.hero-photo');
      return !!img && img.complete && img.naturalWidth > 0;
    }, null, { timeout: 15000 });

    const info = await page.evaluate(() => {
      const art = document.querySelector('.hero-art');
      const img = art.querySelector('img.hero-photo');
      const label = document.querySelector('.hero-label');
      const a = art.getBoundingClientRect();
      const l = label.getBoundingClientRect();
      return {
        src: img.getAttribute('src'),
        alt: img.getAttribute('alt') || '',
        natural: [img.naturalWidth, img.naturalHeight],
        fit: getComputedStyle(img).objectFit,
        radius: getComputedStyle(art).borderRadius,
        artRatio: a.width / a.height,
        naturalRatio: img.naturalWidth / img.naturalHeight,
        labelText: label.textContent.trim(),
        labelLeftPct: (l.left - a.left) / a.width,
        labelRightPct: (l.right - a.left) / a.width,
        labelTopPct: (l.top - a.top) / a.height,
        labelBottomPct: (l.bottom - a.top) / a.height,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(info.src).toMatch(HOME_PHOTO);
    expect(info.natural).toEqual([1536, 1024]);
    expect(info.alt).toMatch(/Martina/i);
    expect(info.alt).toMatch(/Lorenza/i);
    expect(info.alt).toMatch(/Temple Bar/i);
    expect(info.fit).toBe('cover');
    expect(parseFloat(info.radius)).toBeGreaterThan(0);
    expect(info.artRatio).toBeCloseTo(1.5, 2);
    expect(info.naturalRatio).toBeCloseTo(1.5, 3);
    // Stesso rapporto sorgente/contenitore: nessun taglio dei soggetti.
    expect(Math.abs(info.artRatio - info.naturalRatio)).toBeLessThan(0.02);
    expect(info.labelText).toContain('L’IRLANDA CI ASPETTA');
    // Box dei volti rilevato con Vision OCR sull'originale (coordinate normalizzate,
    // asse Y convertito dall'origine in basso a quella in alto): x .377-.630, y .315-.509.
    // L'etichetta non deve intersecare quel box, su nessun viewport.
    const faces = { left: 0.377, right: 0.630, top: 0.315, bottom: 0.509 };
    const label = { left: info.labelLeftPct, right: info.labelRightPct, top: info.labelTopPct, bottom: info.labelBottomPct };
    const covers = !(label.right < faces.left || label.left > faces.right || label.bottom < faces.top || label.top > faces.bottom);
    expect(covers, 'l’etichetta copre i volti').toBe(false);
    expect(info.labelBottomPct).toBeLessThanOrEqual(1);
    expect(info.overflow).toBe(0);
    expect(bad).toEqual([]);
  });

  test('Nessun asset mancante: Home più tutte le cartoline compatte ed espanse', async ({ page }) => {
    const bad = watchAssets(page);
    await firstStop(page);

    for (let i = 0; i < STOPS.length; i++) {
      await expectTitle(page, STOPS[i].title);
      // compatta
      expect(await page.locator('.sheet-compact-thumb img').evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
      // espansa
      await page.locator('#sheet-toggle').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);
      expect(await page.locator('.sheet-img img').evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
      if (i < STOPS.length - 1) await page.locator('#sheet-advance').click();
    }
    expect(bad).toEqual([]);
  });

  test('Cartoline: contain e proporzioni dichiarate per ogni destinazione (compatta + espansa)', async ({ page }) => {
    await firstStop(page);

    for (let i = 0; i < STOPS.length; i++) {
      const stop = STOPS[i];
      await expectTitle(page, stop.title);

      const compact = await page.locator('.sheet-compact-thumb img').evaluate((el) => ({
        w: el.naturalWidth,
        h: el.naturalHeight,
        fit: getComputedStyle(el).objectFit,
      }));
      expect(compact.fit).toBe('contain');
      expect(compact.w).toBe(stop.natural[0]);
      expect(compact.h).toBe(stop.natural[1]);

      await page.locator('#sheet-toggle').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);

      const expanded = await page.evaluate(() => {
        const wrap = document.querySelector('.sheet-img');
        const img = wrap.querySelector('img');
        const r = wrap.getBoundingClientRect();
        return {
          ratio: r.width / r.height,
          fit: getComputedStyle(img).objectFit,
          pos: getComputedStyle(img).objectPosition,
          maxH: parseFloat(getComputedStyle(wrap).maxHeight),
          titleVisible: !!document.getElementById('sheet-title')?.getBoundingClientRect().height,
          desc: document.querySelector('.description')?.textContent || '',
        };
      });
      expect(expanded.fit).toBe('contain');
      expect(expanded.pos).toBe('50% 50%');
      expect(expanded.ratio).toBeCloseTo(stop.aspect, 2);
      expect(expanded.maxH).toBeLessThanOrEqual(280);
      expect(expanded.titleVisible).toBe(true);
      expect(expanded.desc.trim().length).toBeGreaterThan(20);

      if (i < STOPS.length - 1) await page.locator('#sheet-advance').click();
    }
  });

  test('X e stella: X ancorata e cliccabile, stella decorativa e distante', async ({ page }) => {
    await firstStop(page);
    await page.locator('#sheet-toggle').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);
    // Il focus sull'espansione può scorrere la sheet: la X deve restare visibile.
    await page.waitForTimeout(120);

    const geo = await page.evaluate(() => {
      const sheet = document.getElementById('stop-sheet');
      const x = document.getElementById('close-sheet');
      const star = sheet.querySelector('.sheet-sticker');
      const topbar = sheet.querySelector('.sheet-topbar');
      const xr = x.getBoundingClientRect();
      const sr = star.getBoundingClientRect();
      const tr = topbar.getBoundingClientRect();
      const overlap = !(xr.right < sr.left || xr.left > sr.right || xr.bottom < sr.top || xr.top > sr.bottom);
      return {
        xVisible: xr.top >= 0 && xr.bottom <= innerHeight,
        xInsideTopbar: xr.top >= tr.top - 1 && xr.bottom <= tr.bottom + 1,
        xMinSize: Math.min(xr.width, xr.height),
        starAriaHidden: star.getAttribute('aria-hidden'),
        starTag: star.tagName,
        starPointer: getComputedStyle(star).pointerEvents,
        gap: Math.round(Math.hypot(xr.x - sr.x, xr.y - sr.y)),
        overlap,
      };
    });

    expect(geo.xVisible).toBe(true);
    expect(geo.xInsideTopbar).toBe(true);
    expect(geo.xMinSize).toBeGreaterThanOrEqual(36);
    expect(geo.starAriaHidden).toBe('true');
    expect(geo.starTag).toBe('SPAN'); // non è un controllo
    expect(geo.starPointer).toBe('none');
    expect(geo.overlap).toBe(false);
    expect(geo.gap).toBeGreaterThan(150);

    // La stella non chiude; la X sì.
    await page.evaluate(() => document.getElementById('stop-sheet').querySelector('.sheet-sticker').click());
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/);
    await page.locator('#close-sheet').click();
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);
  });

  test('Nessuna sovrapposizione con la navigazione e nessuno scroll orizzontale', async ({ page }) => {
    await firstStop(page);
    for (let i = 0; i < STOPS.length; i++) {
      await page.locator('#sheet-toggle').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);
      const geo = await page.evaluate(() => {
        const sheet = document.getElementById('stop-sheet').getBoundingClientRect();
        const nav = document.querySelector('.bottom-nav').getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          sheetBottom: Math.round(sheet.bottom),
          navTop: Math.round(nav.top),
        };
      });
      expect(geo.overflow).toBe(0);
      expect(geo.sheetBottom).toBeLessThanOrEqual(geo.navTop);
      if (i < STOPS.length - 1) await page.locator('#sheet-advance').click();
    }
  });

  test('Howth: popup foche invariato', async ({ page }) => {
    await firstStop(page);
    for (let i = 1; i < STOPS.length; i++) await page.locator('#sheet-advance').click();
    await expectTitle(page, 'Howth');
    await page.locator('#sheet-seal-surprise').click();
    await expect(page.locator('#seal-dialog')).toBeVisible();
    await page.waitForFunction(() => {
      const el = document.getElementById('seal-photo-img');
      return !!el && el.complete && el.naturalWidth > 0;
    }, null, { timeout: 15000 });
    const meme = await page.locator('#seal-photo-img').evaluate((el) => ({
      ok: el.complete && el.naturalWidth > 0,
      fit: getComputedStyle(el).objectFit,
    }));
    expect(meme.ok).toBe(true);
    expect(meme.fit).toBe('contain');
    await page.locator('#seal-return').click();
    await expect(page.locator('#seal-dialog')).toBeHidden();
    await expect(page.locator('#stop-sheet')).toHaveClass(/open/);
  });

  test('Completamento del viaggio: finale raggiungibile e stato invariato', async ({ page }) => {
    await firstStop(page);
    for (let i = 1; i < STOPS.length; i++) {
      await page.locator('#sheet-advance').click();
      await expectTitle(page, STOPS[i].title);
    }
    await page.locator('#sheet-advance').click();
    await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/, { timeout: 15000 });
    await expect(page.locator('#journey-finale')).toBeVisible({ timeout: 15000 });
    const revealed = await page.evaluate(() => {
      try { return JSON.parse(sessionStorage.getItem('siViaggiamoJourneyState') || '{}').revealed; }
      catch (_) { return null; }
    });
    expect(revealed).toBe(5);
  });

  test('Foto espanse realmente visibili: nessuna striscia da scroll', async ({ page }) => {
    await firstStop(page);
    for (let i = 0; i < STOPS.length; i++) {
      await page.locator('#sheet-toggle').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);
      await page.waitForTimeout(150);
      const m = await page.evaluate(() => {
        const sheet = document.getElementById('stop-sheet');
        const sr = sheet.getBoundingClientRect();
        const topbar = sheet.querySelector('.sheet-topbar').getBoundingClientRect();
        const box = document.querySelector('.sheet-img').getBoundingClientRect();
        const img = document.querySelector('.sheet-img img');
        const visibleH = Math.max(0, Math.min(box.bottom, sr.bottom) - Math.max(box.top, topbar.bottom));
        return {
          visiblePct: visibleH / box.height,
          scrollTop: sheet.scrollTop,
          boxRatio: box.width / box.height,
          naturalRatio: img.naturalWidth / img.naturalHeight,
          fit: getComputedStyle(img).objectFit,
        };
      });
      expect(m.fit).toBe('contain');
      expect(m.visiblePct, 'foto tagliata a striscia dallo scroll').toBeGreaterThan(0.85);
      expect(m.scrollTop, 'la sheet deve partire dall\'alto').toBeLessThanOrEqual(1);
      expect(Math.abs(m.boxRatio - m.naturalRatio), 'contenitore sproporzionato').toBeLessThan(0.03);
      if (i < STOPS.length - 1) await page.locator('#sheet-advance').click();
    }
  });

  test('Miniature compatte: rapporto coerente e nessuna banda vuota', async ({ page }) => {
    await firstStop(page);
    for (let i = 0; i < STOPS.length; i++) {
      await page.waitForFunction(() => {
        const img = document.querySelector('.sheet-compact-thumb img');
        return !!img && img.complete && img.naturalWidth > 0;
      }, null, { timeout: 15000 });
      const m = await page.evaluate(() => {
        const thumb = document.querySelector('.sheet-compact-thumb').getBoundingClientRect();
        const img = document.querySelector('.sheet-compact-thumb img');
        return {
          boxRatio: thumb.width / thumb.height,
          naturalRatio: img.naturalWidth / img.naturalHeight,
          fit: getComputedStyle(img).objectFit,
        };
      });
      expect(m.fit).toBe('contain');
      expect(Math.abs(m.boxRatio - m.naturalRatio), 'miniature schiacciata o con bande vuote').toBeLessThan(0.12);
      if (i < STOPS.length - 1) await page.locator('#sheet-advance').click();
    }
  });

  test('Stella decorativa fuori dalla superficie fotografica', async ({ page }) => {
    await firstStop(page);
    await page.locator('#sheet-toggle').click();
    await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);
    const m = await page.evaluate(() => {
      const photo = document.querySelector('.sheet-img').getBoundingClientRect();
      const star = document.querySelector('.sheet-sticker').getBoundingClientRect();
      const meta = document.querySelector('.postcard-meta').getBoundingClientRect();
      const el = document.querySelector('.sheet-sticker');
      return {
        overlap: !(star.right < photo.left || star.left > photo.right || star.bottom < photo.top || star.top > photo.bottom),
        inMeta: star.left >= meta.left && star.right <= meta.right && star.top >= meta.top && star.bottom <= meta.bottom,
        aria: el.getAttribute('aria-hidden'),
        pointer: getComputedStyle(el).pointerEvents,
      };
    });
    expect(m.overlap).toBe(false);
    expect(m.inMeta).toBe(true);
    expect(m.aria).toBe('true');
    expect(m.pointer).toBe('none');
  });

  test('Home pulita: nessun avatar duplicato e spaziatura equilibrata', async ({ page }) => {
    await openFresh(page);
    await expect(page.locator('#home .travelers')).toHaveCount(0);
    await expect(page.locator('#home .heart-between')).toHaveCount(0);
    await expect(page.locator('.hero-photo')).toBeVisible();
    await expect(page.locator('.hero-label')).toContainText('L’IRLANDA CI ASPETTA');
    const gap = await page.evaluate(() => Math.round(
      document.querySelector('.home-note').getBoundingClientRect().top -
      document.querySelector('.hero-art').getBoundingClientRect().bottom
    ));
    expect(gap).toBeGreaterThan(10);
    expect(gap).toBeLessThan(60);
  });
});
