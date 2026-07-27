'use strict';
const { chromium } = require('playwright');

const BASE_URL = 'https://gablive.vercel.app';
const EMAIL = 'gabrielalves2p@gmail.com';
const PASSWORD = '123456789';

async function dump(page, label) {
  const els = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, select, textarea, button, a, [contenteditable], [role="button"]').forEach((el) => {
      if (el.offsetParent !== null) {
        out.push({
          tag: el.tagName,
          type: el.type || '',
          id: el.id || '',
          cls: (el.className && typeof el.className === 'string') ? el.className.slice(0, 60) : '',
          name: el.name || '',
          placeholder: el.placeholder || '',
          text: (el.textContent || '').trim().substring(0, 50),
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
  page.on('console', (m) => console.log('[page console]', m.type(), m.text()));
  page.on('pageerror', (e) => console.log('[page error]', e.message));

  try {
    console.log('Navigating to login...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await dump(page, 'LOGIN PAGE');

    await page.fill('#login-email', EMAIL);
    await page.fill('#login-password', PASSWORD);
    await page.click('button.auth-submit');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle').catch(() => {});
    console.log('\nURL after login attempt:', page.url());

    const errorVisible = await page.locator('.auth-error').isVisible().catch(() => false);
    if (errorVisible) {
      console.log('LOGIN ERROR TEXT:', await page.locator('.auth-error').textContent());
    }

    await dump(page, 'POST-LOGIN PAGE');
  } catch (err) {
    console.error('DISCOVERY ERROR:', err.message);
  } finally {
    await browser.close();
  }
})();
