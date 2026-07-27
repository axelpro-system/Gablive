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
          cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 70) : '',
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

// NOTE: user explicitly authorized this test submission (creates one real
// lead record in Gablive's production Supabase, used only for demo recording).
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('[page error]', e.message));

  try {
    await page.goto(`${BASE_URL}/register/te02`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    await page.fill('#reg-name', 'Maria Teste Demo');
    await page.fill('#reg-email', 'maria.demo.gablive@example.com');
    await page.fill('#reg-phone', '11987654321');
    await page.click('button.reg-submit');
    await page.waitForTimeout(4000);

    console.log('URL after registration:', page.url());
    await dump(page, 'AFTER REGISTRATION');
  } catch (err) {
    console.error('DISCOVERY ERROR:', err.message);
    console.log('URL at error time:', page.url());
  } finally {
    await browser.close();
  }
})();
