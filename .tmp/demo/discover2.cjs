'use strict';
const { chromium } = require('playwright');

const BASE_URL = 'https://gablive.vercel.app';
const EMAIL = 'gabrielalves2p@gmail.com';
const PASSWORD = '123456789';

async function dump(page, label) {
  const els = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, select, textarea, button, a, [contenteditable], [role="button"], .tab, .card, .stat-card').forEach((el) => {
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

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('#login-email', EMAIL);
    await page.fill('#login-password', PASSWORD);
    await page.click('button.auth-submit');
    await page.waitForTimeout(2500);

    // Webinar detail page (the one with "te02" — has an Agendado badge, likely richest)
    await page.goto(`${BASE_URL}/webinars/cdcbe35c-8d84-44ba-a1d0-48e8c5017a84`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await dump(page, 'WEBINAR DETAIL PAGE');

    // Analytics page
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await dump(page, 'GLOBAL ANALYTICS PAGE');

    // Leads page
    await page.goto(`${BASE_URL}/leads`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await dump(page, 'LEADS PAGE');
  } catch (err) {
    console.error('DISCOVERY ERROR:', err.message);
  } finally {
    await browser.close();
  }
})();
