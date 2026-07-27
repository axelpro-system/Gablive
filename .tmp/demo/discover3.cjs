'use strict';
const { chromium } = require('playwright');

const BASE_URL = 'https://gablive.vercel.app';

async function dump(page, label) {
  const els = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, select, textarea, button, a, [contenteditable], [role="button"]').forEach((el) => {
      if (el.offsetParent !== null) {
        out.push({
          tag: el.tagName,
          type: el.type || '',
          id: el.id || '',
          cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 70) : '',
          name: el.name || '',
          placeholder: el.placeholder || '',
          text: (el.textContent || '').trim().substring(0, 60),
          href: el.getAttribute('href') || '',
        });
      }
    });
    return out;
  });
  console.log(`\n=== ${label} (${page.url()}) ===`);
  console.log(JSON.stringify(els, null, 2));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('[page error]', e.message));

  try {
    await page.goto(`${BASE_URL}/register/te02`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await dump(page, 'REGISTRATION PAGE');

    await page.goto(`${BASE_URL}/room/te02`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await dump(page, 'ROOM PAGE (unauth, no registration)');
  } catch (err) {
    console.error('DISCOVERY ERROR:', err.message);
  } finally {
    await browser.close();
  }
})();
