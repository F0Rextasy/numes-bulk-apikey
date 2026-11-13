'use strict';
/*
 * browser.js — the browser half of the mint.
 *
 * numes.ai registers through Keycloak and puts a Cloudflare Turnstile widget in front
 * of the form, so the whole account is created inside a real Chrome (the one already
 * installed on this machine, via puppeteer-core): the widget passes because a human
 * browser with a real mouse is driving it, and the dashboard session cookies only
 * exist inside that browser.
 *
 * Nothing is spoofed: this is the user's own browser and network, so the panel sees
 * exactly the identity the user already has.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const APP = 'https://numes.ai';
const KC = 'https://auth.numes.ai';
const REGISTRATION = /login-actions\/registration/;

function launchBrowser({ px = null, headless = false } = {}) {
  const puppeteer = require('puppeteer-core');
  const args = [
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900',
    '--mute-audio',
    // Keeps navigator.webdriver false: Turnstile reads it before anything else.
    '--disable-blink-features=AutomationControlled',
  ];
  if (px) {
    args.push(`--proxy-server=${px.protocol}://${px.host}:${px.port}`);
    if (px.protocol.startsWith('socks')) args.push('--proxy-bypass-list=<-loopback>');
  }
  const options = { headless, args, ignoreDefaultArgs: ['--enable-automation'], defaultViewport: null };
  return puppeteer
    .launch({ ...options, channel: 'chrome' })
    .catch(() => puppeteer.launch(options))
    .catch((e) => {
      throw new Error(
        `Chrome not found or could not start (${e.message}). Install Chrome, set CHROME_PATH, or run: npx puppeteer browsers install chrome`,
      );
    });
}

async function proxyAuth(page, px) {
  if (!px || !px.username) return;
  const cdp = await page.target().createCDPSession();
  // Fetch.enable pauses every request, so each one must be continued; omitting that
  // leaves the page on about:blank (measured: navigation never completes).
  cdp.on('Fetch.requestPaused', (e) => {
    cdp.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {});
  });
  cdp.on('Fetch.authRequired', (e) => {
    cdp
      .send('Fetch.continueWithAuth', {
        requestId: e.requestId,
        authChallengeResponse: {
          response: 'ProvideCredentials',
          username: px.username,
          password: px.password || '',
          proxyUsername: px.username,
          proxyPassword: px.password || '',
        },
      })
      .catch(() => {});
  });
  await cdp.send('Fetch.enable', { handleAuthRequests: true, patterns: [{ urlPattern: '*' }] });
}

/** A real mouse click inside the Turnstile widget until the token shows up. */
async function solveTurnstile(page, log, { tries = 4, waitMs = 20000 } = {}) {
  const tokenOf = async () =>
    String(
      (await page
        .evaluate(() => {
          const el = document.querySelector('input[name="cf-turnstile-response"], textarea[name="cf-turnstile-response"]');
          let g = '';
          try {
            if (typeof turnstile !== 'undefined' && turnstile.getResponse) g = turnstile.getResponse() || '';
          } catch (e) {
            /* widget not ready */
          }
          return (el && el.value) || g || '';
        })
        .catch(() => '')) || '',
    );
  const clickOnce = async (label) => {
    const host = await page
      .evaluate(() => {
        const el = document.querySelector('.cf-turnstile, [data-sitekey]');
        const ifr = [...document.querySelectorAll('iframe')].find((i) => /challenges\.cloudflare\.com/.test(i.src || ''));
        const r = (el || ifr || {}).getBoundingClientRect ? (el || ifr).getBoundingClientRect() : null;
        return r && r.width > 0 && r.height > 0 ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
      })
      .catch(() => null);
    if (!host) return false;
    const x = host.x + Math.min(30, host.w / 2);
    const y = host.y + Math.round(host.h / 2);
    await page.mouse.move(x - 4, y - 3).catch(() => {});
    await sleep(40 + Math.random() * 90);
    await page.mouse.click(x, y).catch(() => {});
    log && log(`   ${label} click @ ${Math.round(x)},${Math.round(y)}`);
    return true;
  };
  let token = await tokenOf();
  // Invisible mode needs no click at all: give the widget its first ~10 s.
  for (let i = 0; i < 14 && !token; i++) {
    await sleep(700);
    token = await tokenOf();
  }
  for (let attempt = 1; attempt <= tries && !token; attempt++) {
    await clickOnce(`turnstile #${attempt}`);
    const t0 = Date.now();
    while (Date.now() - t0 < waitMs) {
      token = await tokenOf();
      if (token.length > 20) return token;
      await sleep(700);
    }
  }
  if (token.length > 20) return token;
  const diag = await page
    .evaluate(() => ({
      webdriver: navigator.webdriver,
      ua: /Headless/i.test(navigator.userAgent) ? 'headless' : 'desktop',
      frames: [...document.querySelectorAll('iframe')].map((i) => (i.src || '').slice(0, 60)),
      text: (document.body ? document.body.innerText : '').replace(/\s+/g, ' ').slice(0, 120),
    }))
    .catch(() => ({}));
  log(`   turnstile failed: ${JSON.stringify(diag).slice(0, 260)}`);
  return '';
}

async function pageText(page) {
  return page.evaluate(() => (document.body ? document.body.innerText : '')).catch(() => '');
}

async function waitText(page, re, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const t = await pageText(page);
    if (re.test(t)) return t;
    await sleep(700);
  }
  return '';
}

/**
 * Create one account and its API key. `waitLink()` is the CLI's mailbox poller: it
 * resolves with the verification URL once the mail arrives.
 * Resolves { ok, key, email, why }.
 */
async function mintInBrowser({ email, password, waitLink, px = null, headless = false, log = () => {} }) {
  const browser = await launchBrowser({ px, headless });
  try {
    const page = await browser.newPage();
    await proxyAuth(page, px);

    await page.goto(`${APP}/auth/login?return_to=%2Fdashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      .catch((e) => log(`   login failed: ${String(e.message || e).slice(0, 100)}`));
    // The app redirects to Keycloak a moment later; reading the page before that
    // finds no registration link (measured: "registration form did not open").
    const until = Date.now() + 45000;
    while (Date.now() < until && !/auth\.numes\.ai/.test(page.url())) await sleep(500);
    log(`   login → ${page.url().replace(/\?.*/, '')}`);
    await page.waitForSelector('a[href*="login-actions/registration"], #email', { timeout: 20000 }).catch(() => {});
    const regLink = await page
      .$eval('a[href*="login-actions/registration"]', (a) => a.href)
      .catch(() => null);
    if (regLink) {
      await page.goto(regLink, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    } else if (!REGISTRATION.test(page.url()) && !(await page.$('#email'))) {
      // Fallback: Keycloak's own registration endpoint, same browser session.
      const reg = `${KC}/realms/numes/protocol/openid-connect/registrations?client_id=numes-web` +
        `&redirect_uri=${encodeURIComponent(APP + '/auth/callback')}&response_type=code&scope=openid%20profile%20email`;
      await page.goto(reg, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    }
    log(`   form → ${page.url().replace(/\?.*/, '')}`);

    await page.waitForSelector('#email', { timeout: 30000 }).catch(() => {});
    const form = await page.$('#email');
    if (!form) {
      const seen = (await pageText(page)).replace(/\s+/g, ' ').slice(0, 140);
      return { ok: false, why: `registration form did not render @${page.url().replace(/\?.*/, '')} · ${seen}` };
    }
    await page.click('#email');
    await page.type('#email', email, { delay: 40 + Math.random() * 60 });

    const token = await solveTurnstile(page, log);
    if (!token) return { ok: false, why: 'turnstile did not produce a token' };
    log('   turnstile ok');

    await Promise.all([
      page.waitForNavigation({ timeout: 45000 }).catch(() => null),
      page.click('#kc-register-form button[type=submit]').catch(() => {}),
    ]);
    await sleep(1200);
    log(`   submit → ${page.url().replace(/\?.*/, '')} · ${(await pageText(page)).replace(/\s+/g, ' ').slice(0, 110)}`);
    const posted = await waitText(page, /check your email|verify your email|already exists|invalid/i, 30000);
    if (/already exists|already registered|invalid/i.test(posted) && !/check your email|verify your email/i.test(posted)) {
      return { ok: false, why: `registration refused: ${posted.replace(/\s+/g, ' ').slice(0, 140)}` };
    }
    log('   verification mail requested');

    const link = await waitLink();
    if (!link) return { ok: false, why: 'verification mail did not arrive' };
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});

    const hasPw = await page.waitForSelector('#password-new, input[name="password-new"], #password', { timeout: 30000 }).then(() => true).catch(() => false);
    if (!hasPw) return { ok: false, why: 'password form did not render' };
    const pwSel = (await page.$('#password-new')) ? '#password-new' : (await page.$('#password')) ? '#password' : 'input[name="password"]';
    await page.click(pwSel);
    await page.type(pwSel, password, { delay: 30 + Math.random() * 50 });
    const confirm = await page.$('#password-confirm, input[name="password-confirm"]');
    if (confirm) {
      await page.click('#password-confirm, input[name="password-confirm"]');
      await page.type('#password-confirm, input[name="password-confirm"]', password, { delay: 30 + Math.random() * 50 });
    }
    await Promise.all([
      page.waitForNavigation({ timeout: 60000 }).catch(() => null),
      page.click('input[type=submit], button[type=submit]').catch(() => {}),
    ]);
    await sleep(2000);
    if (/auth\.numes\.ai/.test(page.url())) {
      const t = await pageText(page);
      return { ok: false, why: `password step stayed on auth: ${t.replace(/\s+/g, ' ').slice(0, 120)}` };
    }
    log('   dashboard session ok');

    await page.goto(`${APP}/dashboard/keys`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await sleep(5000);
    const html = await page.content();
    const flat = html.replace(/\\/g, '');
    const accountId = (flat.match(/"active_account_id":"([A-Za-z0-9_-]+)"/) || [])[1];
    if (!accountId) return { ok: false, why: 'dashboard account id missing' };
    const csrf = (flat.match(new RegExp('csrf' + 'Token' + '"\\s*:\\s*"([A-Za-z0-9_-]{20,})"')) || [])[1];
    if (!csrf) return { ok: false, why: 'dashboard csrf token missing' };

    const created = await page.evaluate(
      async ({ path, name, token }) => {
        const r = await fetch(path, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json', 'x-numes-csrf': token },
          body: JSON.stringify({ name, kind: 'inference', billing_currency: 'USD', limit: null, limit_reset: null }),
        });
        return { status: r.status, text: (await r.text()).slice(0, 2000) };
      },
      { path: `/api/bff/app/v1/accounts/${accountId}/keys`, name: `numes-${Date.now().toString(36)}`, token: csrf },
    ).catch((e) => ({ status: 0, text: String(e.message || e) }));

    const key = (created.text.match(/sk-numes-v1-[0-9a-f]{16,}/) || [])[0];
    if (!key) return { ok: false, why: `key create ${created.status}: ${String(created.text).replace(/\s+/g, ' ').slice(0, 120)}` };
    return { ok: true, key, email };
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { mintInBrowser, launchBrowser, solveTurnstile };
