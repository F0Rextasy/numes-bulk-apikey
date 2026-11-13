#!/usr/bin/env node
'use strict';
/*
 * numes-bulk-apikey CLI — mint numes.ai API keys.
 *
 * One command, no flags: `npm start` → menu → "Mint keys" → count → keys in keys.txt.
 * Every key is proven with a live chat-200 (two different prompts) before it is written.
 *
 * Flow per account:
 *   mailbox → Keycloak registration in a real Chrome (Turnstile checkbox, real mouse)
 *   → e-mail verification link → password → dashboard session → API key (BFF create).
 *
 * Proxy is OPTIONAL: pass `--pool proxies.txt` and every request (and the browser)
 * leaves through your proxies; without it the CLI runs direct.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
try {
  require('dns').setDefaultResultOrder('ipv4first');
} catch (e) {
  /* node < 17 */
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36';
const API = 'https://api.numes.ai/api/v1';
const FREE_MODEL = 'deepseek/deepseek-v4.1-flash';
const LINK_RE = /https:\/\/auth\.numes\.ai\/[^"\\\s<>]+/;
const OUT = path.join(process.cwd(), 'keys.txt');
const STRICT = process.argv.includes('--strict-proxy');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (n) => crypto.randomBytes(n).toString('hex').slice(0, n);

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i < 0) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
}
function log(...a) {
  console.log(...a);
}

function pool() {
  const explicit = arg('pool', null);
  let file = explicit || process.env.NUMES_PROXIES || null;
  if (!file && fs.existsSync('proxies.txt')) file = 'proxies.txt';
  if (!file) return null;
  if (!fs.existsSync(String(file))) {
    if (explicit) throw new Error(`pool ${file} not found`);
    return null;
  }
  const lines = fs
    .readFileSync(String(file), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+#.*$/, '').trim())
    .filter((l) => l && !l.startsWith('#'));
  if (!lines.length) throw new Error(`pool ${file} is empty`);
  return lines.map(parseProxy);
}
function parseProxy(line) {
  const clean = String(line).replace(/\s+#.*$/, '').trim();
  const m = clean.match(/^(https?|socks5h?):\/\/(?:([^:@/]+):([^@/]*)@)?([^:/]+):(\d+)\/?$/i);
  if (!m) {
    const bare = clean.match(/^([^:/]+):(\d+)$/);
    if (bare) return { protocol: 'http', username: null, password: null, host: bare[1], port: Number(bare[2]) };
    throw new Error(`bad proxy line: ${String(line).slice(0, 40)}`);
  }
  return {
    protocol: m[1].toLowerCase(),
    username: m[2] ? decodeURIComponent(m[2]) : null,
    password: m[3] ? decodeURIComponent(m[3]) : null,
    host: m[4],
    port: Number(m[5]),
  };
}

/** HTTP helper. `px` is a parsed proxy or null (direct). */
async function req(url, { method = 'GET', headers = {}, body = null, px = null, timeoutMs = 45000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const h = { 'user-agent': UA, ...headers };
  try {
    const opts = { method, headers: h, body, signal: ctrl.signal, redirect: 'manual' };
    if (px) return await tunnel(url, opts, px);
    const r = await fetch(url, opts);
    const text = await r.text();
    const hdrs = {};
    for (const [k, v] of r.headers) hdrs[k] = v;
    return { status: r.status, headers: hdrs, text };
  } finally {
    clearTimeout(timer);
  }
}

/** CONNECT tunnel for HTTP proxies; SOCKS5 handshake for socks5 lines. */
async function tunnel(url, opts, px) {
  const net = require('net');
  const tls = require('tls');
  const http = require('http');
  const u = new URL(url);
  const port = u.port || (u.protocol === 'https:' ? 443 : 80);
  const raw = await new Promise((res, rej) => {
    const s = net.connect(px.port, px.host, () => res(s));
    s.once('error', rej);
    s.setTimeout(20000, () => s.destroy(new Error('proxy connect timeout')));
  });
  let sock = raw;
  if (px.protocol.startsWith('socks')) {
    await socks5(raw, u.hostname, Number(port), px);
  } else {
    const auth = px.username
      ? `Proxy-Authorization: Basic ${Buffer.from(`${px.username}:${px.password || ''}`).toString('base64')}\r\n`
      : '';
    sock.write(`CONNECT ${u.hostname}:${port} HTTP/1.1\r\nHost: ${u.hostname}:${port}\r\n${auth}\r\n`);
    const head = await new Promise((res, rej) => {
      let buf = '';
      const onData = (d) => {
        buf += d.toString('latin1');
        if (buf.includes('\r\n\r\n')) {
          sock.removeListener('data', onData);
          res(buf);
        }
      };
      sock.on('data', onData);
      sock.once('error', rej);
    });
    if (!/^HTTP\/1\.[01] 200/i.test(head)) throw new Error(`proxy CONNECT failed: ${head.split('\r\n')[0]}`);
  }
  if (u.protocol === 'https:') {
    sock = tls.connect({ socket: sock, servername: u.hostname });
    await new Promise((res, rej) => {
      sock.once('secureConnect', res);
      sock.once('error', rej);
    });
  }
  return await new Promise((res, rej) => {
    const r = http.request(
      {
        method: opts.method,
        path: u.pathname + u.search,
        headers: { host: u.hostname, connection: 'close', ...opts.headers },
        createConnection: () => sock,
      },
      (x) => {
        let data = '';
        x.setEncoding('utf8');
        x.on('data', (c) => (data += c));
        x.on('end', () => res({ status: x.statusCode, headers: x.headers, text: data }));
      },
    );
    r.once('error', rej);
    if (opts.body) r.write(opts.body);
    r.end();
  });
}
function socks5(sock, host, port, px) {
  return new Promise((res, rej) => {
    const methods = px.username ? [0x00, 0x02] : [0x00];
    sock.write(Buffer.from([0x05, methods.length, ...methods]));
    let step = 0;
    const onData = (d) => {
      if (step === 0) {
        if (d[0] !== 0x05 || d[1] === 0xff) return rej(new Error('socks5 auth rejected'));
        if (d[1] === 0x02) {
          const u = Buffer.from(px.username || '');
          const p = Buffer.from(px.password || '');
          sock.write(Buffer.concat([Buffer.from([0x01, u.length]), u, Buffer.from([p.length]), p]));
          step = 1;
          return;
        }
        return sendConnect();
      }
      if (step === 1) {
        if (d[1] !== 0x00) return rej(new Error('socks5 auth failed'));
        return sendConnect();
      }
      if (step === 2) {
        sock.removeListener('data', onData);
        if (d[1] !== 0x00) return rej(new Error(`socks5 connect rc=${d[1]}`));
        res();
      }
    };
    const sendConnect = () => {
      step = 2;
      const h = Buffer.from(host);
      sock.write(Buffer.concat([Buffer.from([0x05, 0x01, 0x00, 0x03, h.length]), h, Buffer.from([port >> 8, port & 0xff])]));
    };
    sock.on('data', onData);
    sock.once('error', rej);
  });
}

/**
 * Mailbox rails. numes.ai wants a readable inbox before it hands out a key:
 * put a Mailtrap API token in `mailtrap.txt` (or MAILTRAP_TOKEN / --mailtrap-token)
 * once; the public temp-mail rails stay as a fallback.
 */
function mailtrapToken() {
  const flag = arg('mailtrap-token', null);
  if (typeof flag === 'string' && flag.length > 20) return flag.trim();
  if (process.env.MAILTRAP_TOKEN) return String(process.env.MAILTRAP_TOKEN).trim();
  try {
    const t = fs.readFileSync('mailtrap.txt', 'utf8').trim();
    if (t.length > 20) return t;
  } catch (e) {
    /* no token file */
  }
  return '';
}
async function mailtrapBox(px, token) {
  const api = 'https://mailtrap.io/api';
  const H = { authorization: `Bearer ${token}`, accept: 'application/json' };
  const folders = JSON.parse((await req(`${api}/inbound/folders`, { px, headers: H })).text);
  const arr = Array.isArray(folders) ? folders : folders.data || [];
  let folder = arr.find((f) => /numes/i.test(f.name));
  if (!folder) {
    const made = await req(`${api}/inbound/folders`, {
      px,
      method: 'POST',
      headers: { ...H, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'numes-bulk' }),
    });
    folder = JSON.parse(made.text);
    folder = folder.data || folder;
  }
  const made = await req(`${api}/inbound/folders/${folder.id}/inboxes`, {
    px,
    method: 'POST',
    headers: { ...H, 'content-type': 'application/json' },
    body: JSON.stringify({ name: `numes-${rand(6)}` }),
  });
  const box = JSON.parse(made.text);
  if (!box.address) throw new Error(`mailtrap inbox ${made.status} ${String(made.text).slice(0, 90)}`);
  return { address: box.address, rail: 'mailtrap', api, token, id: box.id, px };
}
async function makeMailbox(px) {
  const mt = mailtrapToken();
  let why = '';
  if (mt) {
    try {
      return await mailtrapBox(px, mt);
    } catch (e) {
      why = String(e.message || e);
      try {
        return await mailtrapBox(null, mt);
      } catch (e2) {
        why = String(e2.message || e2);
        /* fall through to the public rails */
      }
    }
  }
  for (const [name, api] of [
    ['mail.tm', 'https://api.mail.tm'],
    ['mail.gw', 'https://api.mail.gw'],
  ]) {
    // Mail providers are not the panel: when the exit cannot reach them, ask directly.
    for (const usePx of px ? [px, null] : [null]) {
      try {
        const d = JSON.parse((await req(api + '/domains', { px: usePx })).text);
        const dom = (d['hydra:member'] || d)[0].domain;
        const address = `nm${rand(7)}@${dom}`;
        const password = `Px${rand(10)}!`;
        const cr = await req(api + '/accounts', {
          px: usePx,
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address, password }),
        });
        if (cr.status >= 400) { why = `${name} ${cr.status}`; continue; }
        const tok = JSON.parse((await req(api + '/token', {
          px: usePx,
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address, password }),
        })).text);
        return { address, rail: name, api, token: tok.token, px: usePx };
      } catch (e) {
        why = String(e.message || e);
      }
    }
  }
  throw new Error(
    `no mailbox rail${why ? ` (last error: ${why.replace(/^Error:\s*/, '').slice(0, 110)})` : ''} — ` +
      'optional: put a Mailtrap token in mailtrap.txt',
  );
}
async function mailMessages(mail) {
  const out = [];
  if (mail.rail === 'mailtrap') {
    const H = { authorization: `Bearer ${mail.token}`, accept: 'application/json' };
    const list = JSON.parse((await req(`${mail.api}/inbound/inboxes/${mail.id}/messages?per_page=20`, { px: mail.px, headers: H })).text);
    for (const m of (list.data || list || []).slice(0, 10)) {
      const full = JSON.parse((await req(`${mail.api}/inbound/inboxes/${mail.id}/messages/${m.id}`, { px: mail.px, headers: H })).text);
      out.push(`${full.subject || ''} ${full.text_body || ''} ${JSON.stringify(full.html_body || '')}`);
    }
    return out;
  }
  const H = { authorization: `Bearer ${mail.token}` };
  const list = JSON.parse((await req(`${mail.api}/messages`, { px: mail.px, headers: H })).text);
  for (const m of (list['hydra:member'] || list || []).slice(0, 10)) {
    const full = JSON.parse((await req(`${mail.api}/messages/${m.id}`, { px: mail.px, headers: H })).text);
    out.push(`${full.subject || ''} ${full.text || ''} ${JSON.stringify(full.html || '')}`);
  }
  return out;
}
function waitLink(mail, timeoutMs = 240000) {
  const t0 = Date.now();
  return (async () => {
    while (Date.now() - t0 < timeoutMs) {
      try {
        for (const hay of await mailMessages(mail)) {
          const hit = (hay.match(LINK_RE) || [])[0];
          if (hit) return hit.replace(/&amp;/g, '&').replace(/\\u0026/g, '&');
        }
      } catch (e) {
        /* a poll that fails is not a dead mailbox */
      }
      await sleep(4000);
    }
    return '';
  })();
}

const textOf = (j) => {
  const m = (j && j.choices && j.choices[0] && j.choices[0].message) || {};
  return String(m.content || m.reasoning_content || m.reasoning || '').trim();
};
/** Live gate: chat-200, and two different prompts must give two different answers. */
async function gate(key, px) {
  const call = async (prompt) => {
    const r = await req(`${API}/chat/completions`, {
      px,
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: FREE_MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 256, temperature: 0 }),
      timeoutMs: 120000,
    });
    let json = null;
    try {
      json = JSON.parse(r.text);
    } catch (e) {
      /* non-json */
    }
    return { status: r.status, text: textOf(json), raw: r.text };
  };
  const a = await call('Reply with exactly one word: alpha');
  if (a.status !== 200 || !a.text) return { ok: false, why: `chat ${a.status} ${String(a.raw).replace(/\s+/g, ' ').slice(0, 90)}` };
  const b = await call('Reply with exactly one word: omega');
  if (b.status !== 200 || !b.text || b.text === a.text) return { ok: false, why: 'sanity check failed (empty or identical answers)' };
  return { ok: true, a: a.text.slice(0, 24), b: b.text.slice(0, 24) };
}

function readKeys() {
  try {
    return fs
      .readFileSync(OUT, 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('#'));
  } catch (e) {
    return [];
  }
}

async function verifyAll(px, quiet) {
  const keys = readKeys();
  if (!keys.length) {
    log('keys.txt is empty — mint first');
    return;
  }
  let live = 0;
  for (const key of keys) {
    const r = await gate(key, px).catch((e) => ({ ok: false, why: String(e.message || e) }));
    if (r.ok) live++;
    if (!quiet) log(`  ${r.ok ? '✔' : '✘'} ${key.slice(0, 16)}… ${r.ok ? 'live' : r.why}`);
  }
  log(`\n${live}/${keys.length} keys answered a live chat call`);
}

async function mintOne({ index, count, px, log: logFn, headless }) {
  const mail = await makeMailbox(px);
  const password = `Nm!${rand(12)}aQ9`;
  logFn(`[${index}/${count}] mailbox ${mail.address} (${mail.rail})`);
  const solver = require('./solver'); // real-Chrome half of the mint (Turnstile + dashboard)
  const out = await solver.mintInBrowser({
    email: mail.address,
    password,
    px,
    headless,
    log: logFn,
    waitLink: () => waitLink(mail, Math.max(30, parseInt(arg('mail-wait', '240'), 10) || 240) * 1000),
  });
  if (!out.ok) throw new Error(out.why);
  if (mail.rail === 'mailtrap' && mail.id) {
    try {
      await req(`${mail.api}/inbound/inboxes/${mail.id}`, {
        px: null,
        method: 'DELETE',
        headers: { authorization: `Bearer ${mail.token}`, accept: 'application/json' },
      });
    } catch (e) {
      /* a stuck inbox is swept by the provider later */
    }
  }
  return { key: out.key, email: mail.address };
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`numes-bulk-apikey — mint numes.ai API keys

  node src/cli.js --auto [--count N] [--pool proxies.txt] [--strict-proxy] [--headless]
  node src/cli.js --verify [--pool proxies.txt]
  node src/cli.js --dry

One account per key. Every key is written only after a live chat-200 (two prompts).

Options:
  --auto              run without questions (the launcher uses this)
  --count N           how many accounts/keys (default 10)
  --pool <file>       proxy list, one per line: http://host:port, socks5://user:pass@host:port
                      (pass --strict-proxy to fail instead of falling back to direct)
  --headless          run Chrome headless (Turnstile usually refuses; headed is the default)
  --mailtrap-token K  Mailtrap API token (or MAILTRAP_TOKEN, or mailtrap.txt)
  --verify            re-check every key in keys.txt with a live chat call
  --dry               print the plan and exit`);
    return;
  }
  const pxList = pool();
  const pxFor = (i) => (pxList ? pxList[i % pxList.length] : null);
  const headless = !!arg('headless', false);

  if (process.argv.includes('--verify')) {
    await verifyAll(pxList ? pxList[0] : null, false);
    return;
  }
  if (process.argv.includes('--dry')) {
    log(`model ${FREE_MODEL} · keys.txt ${readKeys().length} key(s) · pool ${pxList ? pxList.length + ' exit(s)' : 'direct'}`);
    return;
  }

  const count = Math.max(1, parseInt(arg('count', '10'), 10) || 10);
  const known = new Set(readKeys());
  log(`numes-bulk-apikey · ${count} account(s) · ${pxList ? pxList.length + ' proxy exit(s)' : 'direct'}${STRICT ? ' · strict proxy' : ''}`);
  let minted = 0;
  for (let i = 1; i <= count; i++) {
    const px = pxFor(i - 1);
    let res = null;
    for (let attempt = 1; attempt <= 2 && !res; attempt++) {
      try {
        res = await mintOne({ index: i, count, px, log, headless });
      } catch (e) {
        log(`   attempt ${attempt} failed: ${String(e.message || e).slice(0, 160)}`);
        if (attempt < 2) await sleep(4000);
      }
    }
    if (!res) {
      log(`[${i}/${count}] ✘ no key`);
      continue;
    }
    const g = await gate(res.key, px).catch((e) => ({ ok: false, why: String(e.message || e) }));
    if (!g.ok) {
      log(`[${i}/${count}] ✘ key not live (${g.why})`);
      try {
        fs.appendFileSync('keys-dead.txt', `${res.key} ${res.email}\n`);
      } catch (e) {
        /* the log line still tells the story */
      }
      continue;
    }
    if (!known.has(res.key)) {
      fs.appendFileSync(OUT, res.key + '\n');
      known.add(res.key);
    }
    fs.appendFileSync(
      'accounts.jsonl',
      JSON.stringify({ at: new Date().toISOString(), email: res.email, key_last4: res.key.slice(-4) }) + '\n',
    );
    minted++;
    log(`  ✔ ${res.key.slice(0, 14)}… saved to keys.txt (${minted}/${count})`);
    if (i < count) await sleep(3000 + Math.random() * 4000);
  }
  log(`\ndone — ${minted}/${count} key(s) written to ${OUT}`);
}

main().catch((e) => {
  console.error(`\n  ! ${e && e.message ? e.message : e}`);
  process.exit(1);
});
