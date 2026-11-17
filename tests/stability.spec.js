const { test, expect } = require('@playwright/test');

const STOPS = ['Dublino', 'Glendalough', 'Galway', 'Cliffs of Moher', 'Howth'];

async function attachDiagnostics(page, label) {
  const errors = [];
  const rejections = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console:${msg.text()}`); });
  page.on('requestfailed', () => {});
  page._diag = { errors, rejections, label };
  return page._diag;
}

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

async function getUIState(page) {
  return page.evaluate(() => {
    const sheet = document.getElementById('stop-sheet');
    const content = document.getElementById('sheet-content');
    const guide = document.getElementById('journey-guide');
    const overlay = document.getElementById('sheet-overlay');
    const finale = document.getElementById('journey-finale');
    const active = document.querySelector('.view.active')?.id || null;
    const cs = sheet ? getComputedStyle(sheet) : null;
    const rect = sheet ? sheet.getBoundingClientRect() : null;
    const title = content?.querySelector('#sheet-title')?.textContent || null;
    const textLen = (content?.innerText || '').trim().length;
    return {
      activeView: active,
      sheet: sheet ? {
        open: sheet.classList.contains('open'),
        expanded: sheet.classList.contains('expanded'),
        tourMode: sheet.classList.contains('tour-mode'),
        ariaHidden: sheet.getAttribute('aria-hidden'),
        contentHTMLLen: content?.innerHTML?.length || 0,
        textLen,
        title,
        hasAdvance: !!content?.querySelector('#sheet-advance'),
        hasToggle: !!content?.querySelector('#sheet-toggle'),
        hasPrev: !!content?.querySelector('#sheet-prev,#prev-stop'),
        hasNext: !!content?.querySelector('#sheet-next,#next-stop'),
        transform: cs?.transform,
        zIndex: cs?.zIndex,
        background: cs?.backgroundColor,
        rect: rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height, bottom: rect.bottom } : null,
      } : null,
      guide: guide ? { hidden: guide.hidden, text: guide.innerText.slice(0,120) } : null,
      overlay: overlay ? { hidden: overlay.hidden } : null,
      finale: finale ? { hidden: finale.hidden } : null,
    };
  });
}

async function assertNoBadState(page, context) {
  const state = await getUIState(page);
  const errs = page._diag?.errors || [];
  // No unexpected empty open sheet (cream rectangle symptom)
  if (state.sheet?.open) {
    expect(state.sheet.contentHTMLLen, `sheet open but empty content (${context}) state=${JSON.stringify(state.sheet)}`).toBeGreaterThan(20);
    expect(state.sheet.textLen, `sheet open but no visible text (${context})`).toBeGreaterThan(10);
    expect(state.sheet.title, `sheet open but missing title (${context})`).toBeTruthy();
  }
  // No JS page errors
  expect(errs.filter(e => e.startsWith('Error') || e.includes('TypeError') || e.includes('ReferenceError')), `JS errors (${context}): ${errs.join(' | ')}`).toEqual([]);
  return state;
}

async function startAndReachFirst(page) {
  await openFresh(page);
  await attachDiagnostics(page, 'flow');
  await page.click('#start-btn');
  await expect(page.locator('#map-view')).toHaveClass(/active/);
  await page.locator('#guide-next').click();
  await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
  await expect(page.locator('#sheet-title')).toContainText(/Dublino/i, { timeout: 20000 });
  return assertNoBadState(page, 'after first open');
}

test.describe('Stability gate', () => {
  test('sequence reproduction multiple cycles', async ({ page }) => {
    test.setTimeout(180000);
    for (let cycle = 1; cycle <= 3; cycle++) {
      await openFresh(page);
      attachDiagnostics(page, `cycle${cycle}`);

      // 1. Home -> 2. start
      await expect(page.locator('#home')).toHaveClass(/active/);
      await page.click('#start-btn');
      await expect(page.locator('#map-view')).toHaveClass(/active/);

      // 3. discover Dublino
      await page.locator('#guide-next').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/open/, { timeout: 20000 });
      await expect(page.locator('#sheet-title')).toContainText(/Dublino/i);
      let st = await assertNoBadState(page, `c${cycle} dublino open`);
      expect(st.guide.hidden || !st.sheet.open, 'guide should not compete with open sheet in tour').toBeTruthy();

      // 4. expand and close
      await page.locator('#sheet-toggle').click();
      await expect(page.locator('#stop-sheet')).toHaveClass(/expanded/);
      await assertNoBadState(page, `c${cycle} dublino expanded`);
      await page.locator('#sheet-toggle').click();
      await expect(page.locator('#stop-sheet')).not.toHaveClass(/expanded/);
      await assertNoBadState(page, `c${cycle} dublino compact`);
      // close sheet (in tour mode close button exists)
      await page.locator('#close-sheet').click();
      await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/);

      // 5. to Glendalough
      await page.locator('#guide-next').click();
      await expect(page.locator('#sheet-title')).toContainText(/Glendalough/i, { timeout: 20000 });
      await expect(page.locator('#stop-sheet')).toHaveClass(/open/);
      await assertNoBadState(page, `c${cycle} glendalough`);

      // 6. continue to last
      for (let i = 2; i < STOPS.length; i++) {
        await page.locator('#sheet-advance').click();
        await expect(page.locator('#sheet-title')).toContainText(new RegExp(STOPS[i], 'i'), { timeout: 20000 });
        await expect(page.locator('#stop-sheet')).toHaveClass(/open/);
        await assertNoBadState(page, `c${cycle} stop${i} ${STOPS[i]}`);
      }
      await page.locator('#sheet-advance').click(); // termina
      await expect(page.locator('#stop-sheet')).not.toHaveClass(/open/, { timeout: 10000 });
      // finale può essere mostrato; stato completato deve essere coerente
      await expect(page.locator('#journey-guide')).toContainText(/Viaggio svelato|Mappa libera/i, { timeout: 15000 });
      const finaleVisible = await page.locator('#journey-finale').isVisible().catch(() => false);
      if (finaleVisible) {
        await page.locator('#finale-map').click().catch(async () => { await page.locator('#finale-close').click().catch(() => {}); });
      }

      // 7. home
      await page.locator('.nav-btn[data-nav="home"]').click();
      await expect(page.locator('#home')).toHaveClass(/active/);
      await assertNoBadState(page, `c${cycle} home after complete`);

      // 8. resume/explore
      await page.click('#start-btn');
      await expect(page.locator('#map-view')).toHaveClass(/active/);
      await assertNoBadState(page, `c${cycle} back to map`);

      // 9. guide and back
      await page.locator('.nav-btn[data-nav="guide-view"]').click();
      await expect(page.locator('#guide-view')).toHaveClass(/active/);
      st = await assertNoBadState(page, `c${cycle} guide view`);
      expect(st.guide.hidden, 'journey guide must be hidden in guide view').toBeTruthy();
      expect(st.sheet.open, 'sheet must not be open in guide view').toBeFalsy();
      await page.locator('.nav-btn[data-nav="map-view"]').click();
      await expect(page.locator('#map-view')).toHaveClass(/active/);
      await assertNoBadState(page, `c${cycle} back from guide`);

      // 10. repeat surprise
      const skip = page.locator('#guide-skip');
      if (await skip.isVisible()) await skip.click();
      await expect(page.locator('#guide-next')).toContainText(/Scopri la prima tappa/i, { timeout: 15000 });
      await assertNoBadState(page, `c${cycle} after restart`);
    }
  });
});
