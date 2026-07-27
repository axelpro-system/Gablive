'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://gablive.vercel.app';
const REG_URL = `${BASE_URL}/register/te02`;

const VIDEO_DIR = path.join(__dirname, 'output');
const OUTPUT_NAME = 'gablive-demo-participante.webm';
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

    await page.goto(REG_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(2500);
    await check('#reg-name', 'Registration: name field');
    await check('#reg-email', 'Registration: email field');
    await check('#reg-phone', 'Registration: phone field');
    await check('button.reg-submit', 'Registration: submit button');

    await browser.close();
    if (!allOk) {
      console.error('\nREHEARSAL FAILED - fix selectors before recording');
      process.exit(1);
    }
    console.log('\nREHEARSAL PASSED - all selectors verified');
    console.log('NOTE: room-page selectors (unmute overlay, chat input) verified separately via live discovery; not re-checked here to avoid a second test registration during rehearsal.');
    return;
  }

  const context = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    // --- Step 1: Registration page ---
    await page.goto(REG_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Página de registro do webinário');
    await page.waitForTimeout(2000);

    await typeSlowly(page, '#reg-name', 'Maria Teste Demo', 'Nome');
    await typeSlowly(page, '#reg-email', 'maria.demo.gablive@example.com', 'E-mail');
    await typeSlowly(page, '#reg-phone', '11987654321', 'WhatsApp');

    await showSubtitle(page, 'Confirmando inscrição');
    await moveAndClick(page, 'button.reg-submit', 'Assistir Transmissão', { postClickDelay: 3000 });

    // --- Step 2: Webinar room ---
    await injectCursor(page);
    await injectSubtitleBar(page);
    await showSubtitle(page, 'Entrando na sala do webinário');
    await page.waitForTimeout(2000);

    const unmuteVisible = await page.locator('button.room-unmute-overlay').isVisible().catch(() => false);
    if (unmuteVisible) {
      await moveAndClick(page, 'button.room-unmute-overlay', 'Ativar som', { postClickDelay: 1500 });
    }

    await showSubtitle(page, 'Vídeo ao vivo com chat em tempo real');
    await page.waitForTimeout(2000);

    const chatInput = page.locator('input.input').last();
    const chatVisible = await chatInput.isVisible().catch(() => false);
    if (chatVisible) {
      await showSubtitle(page, 'Enviando mensagem no chat');
      await moveAndClick(page, chatInput, 'Campo de chat', { postClickDelay: 300 });
      await chatInput.pressSequentially('Oi pessoal, animado pra esse webinário!', { delay: 30 });
      await page.waitForTimeout(500);
      const sendBtn = page.locator('button.btn.btn-primary.btn-icon').last();
      await moveAndClick(page, sendBtn, 'Enviar mensagem', { postClickDelay: 1500 });
    }

    await showSubtitle(page, 'Prova social e ofertas aparecem durante a transmissão');
    await page.waitForTimeout(3000);

    await showSubtitle(page, 'Gablive — do registro à conversão, em uma sala só');
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
