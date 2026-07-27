'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://gablive.vercel.app';
const EMAIL = 'gabrielalves2p@gmail.com';
const PASSWORD = '123456789';
const WEBINAR_URL = `${BASE_URL}/webinars/cdcbe35c-8d84-44ba-a1d0-48e8c5017a84`;

const VIDEO_DIR = path.join(__dirname, 'output');
const OUTPUT_NAME = 'gablive-demo-dashboard.webm';
const REHEARSAL = process.argv.includes('--rehearse');

fs.mkdirSync(VIDEO_DIR, { recursive: true });

// ---------- helpers (from ui-demo skill) ----------

async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
    cursor.style.cssText = `
      position: fixed; z-index: 999999; pointer-events: none;
      width: 24px; height: 24px;
      transition: left 0.1s, top 0.1s;
      filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
    `;
    cursor.style.left = '0px';
    cursor.style.top = '0px';
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  });
}

async function injectSubtitleBar(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-subtitle')) return;
    const bar = document.createElement('div');
    bar.id = 'demo-subtitle';
    bar.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 999998;
      text-align: center; padding: 12px 24px;
      background: rgba(0, 0, 0, 0.75);
      color: white; font-family: -apple-system, "Segoe UI", sans-serif;
      font-size: 16px; font-weight: 500; letter-spacing: 0.3px;
      transition: opacity 0.3s;
      pointer-events: none;
    `;
    bar.textContent = '';
    bar.style.opacity = '0';
    document.body.appendChild(bar);
  });
}

async function showSubtitle(page, text) {
  await page.evaluate((t) => {
    const bar = document.getElementById('demo-subtitle');
    if (!bar) return;
    if (t) {
      bar.textContent = t;
      bar.style.opacity = '1';
    } else {
      bar.style.opacity = '0';
    }
  }, text);
  if (text) await page.waitForTimeout(800);
}

async function ensureVisible(page, locator, label) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`REHEARSAL FAIL: "${label}" not found - selector: ${typeof locator === 'string' ? locator : '(locator object)'}`);
    return false;
  }
  console.log(`REHEARSAL OK: "${label}"`);
  return true;
}

async function moveAndClick(page, locator, label, opts = {}) {
  const { postClickDelay = 800, ...clickOpts } = opts;
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`WARNING: moveAndClick skipped - "${label}" not visible`);
    return false;
  }
  try {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await page.waitForTimeout(400);
    }
    await el.click(clickOpts);
  } catch (e) {
    console.error(`WARNING: moveAndClick failed on "${label}": ${e.message}`);
    return false;
  }
  await page.waitForTimeout(postClickDelay);
  return true;
}

async function typeSlowly(page, locator, text, label, charDelay = 35) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`WARNING: typeSlowly skipped - "${label}" not visible`);
    return false;
  }
  await moveAndClick(page, el, label);
  await el.fill('');
  await el.pressSequentially(text, { delay: charDelay });
  await page.waitForTimeout(500);
  return true;
}

async function panElements(page, selector, maxCount = 6) {
  const elements = await page.locator(selector).all();
  for (let i = 0; i < Math.min(elements.length, maxCount); i++) {
    try {
      const box = await elements[i].boundingBox();
      if (box && box.y < 700) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.waitForTimeout(600);
      }
    } catch (e) {
      console.warn(`WARNING: panElements skipped element ${i} (selector: "${selector}"): ${e.message}`);
    }
  }
}

// ---------- main ----------

(async () => {
  const browser = await chromium.launch({ headless: true });

  if (REHEARSAL) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    let allOk = true;
    const check = async (locator, label) => {
      if (!(await ensureVisible(page, locator, label))) allOk = false;
    };

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await check('#login-email', 'Login email field');
    await check('#login-password', 'Login password field');
    await check('button.auth-submit', 'Login submit button');

    await page.fill('#login-email', EMAIL);
    await page.fill('#login-password', PASSWORD);
    await page.click('button.auth-submit');
    await page.waitForTimeout(2500);
    await check('a.sidebar-nav-item[href="/webinars"]', 'Sidebar: Webinários');
    await check('a.sidebar-nav-item[href="/analytics"]', 'Sidebar: Analytics');
    await check('a.sidebar-nav-item[href="/leads"]', 'Sidebar: Leads');
    await check('a.webinar-list-item', 'Dashboard: webinar list item');
    await check('a.btn.btn-primary[href="/webinars/create"]', 'Dashboard: Novo webinário');

    await page.goto(WEBINAR_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await check('button.edit-tab:has-text("Analytics")', 'Webinar detail: Analytics tab');
    await check('button.edit-tab:has-text("Página de Registro")', 'Webinar detail: Registration tab');

    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await check('.stat-card', 'Analytics: stat card');

    await page.goto(`${BASE_URL}/leads`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(500);
    await check('.stat-card', 'Leads: stat card');
    await check('button.btn.btn-primary:has-text("Exportar CSV")', 'Leads: Exportar CSV');

    await browser.close();
    if (!allOk) {
      console.error('\nREHEARSAL FAILED - fix selectors before recording');
      process.exit(1);
    }
    console.log('\nREHEARSAL PASSED - all selectors verified');
    return;
  }

  const context = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    // --- Step 1: Login ---
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Login no Gablive');
    await typeSlowly(page, '#login-email', EMAIL, 'Email');
    await typeSlowly(page, '#login-password', PASSWORD, 'Senha');
    await moveAndClick(page, 'button.auth-submit', 'Entrar', { postClickDelay: 4000 });

    // --- Step 2: Dashboard overview ---
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Dashboard: visão geral dos webinários');
    await panElements(page, 'a.webinar-list-item', 4);
    await page.waitForTimeout(1000);

    // --- Step 3: Open a webinar ---
    await showSubtitle(page, 'Abrindo um webinário existente');
    await moveAndClick(page, 'a.webinar-list-item', 'Primeiro webinário da lista', { postClickDelay: 2000 });

    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Configuração do webinário');
    await page.waitForTimeout(1500);

    await showSubtitle(page, 'Página de Registro personalizável');
    await moveAndClick(page, 'button.edit-tab:has-text("Página de Registro")', 'Aba: Página de Registro', { postClickDelay: 1500 });

    await showSubtitle(page, 'Analytics do webinário: conversão por CTA');
    await moveAndClick(page, 'button.edit-tab:has-text("Analytics")', 'Aba: Analytics', { postClickDelay: 2000 });

    // --- Step 4: Global analytics ---
    await showSubtitle(page, 'Analytics global: todos os webinários');
    await moveAndClick(page, 'a.sidebar-nav-item[href="/analytics"]', 'Sidebar: Analytics', { postClickDelay: 1000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Inscritos, presença e cliques em oferta');
    await panElements(page, '.stat-card', 4);
    await page.waitForTimeout(1000);

    // --- Step 5: Leads ---
    await showSubtitle(page, 'Leads capturados, com exportação CSV');
    await moveAndClick(page, 'a.sidebar-nav-item[href="/leads"]', 'Sidebar: Leads', { postClickDelay: 1000 });
    await injectCursor(page);
    await injectSubtitleBar(page);
    await page.waitForTimeout(1500);
    await moveAndClick(page, 'button.btn.btn-primary:has-text("Exportar CSV")', 'Exportar CSV', { postClickDelay: 0 });
    await page.waitForTimeout(1000);

    // --- Result ---
    await showSubtitle(page, 'Gablive — vídeo, página e analytics em um só lugar');
    await page.waitForTimeout(3000);
    await showSubtitle(page, '');
  } catch (err) {
    console.error('DEMO ERROR:', err.message);
  } finally {
    await context.close();
    const video = page.video();
    if (video) {
      const src = await video.path();
      const dest = path.join(VIDEO_DIR, OUTPUT_NAME);
      try {
        fs.copyFileSync(src, dest);
        console.log('Video saved:', dest);
      } catch (e) {
        console.error('ERROR: Failed to copy video:', e.message);
        console.error('  Source:', src);
        console.error('  Destination:', dest);
      }
    }
    await browser.close();
  }
})();
